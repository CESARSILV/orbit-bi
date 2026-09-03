// Camada lateral de ajustes manuais para KPIs consolidados.
// Os fatos importados permanecem imutáveis; somente o total efetivo do recorte é alterado.

export const KPI_OVERRIDE_DEFINITIONS = Object.freeze({
  investimento: { label: "Investimento Total", kind: "fundamental", input: "currency" },
  cliques: { label: "Cliques Totais", kind: "fundamental", input: "count" },
  impressoes: { label: "Impressões Totais", kind: "fundamental", input: "count" },
  leads: { label: "Leads", kind: "fundamental", input: "count" },
  qualificados: { label: "Leads Qualificados", kind: "fundamental", input: "count" },
  conversoes: { label: "Agendamentos", kind: "fundamental", input: "count" },
  demos: { label: "Demos Realizadas", kind: "fundamental", input: "count" },
  alcance: { label: "Alcance", kind: "fundamental", input: "count" },
  ctr: { label: "CTR Médio", kind: "derived", input: "percentage" },
  cpc: { label: "CPC Médio", kind: "derived", input: "currency" },
  cpm: { label: "CPM Médio", kind: "derived", input: "currency" },
  cpl: { label: "CPL Médio", kind: "derived", input: "currency" },
  cpa: { label: "CPA Médio", kind: "derived", input: "currency" },
});

export const KPI_OVERRIDE_KEYS = Object.freeze(Object.keys(KPI_OVERRIDE_DEFINITIONS));
export const FUNDAMENTAL_KPI_KEYS = Object.freeze(
  KPI_OVERRIDE_KEYS.filter((key) => KPI_OVERRIDE_DEFINITIONS[key].kind === "fundamental")
);
export const DERIVED_KPI_KEYS = Object.freeze(
  KPI_OVERRIDE_KEYS.filter((key) => KPI_OVERRIDE_DEFINITIONS[key].kind === "derived")
);

const SCOPE_FIELDS = ["platform", "period", "startDate", "endDate", "campaign"];

function normalizeText(value, fallback) {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function isFullCalendarMonthRange(startDate, endDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return false;
  }

  if (startDate.slice(0, 7) !== endDate.slice(0, 7) || !startDate.endsWith("-01")) {
    return false;
  }

  const [year, month] = startDate.slice(0, 7).split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return endDate === `${startDate.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
}

function normalizeMetric(metric) {
  return metric === "cac" ? "cpa" : String(metric || "").trim();
}

function toFiniteNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getBaseMetricValue(totals, metric) {
  if (metric === "cpa") return toFiniteNumber(totals.cpa ?? totals.cac);
  return toFiniteNumber(totals[metric]);
}

function calculateDerivedTotals(values) {
  const investimento = toFiniteNumber(values.investimento);
  const receita = toFiniteNumber(values.receita);
  const cliques = toFiniteNumber(values.cliques);
  const impressoes = toFiniteNumber(values.impressoes);
  const leads = toFiniteNumber(values.leads);
  const conversoes = toFiniteNumber(values.conversoes);
  const lucro = receita - investimento;
  const cpa = conversoes > 0 ? investimento / conversoes : 0;

  return {
    ...values,
    investimento,
    receita,
    cliques,
    impressoes,
    leads,
    conversoes,
    qualificados: toFiniteNumber(values.qualificados),
    demos: toFiniteNumber(values.demos),
    alcance: toFiniteNumber(values.alcance),
    ctr: impressoes > 0 ? cliques / impressoes : 0,
    cpc: cliques > 0 ? investimento / cliques : 0,
    cpm: impressoes > 0 ? (investimento / impressoes) * 1000 : 0,
    cpl: leads > 0 ? investimento / leads : 0,
    cpa,
    cac: cpa,
    lucro,
    roi: investimento > 0 ? (lucro / investimento) * 100 : 0,
    ticket: conversoes > 0 ? receita / conversoes : 0,
    roas: investimento > 0 ? receita / investimento : 0,
  };
}

export function parseKpiOverrideNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;

  const raw = String(value ?? "").trim();
  if (!raw) return Number.NaN;

  const cleaned = raw.replace(/[^\d,.-]/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;

  if (lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    normalized = cleaned.replace(/,/g, "");
  } else if (lastComma >= 0) {
    normalized = cleaned.replace(",", ".");
  } else {
    const dots = cleaned.match(/\./g) || [];
    // Em PT-BR, "1.234" representa mil duzentos e trinta e quatro;
    // decimais são normalmente escritos com vírgula (ex.: "1,234").
    if (dots.length > 1 || /^-?\d{1,3}\.\d{3}$/.test(cleaned)) {
      normalized = cleaned.replace(/\./g, "");
    }
  }

  return Number(normalized);
}

export function getKpiOverrideLabel(metric) {
  const definition = KPI_OVERRIDE_DEFINITIONS[normalizeMetric(metric)];
  return definition?.label || "KPI";
}

export function validateKpiOverrideValue(metric, value) {
  const normalizedMetric = normalizeMetric(metric);
  const definition = KPI_OVERRIDE_DEFINITIONS[normalizedMetric];
  if (!definition) {
    return { valid: false, error: "Este indicador não pode receber ajuste manual." };
  }

  const numericValue = parseKpiOverrideNumber(value);
  if (!Number.isFinite(numericValue)) {
    return { valid: false, error: "Informe um número válido." };
  }
  if (numericValue < 0) {
    return { valid: false, error: "O valor não pode ser negativo." };
  }
  if (definition.input === "count" && !Number.isInteger(numericValue)) {
    return { valid: false, error: "Este indicador deve ser informado como número inteiro." };
  }

  return { valid: true, value: numericValue, metric: normalizedMetric };
}

/**
 * Gera uma chave estável para os filtros que realmente determinam o total dos KPIs.
 * Um mês inteiro selecionado por data ou pelo seletor de período compartilha a mesma chave.
 */
export function createKpiOverrideScope(filters = {}) {
  let period = normalizeText(filters.period, "todos");
  let startDate = normalizeText(filters.startDate, "");
  let endDate = normalizeText(filters.endDate, "");

  if (/^\d{4}-\d{2}$/.test(period)) {
    startDate = "";
    endDate = "";
  } else if (period === "todos" && isFullCalendarMonthRange(startDate, endDate)) {
    period = startDate.slice(0, 7);
    startDate = "";
    endDate = "";
  }

  const scope = {
    platform: normalizeText(filters.platform, "todas"),
    period,
    startDate,
    endDate,
    campaign: normalizeText(filters.campaign, "todas"),
  };

  return { ...scope, key: JSON.stringify(scope) };
}

function getTemporalBounds(scope) {
  if (/^\d{4}-\d{2}$/.test(scope.period)) {
    const [year, month] = scope.period.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return {
      start: `${scope.period}-01`,
      end: `${scope.period}-${String(lastDay).padStart(2, "0")}`,
    };
  }

  return {
    start: scope.startDate || null,
    end: scope.endDate || null,
  };
}

function dimensionContains(parentValue, childValue, wildcard) {
  return parentValue === wildcard || parentValue === childValue;
}

function temporalScopeContains(parentScope, childScope) {
  const parent = getTemporalBounds(parentScope);
  const child = getTemporalBounds(childScope);

  if (parent.start && (!child.start || child.start < parent.start)) return false;
  if (parent.end && (!child.end || child.end > parent.end)) return false;
  return true;
}

function temporalScopesOverlap(firstScope, secondScope) {
  const first = getTemporalBounds(firstScope);
  const second = getTemporalBounds(secondScope);
  if (first.end && second.start && first.end < second.start) return false;
  if (second.end && first.start && second.end < first.start) return false;
  return true;
}

function platformScopesOverlap(firstPlatform, secondPlatform) {
  if (firstPlatform === "todas" || secondPlatform === "todas" || firstPlatform === secondPlatform) {
    return true;
  }

  const attributedPlatforms = new Set(["google", "meta"]);
  const crmViews = new Set(["bitrix", "doitsa"]);
  if (attributedPlatforms.has(firstPlatform) && attributedPlatforms.has(secondPlatform)) return false;

  // Linhas de CRM mantêm a plataforma atribuída (Google/Meta), portanto uma visão
  // operacional de CRM pode intersectar uma visão por canal de atribuição.
  return (
    (attributedPlatforms.has(firstPlatform) && crmViews.has(secondPlatform))
    || (crmViews.has(firstPlatform) && attributedPlatforms.has(secondPlatform))
    || (crmViews.has(firstPlatform) && crmViews.has(secondPlatform))
  );
}

function parseStoredScope(item) {
  if (item?.scope && typeof item.scope === "object") {
    return createKpiOverrideScope(item.scope);
  }

  try {
    const parsed = JSON.parse(item?.scopeKey || "");
    return createKpiOverrideScope(parsed);
  } catch {
    return null;
  }
}

function getRuleSpecificity(scope) {
  const temporal = getTemporalBounds(scope);
  return (
    (scope.platform !== "todas" ? 2 : 0)
    + (scope.campaign !== "todas" ? 2 : 0)
    + (temporal.start ? 1 : 0)
    + (temporal.end ? 1 : 0)
  );
}

function compareRulesBroadToSpecific(first, second) {
  const firstContainsSecond = scopeContains(first.scope, second.scope);
  const secondContainsFirst = scopeContains(second.scope, first.scope);
  if (firstContainsSecond && !secondContainsFirst) return -1;
  if (secondContainsFirst && !firstContainsSecond) return 1;

  if (first.specificity !== second.specificity) {
    return first.specificity - second.specificity;
  }

  const firstUpdatedAt = Date.parse(first.updatedAt || "") || 0;
  const secondUpdatedAt = Date.parse(second.updatedAt || "") || 0;
  return firstUpdatedAt - secondUpdatedAt;
}

/**
 * Retorna verdadeiro quando todo o conjunto de `childScope` está contido em
 * `parentScope`. A relação é usada para herdar ajustes feitos em meses,
 * plataformas ou campanhas específicas ao abrir uma visão mais ampla.
 */
export function scopeContains(parentScope, childScope) {
  const parent = createKpiOverrideScope(parentScope);
  const child = createKpiOverrideScope(childScope);

  return (
    dimensionContains(parent.platform, child.platform, "todas")
    && dimensionContains(parent.campaign, child.campaign, "todas")
    && temporalScopeContains(parent, child)
  );
}

/** Verifica se dois escopos podem selecionar ao menos uma mesma linha. */
export function kpiOverrideScopesOverlap(firstScope, secondScope) {
  const first = createKpiOverrideScope(firstScope);
  const second = createKpiOverrideScope(secondScope);
  const campaignsOverlap = (
    first.campaign === "todas"
    || second.campaign === "todas"
    || first.campaign === second.campaign
  );

  return (
    campaignsOverlap
    && platformScopesOverlap(first.platform, second.platform)
    && temporalScopesOverlap(first, second)
  );
}

/** Aplica a semântica dos filtros de KPI a uma linha do resumo consolidado. */
export function rowMatchesKpiOverrideScope(row, scope) {
  const normalizedScope = createKpiOverrideScope(scope);

  if (normalizedScope.platform === "bitrix") {
    if (!row.is_crm || toFiniteNumber(row.crm_leads) === 0) return false;
  } else if (normalizedScope.platform === "doitsa") {
    if (!row.is_crm || (toFiniteNumber(row.conversions) === 0 && toFiniteNumber(row.crm_demos) === 0)) {
      return false;
    }
  } else if (normalizedScope.platform !== "todas" && row.platform !== normalizedScope.platform) {
    return false;
  }

  if (normalizedScope.campaign !== "todas" && row.campaign_name !== normalizedScope.campaign) {
    return false;
  }

  if (/^\d{4}-\d{2}$/.test(normalizedScope.period) && row.reference_month) {
    return row.reference_month === normalizedScope.period;
  }

  const bounds = getTemporalBounds(normalizedScope);
  if (!bounds.start && !bounds.end) return true;

  const rawStart = row.date || (row.reference_month ? `${row.reference_month}-01` : "");
  if (!rawStart) return true;
  const rowStart = /^\d{4}-\d{2}$/.test(rawStart) ? `${rawStart}-01` : String(rawStart).slice(0, 10);
  const rawEnd = row.report_end_date || rowStart;
  const rowEnd = /^\d{4}-\d{2}$/.test(rawEnd) ? `${rawEnd}-01` : String(rawEnd).slice(0, 10);

  if (bounds.start && rowEnd < bounds.start) return false;
  if (bounds.end && rowStart > bounds.end) return false;
  return true;
}

/**
 * Resolve todas as regras nativas inteiramente contidas na visão atual.
 *
 * Regras idênticas são deduplicadas pelo `updatedAt` mais recente. A detecção de
 * conflito ocorre ANTES do filtro da visão, garantindo bloqueio fail-closed: uma
 * sobreposição ambígua não volta a valer apenas porque uma das regras ficou fora
 * da tela atual.
 */
export function resolveKpiOverridePlan(overrides, viewScope) {
  const normalizedView = createKpiOverrideScope(viewScope);
  const latestByScopeAndMetric = new Map();

  (overrides || []).forEach((item) => {
    if (!item) return;
    const validation = validateKpiOverrideValue(item.metric, item.value);
    const scope = parseStoredScope(item);
    if (!validation.valid || !scope) return;

    const ruleId = `${scope.key}:${validation.metric}`;
    const previous = latestByScopeAndMetric.get(ruleId);
    const previousUpdatedAt = Date.parse(previous?.updatedAt || "") || 0;
    const itemUpdatedAt = Date.parse(item.updatedAt || "") || 0;
    if (previous && itemUpdatedAt < previousUpdatedAt) return;

    latestByScopeAndMetric.set(ruleId, {
      ...item,
      id: ruleId,
      scope,
      scopeKey: scope.key,
      metric: validation.metric,
      value: validation.value,
      isExact: scope.key === normalizedView.key,
      specificity: getRuleSpecificity(scope),
    });
  });

  const canonicalRules = [...latestByScopeAndMetric.values()].sort(compareRulesBroadToSpecific);
  const allConflicts = [];
  const blockedRuleIds = new Set();
  const canonicalRulesByMetric = canonicalRules.reduce((result, rule) => {
    if (!result[rule.metric]) result[rule.metric] = [];
    result[rule.metric].push(rule);
    return result;
  }, {});

  Object.entries(canonicalRulesByMetric).forEach(([metric, metricRules]) => {
    for (let firstIndex = 0; firstIndex < metricRules.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < metricRules.length; secondIndex += 1) {
        const first = metricRules[firstIndex];
        const second = metricRules[secondIndex];
        const firstContainsSecond = scopeContains(first.scope, second.scope);
        const secondContainsFirst = scopeContains(second.scope, first.scope);
        if (firstContainsSecond || secondContainsFirst) continue;
        if (!kpiOverrideScopesOverlap(first.scope, second.scope)) continue;

        blockedRuleIds.add(first.id);
        blockedRuleIds.add(second.id);
        allConflicts.push({
          type: "non_hierarchical_overlap",
          metric,
          ruleIds: [first.id, second.id],
          message: `Há ajustes sobrepostos de ${getKpiOverrideLabel(metric)} em recortes que não formam uma hierarquia. Abra um dos recortes e remova ou refine o ajuste para consolidar com segurança.`,
        });
      }
    }
  });

  const rules = canonicalRules.filter((rule) => scopeContains(normalizedView, rule.scope));
  const auditRules = canonicalRules.filter((rule) => (
    kpiOverrideScopesOverlap(normalizedView, rule.scope)
  ));
  const visibleRuleIds = new Set(auditRules.map((rule) => rule.id));
  const conflicts = allConflicts.filter((conflict) => (
    conflict.ruleIds.some((ruleId) => visibleRuleIds.has(ruleId))
  ));
  const annotateRule = (rule) => ({
    ...rule,
    isBlockedByConflict: blockedRuleIds.has(rule.id),
  });
  const annotatedRules = rules.map(annotateRule);
  const annotatedAuditRules = auditRules.map(annotateRule);

  return {
    viewScope: normalizedView,
    rules: annotatedRules,
    auditRules: annotatedAuditRules,
    fundamentalRules: annotatedRules.filter((rule) => FUNDAMENTAL_KPI_KEYS.includes(rule.metric)),
    derivedRules: annotatedRules.filter((rule) => DERIVED_KPI_KEYS.includes(rule.metric)),
    exactOverrides: getScopedKpiOverrides(overrides, normalizedView),
    conflicts,
    blockedRuleIds: [...blockedRuleIds],
    hasInheritedOverrides: annotatedAuditRules.some((rule) => !rule.isExact),
  };
}

export function createKpiOverrideRecord({ scope, metric, value, reason = "" }) {
  const normalizedScope = createKpiOverrideScope(scope);
  const validation = validateKpiOverrideValue(metric, value);
  if (!validation.valid) throw new Error(validation.error);

  const now = new Date().toISOString();
  const normalizedReason = String(reason || "").trim().slice(0, 400);
  const storedScope = SCOPE_FIELDS.reduce((result, field) => {
    result[field] = normalizedScope[field];
    return result;
  }, {});

  return {
    id: `${normalizedScope.key}:${validation.metric}`,
    scope: storedScope,
    scopeKey: normalizedScope.key,
    metric: validation.metric,
    value: validation.value,
    reason: normalizedReason,
    createdAt: now,
    updatedAt: now,
  };
}

export function upsertKpiOverride(overrides, record) {
  const normalizedMetric = normalizeMetric(record.metric);
  const existing = (overrides || []).find((item) => (
    item?.scopeKey === record.scopeKey && normalizeMetric(item.metric) === normalizedMetric
  ));
  const nextRecord = {
    ...record,
    id: `${record.scopeKey}:${normalizedMetric}`,
    metric: normalizedMetric,
    createdAt: existing?.createdAt || record.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return [
    ...(overrides || []).filter((item) => !(
      item?.scopeKey === record.scopeKey && normalizeMetric(item.metric) === normalizedMetric
    )),
    nextRecord,
  ];
}

export function removeKpiOverride(overrides, scopeKey, metric) {
  const normalizedMetric = normalizeMetric(metric);
  return (overrides || []).filter((item) => !(
    item?.scopeKey === scopeKey && normalizeMetric(item.metric) === normalizedMetric
  ));
}

export function getScopedKpiOverrides(overrides, scope) {
  const normalizedScope = createKpiOverrideScope(scope);
  const map = {};

  (overrides || []).forEach((item) => {
    if (!item || item.scopeKey !== normalizedScope.key) return;

    const validation = validateKpiOverrideValue(item.metric, item.value);
    if (!validation.valid) return;

    const previous = map[validation.metric];
    const previousUpdatedAt = Date.parse(previous?.updatedAt || "") || 0;
    const itemUpdatedAt = Date.parse(item.updatedAt || "") || 0;
    if (!previous || itemUpdatedAt >= previousUpdatedAt) {
      map[validation.metric] = {
        ...item,
        metric: validation.metric,
        value: validation.value,
      };
    }
  });

  return map;
}

/**
 * Aplica os ajustes a uma cópia dos totais. Primeiro substitui métricas fundamentais,
 * depois recalcula razões e, por fim, respeita ajustes explícitos de métricas derivadas.
 */
export function applyKpiOverrides(baseTotals = {}, overrides = {}) {
  const base = calculateDerivedTotals({ ...baseTotals });
  const overrideMap = Array.isArray(overrides)
    ? overrides.reduce((result, item) => ({ ...result, [normalizeMetric(item.metric)]: item }), {})
    : overrides;
  const adjustedFundamentals = { ...base };

  FUNDAMENTAL_KPI_KEYS.forEach((metric) => {
    const record = overrideMap[metric];
    if (record) adjustedFundamentals[metric] = toFiniteNumber(record.value);
  });

  const automaticTotals = calculateDerivedTotals(adjustedFundamentals);
  const totals = { ...automaticTotals };

  DERIVED_KPI_KEYS.forEach((metric) => {
    const record = overrideMap[metric];
    if (record) totals[metric] = toFiniteNumber(record.value);
  });
  // CPA e CAC são sinônimos de compatibilidade no restante do dashboard.
  totals.cac = totals.cpa;

  const recalculatedMetricKeys = new Set();
  if (overrideMap.investimento) ["cpc", "cpm", "cpl", "cpa"].forEach((metric) => recalculatedMetricKeys.add(metric));
  if (overrideMap.cliques) ["ctr", "cpc"].forEach((metric) => recalculatedMetricKeys.add(metric));
  if (overrideMap.impressoes) ["ctr", "cpm"].forEach((metric) => recalculatedMetricKeys.add(metric));
  if (overrideMap.leads) recalculatedMetricKeys.add("cpl");
  if (overrideMap.conversoes) recalculatedMetricKeys.add("cpa");

  const adjustedMetricKeys = KPI_OVERRIDE_KEYS.filter((metric) => Boolean(overrideMap[metric]));
  const adjustments = adjustedMetricKeys.map((metric) => {
    const record = overrideMap[metric];
    return {
      ...record,
      metric,
      label: getKpiOverrideLabel(metric),
      baseValue: getBaseMetricValue(base, metric),
      automaticValue: getBaseMetricValue(automaticTotals, metric),
      effectiveValue: getBaseMetricValue(totals, metric),
    };
  });

  return {
    baseTotals: base,
    automaticTotals,
    totals,
    overrides: overrideMap,
    adjustments,
    adjustedMetricKeys,
    recalculatedMetricKeys: [...recalculatedMetricKeys],
  };
}
