const EMPTY_ATTRIBUTION_VALUES = new Set([
  "",
  "-",
  "—",
  "n/a",
  "na",
  "null",
  "undefined",
  "sem origem",
  "nao informado",
  "não informado",
]);

const CATEGORY_KEYS = ["meta", "google", "playbooks"];

export function normalizeAttributionText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_/|\\-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isEmptyAttributionValue(value) {
  const normalized = normalizeAttributionText(value);
  return EMPTY_ATTRIBUTION_VALUES.has(normalized);
}

function findCategories(value) {
  const normalized = normalizeAttributionText(value);
  if (!normalized || EMPTY_ATTRIBUTION_VALUES.has(normalized)) return [];

  const categories = [];
  if (/(facebook|instagram|whatsapp|meta|paid social|social paid)/.test(normalized)) {
    categories.push("meta");
  }
  if (/(google|adwords|gads)/.test(normalized)) {
    categories.push("google");
  }
  if (normalized.includes("playbook")) {
    categories.push("playbooks");
  }
  return [...new Set(categories)];
}

function resolveKnownCategory(value, allowUnknown) {
  const normalized = normalizeAttributionText(value);
  if (!normalized || EMPTY_ATTRIBUTION_VALUES.has(normalized)) return null;

  const categories = findCategories(value);
  if (categories.length === 1) {
    return { category: categories[0], conflict: false };
  }
  if (categories.length > 1) {
    return { category: "outras", conflict: true };
  }
  return allowUnknown ? { category: "outras", conflict: false } : null;
}

function firstEvidence(row, definitions) {
  return definitions
    .map(({ field, value, allowUnknown }) => ({
      field,
      value,
      allowUnknown,
      empty: isEmptyAttributionValue(value),
    }))
    .find((item) => !item.empty) || null;
}

/**
 * Resolve a lead acquisition channel without replacing the raw CRM fields.
 * Explicit source has precedence; medium and campaign are only fallbacks when
 * they contain an unambiguous channel token.
 */
export function resolveLeadAttribution(row = {}) {
  const sourceEvidence = firstEvidence(row, [
    { field: "lead_source", value: row.lead_source, allowUnknown: true },
    { field: "source", value: row.source, allowUnknown: true },
    { field: "origem", value: row.origem, allowUnknown: true },
    { field: "utm_source", value: row.utm_source, allowUnknown: true },
  ]);
  const mediumEvidence = firstEvidence(row, [
    { field: "lead_medium", value: row.lead_medium, allowUnknown: false },
    { field: "medium", value: row.medium, allowUnknown: false },
    { field: "utm_medium", value: row.utm_medium, allowUnknown: false },
  ]);
  const campaignEvidence = firstEvidence(row, [
    { field: "lead_campaign", value: row.lead_campaign, allowUnknown: false },
    { field: "campaign", value: row.campaign, allowUnknown: false },
    { field: "utm_campaign", value: row.utm_campaign, allowUnknown: false },
  ]);

  const evidences = [sourceEvidence, mediumEvidence, campaignEvidence].filter(Boolean);
  const candidates = evidences
    .map((evidence) => ({
      ...evidence,
      resolved: resolveKnownCategory(evidence.value, evidence.allowUnknown),
    }))
    .filter((evidence) => evidence.resolved);

  const distinctCategories = [...new Set(candidates.map((candidate) => candidate.resolved.category))];
  const hasConflict = distinctCategories.length > 1 || candidates.some((candidate) => candidate.resolved.conflict);
  const selected = candidates[0];

  if (!selected) {
    return {
      category: "sem_origem",
      method: "sem origem",
      confidence: "nenhuma",
      sourceField: "",
      rawValue: "",
      hasConflict: false,
    };
  }

  const isDeclared = selected.field === "lead_source"
    || selected.field === "source"
    || selected.field === "origem"
    || selected.field === "utm_source";

  return {
    category: selected.resolved.category,
    method: isDeclared ? "origem declarada" : `${selected.field} inferido`,
    confidence: isDeclared ? "alta" : "média",
    sourceField: selected.field,
    rawValue: String(selected.value ?? "").trim(),
    hasConflict,
  };
}

export const ATTRIBUTION_CATEGORIES = CATEGORY_KEYS;
