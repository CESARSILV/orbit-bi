// Reconciliação proporcional dos ajustes manuais de KPI.
//
// Objetivo: quando o usuário confere um total (ex.: Agendamentos = 30), esse valor
// passa a ser tratado como verdade consolidada em TODA a base derivada do recorte —
// gráficos, tabelas por mês e por campanha, relatórios e exportações — e não apenas
// no total exibido no card.
//
// Os fatos importados nunca são mutados. O motor trabalha sobre cópias e aceita:
// - o mapa legado de ajustes exatos (métrica -> registro);
// - um plano hierárquico com múltiplas regras em seus escopos nativos.

import {
  FUNDAMENTAL_KPI_KEYS,
  rowMatchesKpiOverrideScope,
  scopeContains,
} from "./kpi-overrides.js";

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
// a origem operacional, então usamos a própria métrica como evidência de origem.
// Quando nenhuma linha do recorte tem a métrica (base zero global), aceitamos qualquer
// linha `is_crm` para permitir a distribuição igual.
function isEligibleRow(row, metric, { hasAnyBase }) {
  if (CRM_ONLY_METRICS.has(metric)) {
    if (!row.is_crm) return false;
    if (!hasAnyBase) return true;
    const column = METRIC_TO_COLUMN[metric];
    return toFiniteNumber(row[column]) > 0;
  }
  return !row.is_crm;
}

function getMetricDomainRows(rows, metric) {
  return CRM_ONLY_METRICS.has(metric)
    ? rows.filter((row) => row.is_crm)
    : rows.filter((row) => !row.is_crm);
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
 * - Se a soma atual é 0, distribui igualmente entre as linhas elegíveis.
 * - Para contagens, usa maior resto para a soma fechar exatamente no alvo inteiro.
 */
function distributeMetric(rows, column, target, { integer }) {
  if (rows.length === 0) return;

  const currentValues = rows.map((row) => toFiniteNumber(row[column]));
  const currentSum = currentValues.reduce((sum, value) => sum + value, 0);
  const rawShares = currentSum > 0
    ? currentValues.map((value) => (value / currentSum) * target)
    : rows.map(() => target / rows.length);

  if (!integer) {
    rows.forEach((row, index) => {
      row[column] = rawShares[index];
    });
    return;
  }

  const roundedTarget = Math.round(target);
  const floors = rawShares.map((value) => Math.floor(value));
  const floorSum = floors.reduce((sum, value) => sum + value, 0);
  let remaining = roundedTarget - floorSum;

  const remainders = rawShares
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((first, second) => second.remainder - first.remainder);

  rows.forEach((row, index) => {
    row[column] = floors[index];
  });

  let cursor = 0;
  while (remaining > 0 && remainders.length > 0) {
    const slot = remainders[cursor % remainders.length];
    rows[slot.index][column] += 1;
    remaining -= 1;
    cursor += 1;
  }
}

function unique(values) {
  return [...new Set(values)];
}

function compareRulesSpecificToBroad(first, second) {
  const firstContainsSecond = scopeContains(first.scope, second.scope);
  const secondContainsFirst = scopeContains(second.scope, first.scope);
  if (firstContainsSecond && !secondContainsFirst) return 1;
  if (secondContainsFirst && !firstContainsSecond) return -1;
  return (second.specificity || 0) - (first.specificity || 0);
}

function getImmediateChildren(parentRule, metricRules) {
  const descendants = metricRules.filter((candidate) => (
    candidate.id !== parentRule.id
    && scopeContains(parentRule.scope, candidate.scope)
  ));

  return descendants.filter((candidate) => !descendants.some((possibleParent) => (
    possibleParent.id !== candidate.id
    && scopeContains(possibleParent.scope, candidate.scope)
  )));
}

function sumColumn(rows, column) {
  return rows.reduce((sum, row) => sum + toFiniteNumber(row[column]), 0);
}

function reconcileLegacyRows(rows, overrides) {
  const fundamentalOverrides = FUNDAMENTAL_KPI_KEYS.filter((metric) => Boolean(overrides?.[metric]));
  if (fundamentalOverrides.length === 0) {
    return {
      rows,
      appliedMetrics: [],
      appliedRuleIds: [],
      zeroBaseMetrics: [],
      unallocatedMetrics: [],
      unallocatedRuleIds: [],
      conflicts: [],
      hasReconciliation: false,
    };
  }

  const appliedMetrics = [];
  const zeroBaseMetrics = [];
  const unallocatedMetrics = [];
  const appliedRuleIds = [];
  const unallocatedRuleIds = [];

  fundamentalOverrides.forEach((metric) => {
    const column = METRIC_TO_COLUMN[metric];
    if (!column) return;

    const record = overrides[metric];
    const target = toFiniteNumber(record.value);
    const candidateRows = getMetricDomainRows(rows, metric);
    const hasAnyBase = candidateRows.some((row) => toFiniteNumber(row[column]) > 0);
    const eligibleRows = rows.filter((row) => isEligibleRow(row, metric, { hasAnyBase }));

    if (eligibleRows.length === 0) {
      unallocatedMetrics.push(metric);
      if (record.id) unallocatedRuleIds.push(record.id);
      return;
    }

    if (!hasAnyBase) zeroBaseMetrics.push(metric);
    distributeMetric(eligibleRows, column, target, { integer: INTEGER_METRICS.has(metric) });
    appliedMetrics.push(metric);
    if (record.id) appliedRuleIds.push(record.id);
  });

  rows.forEach((row) => recalcRowRatios(row));
  return {
    rows,
    appliedMetrics: unique(appliedMetrics),
    appliedRuleIds: unique(appliedRuleIds),
    zeroBaseMetrics: unique(zeroBaseMetrics),
    unallocatedMetrics: unique(unallocatedMetrics),
    unallocatedRuleIds: unique(unallocatedRuleIds),
    conflicts: [],
    hasReconciliation: appliedMetrics.length > 0,
  };
}

/**
 * Reconcilia linhas com ajustes fundamentais. Em um plano hierárquico:
 *
 * 1. regras mais específicas são aplicadas primeiro em seu escopo nativo;
 * 2. uma regra pai não toca nas partições cobertas por filhas;
 * 3. o alvo residual do pai é seu total menos o subtotal efetivo das filhas;
 * 4. conflitos não hierárquicos são mantidos fora da projeção e devolvidos à UI.
 */
export function reconcileSummaryRows(sourceRows, overrideInput = {}) {
  const rows = (sourceRows || []).map((row) => ({ ...row }));
  const isHierarchicalPlan = Array.isArray(overrideInput?.rules);
  if (!isHierarchicalPlan) return reconcileLegacyRows(rows, overrideInput || {});

  const planConflicts = overrideInput.conflicts || [];
  const rowIndexByReference = new Map(rows.map((row, index) => [row, index]));
  const activeRules = (overrideInput.fundamentalRules || overrideInput.rules.filter(
    (rule) => FUNDAMENTAL_KPI_KEYS.includes(rule.metric)
  )).filter((rule) => !rule.isBlockedByConflict);

  if (activeRules.length === 0) {
    return {
      rows,
      appliedMetrics: [],
      appliedRuleIds: [],
      zeroBaseMetrics: [],
      unallocatedMetrics: [],
      unallocatedRuleIds: [],
      conflicts: planConflicts,
      blockedRuleIds: unique(overrideInput.blockedRuleIds || []),
      appliedRuleRowIndexes: {},
      hasReconciliation: false,
    };
  }

  const appliedMetrics = [];
  const appliedRuleIds = [];
  const zeroBaseMetrics = [];
  const unallocatedMetrics = [];
  const unallocatedRuleIds = [];
  const hierarchyConflicts = [];
  const runtimeBlockedRuleIds = [];
  const appliedRuleRowIndexes = {};

  const rulesByMetric = activeRules.reduce((result, rule) => {
    if (!result[rule.metric]) result[rule.metric] = [];
    result[rule.metric].push(rule);
    return result;
  }, {});

  Object.entries(rulesByMetric).forEach(([metric, unsortedRules]) => {
    const column = METRIC_TO_COLUMN[metric];
    if (!column) return;
    const metricRules = [...unsortedRules].sort(compareRulesSpecificToBroad);

    metricRules.forEach((rule) => {
      const nativeRows = rows.filter((row) => rowMatchesKpiOverrideScope(row, rule.scope));
      const immediateChildren = getImmediateChildren(rule, metricRules);
      const childSubtotal = immediateChildren.reduce((sum, child) => {
        const childRows = rows.filter((row) => rowMatchesKpiOverrideScope(row, child.scope));
        return sum + sumColumn(getMetricDomainRows(childRows, metric), column);
      }, 0);

      const requestedResidual = toFiniteNumber(rule.value) - childSubtotal;
      if (requestedResidual < 0) {
        hierarchyConflicts.push({
          type: "parent_target_below_children",
          metric,
          ruleIds: [rule.id, ...immediateChildren.map((child) => child.id)],
          message: `O ajuste mais amplo de ${metric} é menor que a soma dos ajustes específicos. O ajuste amplo foi bloqueado e os recortes específicos foram preservados.`,
        });
        runtimeBlockedRuleIds.push(rule.id);
        return;
      }
      const residualTarget = requestedResidual;

      const residualRows = nativeRows.filter((row) => !immediateChildren.some(
        (child) => rowMatchesKpiOverrideScope(row, child.scope)
      ));
      const candidateRows = getMetricDomainRows(residualRows, metric);
      const hasAnyBase = candidateRows.some((row) => toFiniteNumber(row[column]) > 0);
      const eligibleRows = residualRows.filter((row) => isEligibleRow(row, metric, { hasAnyBase }));

      if (eligibleRows.length === 0) {
        // Alvo residual zero sem linhas já está satisfeito e não precisa ser sinalizado.
        if (residualTarget === 0) {
          appliedMetrics.push(metric);
          appliedRuleIds.push(rule.id);
          appliedRuleRowIndexes[rule.id] = [];
          return;
        }
        unallocatedMetrics.push(metric);
        unallocatedRuleIds.push(rule.id);
        return;
      }

      if (!hasAnyBase) zeroBaseMetrics.push(metric);
      distributeMetric(eligibleRows, column, residualTarget, { integer: INTEGER_METRICS.has(metric) });
      appliedMetrics.push(metric);
      appliedRuleIds.push(rule.id);
      appliedRuleRowIndexes[rule.id] = eligibleRows
        .map((row) => rowIndexByReference.get(row))
        .filter((index) => Number.isInteger(index));
    });
  });

  if (appliedMetrics.length > 0) rows.forEach((row) => recalcRowRatios(row));

  return {
    rows,
    appliedMetrics: unique(appliedMetrics),
    appliedRuleIds: unique(appliedRuleIds),
    zeroBaseMetrics: unique(zeroBaseMetrics),
    unallocatedMetrics: unique(unallocatedMetrics),
    unallocatedRuleIds: unique(unallocatedRuleIds),
    conflicts: [...planConflicts, ...hierarchyConflicts],
    blockedRuleIds: unique([...(overrideInput.blockedRuleIds || []), ...runtimeBlockedRuleIds]),
    appliedRuleRowIndexes,
    hasReconciliation: appliedMetrics.length > 0,
  };
}

export const RECONCILIATION_INTERNALS = Object.freeze({
  METRIC_TO_COLUMN,
  CRM_ONLY_METRICS,
  INTEGER_METRICS,
  distributeMetric,
  recalcRowRatios,
  getImmediateChildren,
});
