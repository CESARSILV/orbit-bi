// Reconciliação proporcional dos ajustes manuais de KPI.
//
// Objetivo: quando o usuário confere um total (ex.: Agendamentos = 30), esse valor
// passa a ser tratado como verdade consolidada em TODA a base derivada do recorte —
// gráficos, tabelas por mês e por campanha, relatórios e exportações — e não apenas
// no total exibido no card.
//
// Estratégia: sobre uma CÓPIA das linhas de fact_marketing_summary já filtradas pelo
// recorte, cada métrica fundamental ajustada é redistribuída proporcionalmente entre
// as linhas que já possuem aquela métrica. As razões (CTR, CPC, CPM, CPL, CPA) são
// recalculadas por linha após a redistribuição. Os fatos importados nunca são mutados.

import { FUNDAMENTAL_KPI_KEYS } from "./kpi-overrides";

// KPI fundamental -> coluna correspondente em fact_marketing_summary.
const METRIC_TO_COLUMN = Object.freeze({
  investimento: "spend",
  cliques: "clicks",
  impressoes: "impressions",
  leads: "leads",
  qualificados: "crm_leads",
  conversoes: "conversions",
  demos: "crm_demos",
  alcance: "reach",
});

// Métricas que só existem em linhas de CRM (is_crm === true).
const CRM_ONLY_METRICS = new Set(["qualificados", "conversoes", "demos"]);

// Métricas tratadas como contagem inteira (usam distribuição por maior resto).
const INTEGER_METRICS = new Set(["cliques", "impressoes", "leads", "qualificados", "conversoes", "demos", "alcance"]);

function toFiniteNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

// Elegibilidade de uma linha para receber a redistribuição de uma métrica.
//
// A linha de resumo de CRM guarda em `platform` o canal ATRIBUÍDO (google/meta) e não
// a origem operacional, então não dá para casar por plataforma. Usamos a própria
// métrica-irmã como evidência de origem: uma linha é a origem natural de `conversoes`
// quando já tem agendamentos, de `demos` quando já tem demos e de `qualificados`
// quando já tem qualificados. Quando NENHUMA linha do recorte tem a métrica (base zero
// global), aceitamos qualquer linha `is_crm` para permitir a distribuição igual.
function isEligibleRow(row, metric, { hasAnyBase }) {
  if (CRM_ONLY_METRICS.has(metric)) {
    if (!row.is_crm) return false;
    if (!hasAnyBase) return true; // base zero global: distribui entre todas as CRM
    const column = METRIC_TO_COLUMN[metric];
    return toFiniteNumber(row[column]) > 0;
  }
  // investimento/cliques/impressões/leads/alcance vêm de mídia; linhas CRM têm esses
  // campos zerados, então incluí-las é inofensivo, mas evitamos poluir a base.
  return !row.is_crm;
}

function recalcRowRatios(row) {
  const spend = toFiniteNumber(row.spend);
  const clicks = toFiniteNumber(row.clicks);
  const impressions = toFiniteNumber(row.impressions);
  const leads = toFiniteNumber(row.leads);
  const conversions = toFiniteNumber(row.conversions);
  const revenue = toFiniteNumber(row.revenue);

  row.ctr = impressions > 0 ? clicks / impressions : 0;
  row.cpc = clicks > 0 ? spend / clicks : 0;
  row.cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  row.cpl = leads > 0 ? spend / leads : 0;
  row.cac = conversions > 0 ? spend / conversions : 0;
  row.roas = spend > 0 ? revenue / spend : 0;
  return row;
}

/**
 * Distribui `target` entre `rows` na coluna `column`.
 * - Se a soma atual > 0, distribui proporcionalmente ao peso existente.
 * - Se a soma atual é 0 (base zero), distribui igualmente entre as linhas elegíveis.
 * - Para métricas de contagem, usa o método do maior resto para que a soma inteira
 *   das linhas seja exatamente `target` arredondado.
 */
function distributeMetric(rows, column, target, { integer }) {
  if (rows.length === 0) return;

  const currentValues = rows.map((row) => toFiniteNumber(row[column]));
  const currentSum = currentValues.reduce((sum, value) => sum + value, 0);

  let rawShares;
  if (currentSum > 0) {
    rawShares = currentValues.map((value) => (value / currentSum) * target);
  } else {
    // Base zero: distribui igualmente para o total fechar sem inventar campanha.
    rawShares = rows.map(() => target / rows.length);
  }

  if (!integer) {
    rows.forEach((row, index) => {
      row[column] = rawShares[index];
    });
    return;
  }

  // Método do maior resto: garante que a soma dos inteiros seja exatamente o alvo.
  const roundedTarget = Math.round(target);
  const floors = rawShares.map((value) => Math.floor(value));
  const floorSum = floors.reduce((sum, value) => sum + value, 0);
  let remaining = roundedTarget - floorSum;

  const remainders = rawShares
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);

  rows.forEach((row, index) => {
    row[column] = floors[index];
  });

  // Distribui as unidades restantes para as maiores frações.
  let cursor = 0;
  while (remaining > 0 && remainders.length > 0) {
    const slot = remainders[cursor % remainders.length];
    rows[slot.index][column] += 1;
    remaining -= 1;
    cursor += 1;
  }
}

/**
 * Reconcilia as linhas do recorte com os ajustes manuais fundamentais.
 *
 * @param {Array<object>} filteredRows - linhas de fact_marketing_summary já filtradas
 *   pelo mesmo recorte que compõe os KPIs (matchesCoreFilters).
 * @param {object} scopedOverrides - mapa metric -> registro de override do recorte.
 * @returns {{ rows: Array<object>, appliedMetrics: string[], zeroBaseMetrics: string[], hasReconciliation: boolean }}
 */
export function reconcileSummaryRows(filteredRows, scopedOverrides = {}) {
  const overrides = scopedOverrides || {};
  const fundamentalOverrides = FUNDAMENTAL_KPI_KEYS.filter((metric) => Boolean(overrides[metric]));

  // Sempre devolve cópias para nunca mutar marketingDb.
  const rows = (filteredRows || []).map((row) => ({ ...row }));

  if (fundamentalOverrides.length === 0) {
    return { rows, appliedMetrics: [], zeroBaseMetrics: [], hasReconciliation: false };
  }

  const appliedMetrics = [];
  const zeroBaseMetrics = [];
  // Métricas ajustadas que não puderam ser distribuídas por falta de linha elegível
  // no recorte (ex.: ajustar Demos sem nenhuma linha DOitSA). O total efetivo ainda
  // reflete o valor, mas a soma das linhas não — a UI precisa sinalizar.
  const unallocatedMetrics = [];

  fundamentalOverrides.forEach((metric) => {
    const column = METRIC_TO_COLUMN[metric];
    if (!column) return;

    const target = toFiniteNumber(overrides[metric].value);

    // Verifica se alguma linha do recorte já tem a métrica (define base zero global).
    const candidateRows = CRM_ONLY_METRICS.has(metric)
      ? rows.filter((row) => row.is_crm)
      : rows.filter((row) => !row.is_crm);
    const hasAnyBase = candidateRows.some((row) => toFiniteNumber(row[column]) > 0);

    const eligibleRows = rows.filter((row) => isEligibleRow(row, metric, { hasAnyBase }));

    if (eligibleRows.length === 0) {
      unallocatedMetrics.push(metric);
      return;
    }

    if (!hasAnyBase) zeroBaseMetrics.push(metric);

    distributeMetric(eligibleRows, column, target, { integer: INTEGER_METRICS.has(metric) });
    appliedMetrics.push(metric);
  });

  // Recalcula as razões por linha somente onde uma fundamental relevante mudou.
  rows.forEach((row) => recalcRowRatios(row));

  return {
    rows,
    appliedMetrics,
    zeroBaseMetrics,
    unallocatedMetrics,
    hasReconciliation: appliedMetrics.length > 0,
  };
}

export const RECONCILIATION_INTERNALS = Object.freeze({
  METRIC_TO_COLUMN,
  CRM_ONLY_METRICS,
  INTEGER_METRICS,
  distributeMetric,
  recalcRowRatios,
});
