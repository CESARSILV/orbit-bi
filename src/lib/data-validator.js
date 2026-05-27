// ============================================================
// data-validator.js — Camada de Validação de Integridade
// Orbit BI | Mídia Paga Analytics
// ============================================================
//
// Responsabilidades:
//   1. Validar integridade pós-importação (total do arquivo vs banco)
//   2. Detectar duplicatas dentro do próprio arquivo antes de inserir
//   3. Validar consistência matemática das métricas derivadas
//   4. Gerar relatório de importação com warnings acionáveis
// ============================================================

// ----------------------------------------------------
// Tolerância de divergência aceitável (0.5% do total)
// ----------------------------------------------------
const DRIFT_TOLERANCE = 0.005; // 0,5%

// ----------------------------------------------------
// 1. buildRowKey — chave semântica estável e determinística
//    Usada em TODOS os pontos de deduplicação do sistema.
//    A data é normalizada para YYYY-MM para que formatos
//    diferentes (2025-10-01 vs 2025-10) produzam a mesma chave.
// ----------------------------------------------------
export function buildRowKey(row) {
  // Normaliza a data para YYYY-MM (ignora o dia para comparação de meses)
  const rawDate = row.date || row.reference_month || "";
  const dateKey = rawDate.length >= 7 ? rawDate.slice(0, 7) : rawDate;

  return [
    (row.platform        || "").toLowerCase().trim(),
    dateKey,
    (row.campaign_name   || "").toLowerCase().trim(),
    (row.adset_name      || "").toLowerCase().trim(),
    (row.ad_name         || "").toLowerCase().trim(),
    (row.device          || "").toLowerCase().trim(),
    (row.keyword         || "").toLowerCase().trim(),
    (row.search_term     || "").toLowerCase().trim(),
    (row.gender          || "").toLowerCase().trim(),
    (row.age_range       || "").toLowerCase().trim(),
    (row.network         || "").toLowerCase().trim(),
    String(row.hour      ?? ""),
  ].join("|");
}

// ----------------------------------------------------
// 2. Gera ID determinístico baseado nos dados da linha
//    (substitui o uso de Date.now() que quebra a dedup)
// ----------------------------------------------------
export function buildDeterministicId(row) {
  const key = buildRowKey(row);
  // Hash DJB2 simples — rápido, sem dependência externa
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) ^ key.charCodeAt(i);
    hash |= 0; // força 32-bit int
  }
  return `row_${Math.abs(hash).toString(16)}_${(row.reference_month || "").replace("-", "")}`;
}

// ----------------------------------------------------
// 3. detectDuplicateRows — detecta duplicatas DENTRO
//    do próprio arquivo antes de inserir no banco
// ----------------------------------------------------
export function detectDuplicateRows(rows) {
  const seen = new Map(); // key → index da primeira ocorrência
  const duplicates = [];

  rows.forEach((row, idx) => {
    const key = buildRowKey(row);
    if (seen.has(key)) {
      duplicates.push({
        duplicateIndex: idx,
        originalIndex: seen.get(key),
        key,
        campaign: row.campaign_name || "(sem campanha)",
        date: row.date || row.reference_month || "(sem data)",
        spend: row.spend || 0,
      });
    } else {
      seen.set(key, idx);
    }
  });

  return {
    hasDuplicates: duplicates.length > 0,
    count: duplicates.length,
    duplicates,
  };
}

// ----------------------------------------------------
// 4. validateMetricConsistency — verifica se CTR/CPC/CPM
//    estão matematicamente corretos na linha normalizada
// ----------------------------------------------------
export function validateMetricConsistency(row) {
  const warnings = [];

  const { spend, clicks, impressions, leads, conversions, ctr, cpc, cpm, cpl } = row;

  // CTR: deve ser clicks/impressions (tolerância 0.1%)
  if (impressions > 0 && clicks >= 0 && typeof ctr === "number") {
    const expectedCtr = clicks / impressions;
    if (Math.abs(ctr - expectedCtr) > 0.001) {
      warnings.push(`CTR inconsistente: arquivo=${(ctr * 100).toFixed(2)}%, calculado=${(expectedCtr * 100).toFixed(2)}%`);
    }
  }

  // CPC: deve ser spend/clicks (tolerância 1%)
  if (clicks > 0 && spend >= 0 && typeof cpc === "number") {
    const expectedCpc = spend / clicks;
    if (Math.abs(cpc - expectedCpc) / expectedCpc > 0.01) {
      warnings.push(`CPC inconsistente: arquivo=R$${cpc.toFixed(2)}, calculado=R$${expectedCpc.toFixed(2)}`);
    }
  }

  // CPM: deve ser (spend/impressions)*1000 (tolerância 1%)
  if (impressions > 0 && spend >= 0 && typeof cpm === "number") {
    const expectedCpm = (spend / impressions) * 1000;
    if (Math.abs(cpm - expectedCpm) / expectedCpm > 0.01) {
      warnings.push(`CPM inconsistente: arquivo=R$${cpm.toFixed(2)}, calculado=R$${expectedCpm.toFixed(2)}`);
    }
  }

  // Spend negativo
  if (spend < 0) {
    warnings.push(`Investimento negativo detectado: R$${spend}`);
  }

  // Cliques maiores que impressões (fisicamente impossível)
  if (impressions > 0 && clicks > impressions) {
    warnings.push(`Cliques (${clicks}) maiores que impressões (${impressions}) — dado inconsistente`);
  }

  return { valid: warnings.length === 0, warnings };
}

// ----------------------------------------------------
// 5. validateImportIntegrity — compara o total do arquivo
//    (calculado no ETL) com o total persistido no banco.
//    Retorna: { ok, reportTotal, dbTotal, drift, driftPct, message }
// ----------------------------------------------------
export function validateImportIntegrity(fileMeta, db) {
  const { platform, reference_month, reportTotal, raw_file_name } = fileMeta;

  if (typeof reportTotal !== "number") {
    return {
      ok: true,
      skipped: true,
      message: "Total do relatório não disponível para validação.",
    };
  }

  // Soma o spend de todos os registros da plataforma+mês importados
  const targetTable = db.fact_campaigns || [];
  const dbTotal = targetTable
    .filter(r => {
      if (r.platform !== platform) return false;
      if (r.reference_month !== reference_month) return false;
      // Considera apenas linhas sem segmentação (device/keyword/gender) para evitar
      // comparar com dados segmentados que somam o mesmo investimento
      if (r.device || r.keyword || r.gender || r.age_range || r.search_term) return false;
      return true;
    })
    .reduce((sum, r) => sum + (r.spend || 0), 0);

  const drift = Math.abs(dbTotal - reportTotal);
  const driftPct = reportTotal > 0 ? drift / reportTotal : 0;
  const ok = driftPct <= DRIFT_TOLERANCE;

  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const message = ok
    ? `✅ Integridade verificada: Arquivo ${brl.format(reportTotal)} = Dashboard ${brl.format(dbTotal)}`
    : `⚠️ Divergência detectada: Arquivo ${brl.format(reportTotal)} vs Dashboard ${brl.format(dbTotal)} (${(driftPct * 100).toFixed(1)}% de drift)`;

  return { ok, reportTotal, dbTotal, drift, driftPct, message };
}

// ----------------------------------------------------
// 6. generateImportReport — relatório completo pós-importação
//    com métricas, warnings e status de integridade
// ----------------------------------------------------
export function generateImportReport(fileMeta, rows, validationResult, duplicateResult) {
  const totalSpend = rows.reduce((s, r) => s + (r.spend || 0), 0);
  const totalClicks = rows.reduce((s, r) => s + (r.clicks || 0), 0);
  const totalImpressions = rows.reduce((s, r) => s + (r.impressions || 0), 0);
  const totalLeads = rows.reduce((s, r) => s + (r.leads || 0), 0);
  const totalConversions = rows.reduce((s, r) => s + (r.conversions || 0), 0);

  const rowWarnings = [];
  rows.forEach((row, idx) => {
    const { warnings } = validateMetricConsistency(row);
    if (warnings.length > 0) {
      rowWarnings.push({ rowIndex: idx, campaign: row.campaign_name, warnings });
    }
  });

  return {
    file: fileMeta.raw_file_name,
    platform: fileMeta.platform,
    dataset_type: fileMeta.dataset_type,
    reference_month: fileMeta.reference_month,
    rowCount: rows.length,
    metrics: {
      totalSpend,
      totalClicks,
      totalImpressions,
      totalLeads,
      totalConversions,
    },
    integrity: validationResult,
    duplicates: duplicateResult,
    metricWarnings: rowWarnings,
    hasIssues:
      !validationResult?.ok ||
      duplicateResult?.hasDuplicates ||
      rowWarnings.length > 0,
  };
}
