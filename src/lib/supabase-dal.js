// ============================================================
// supabase-dal.js — Data Access Layer (Supabase-first)
// DOit BI | Marketing Analytics Platform
// ============================================================
//
// Responsabilidades:
//   1. Leitura de dados do Supabase (fonte primária)
//   2. Escrita transacional com batch + retry
//   3. Gerenciamento de import_jobs
//   4. Deduplicação server-side via row_hash (UNIQUE constraint)
//   5. Consolidação de marketing_summary
//   6. Audit logging
//
// IMPORTANTE: Nenhuma operação de localStorage aqui.
// O cache local (IndexedDB) é gerenciado separadamente.
// ============================================================

import { supabase, isSupabaseConfigured } from "./supabase";
import { buildRowKey } from "./data-validator";
import { consolidateSummary } from "./db";

// ─── Constants ──────────────────────────────────────────────────────────────
const BATCH_SIZE = 500;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

// Table mapping (dataset_type → Supabase table name)
const DATASET_TABLE_MAP = {
  campaign_performance: "fact_campaigns",
  meta_campaign_performance: "fact_campaigns",
  meta_adset_performance: "fact_campaigns",
  meta_ad_performance: "fact_campaigns",
  device_performance: "fact_devices",
  hourly_performance: "fact_hourly",
  weekday_performance: "fact_weekday",
  weekday_hour_performance: "fact_weekday_hour",
  search_keywords: "fact_keywords",
  search_terms: "fact_search_terms",
  network_performance: "fact_networks",
  demographics_age: "fact_demographics",
  demographics_gender: "fact_demographics",
  demographics_gender_age: "fact_demographics",
  daily_time_series: "fact_time_series",
  crm_leads: "fact_crm",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTargetTable(datasetType) {
  return DATASET_TABLE_MAP[datasetType] || "fact_campaigns";
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry with exponential backoff
 */
async function withRetry(fn, context = "") {
  let lastError;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[DAL] Retry ${attempt + 1}/${MAX_RETRIES} for ${context}: ${err.message}. Waiting ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

/**
 * Get current user's organization_id from profiles table
 */
export async function getOrganizationId() {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  return profile?.organization_id || null;
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}


// ============================================================
// FETCH — Reading data from Supabase
// ============================================================

/**
 * Fetch the full marketing database for an organization.
 * Returns the same shape as the old localStorage object for compatibility.
 *
 * @param {string} orgId - Organization UUID
 * @param {object} filters - Optional filters { platform, reference_month, startDate, endDate }
 * @returns {object} Database object matching createInitialDb() shape
 */
export async function fetchMarketingDb(orgId, filters = {}) {
  if (!isSupabaseConfigured || !supabase || !orgId) {
    return null; // Caller should fall back to local
  }

  const tables = [
    "fact_campaigns",
    "fact_time_series",
    "fact_devices",
    "fact_hourly",
    "fact_weekday",
    "fact_weekday_hour",
    "fact_keywords",
    "fact_search_terms",
    "fact_networks",
    "fact_demographics",
    "fact_crm",
    "fact_marketing_summary",
  ];

  const db = {
    fact_campaigns: [],
    fact_time_series: [],
    fact_devices: [],
    fact_hourly: [],
    fact_weekday: [],
    fact_weekday_hour: [],
    fact_keywords: [],
    fact_search_terms: [],
    fact_networks: [],
    fact_demographics: [],
    fact_crm: [],
    fact_marketing_summary: [],
    uploaded_files: [],
  };

  // Fetch all tables in parallel
  const results = await Promise.allSettled(
    tables.map((table) => {
      let query = supabase.from(table).select("*").eq("organization_id", orgId);

      // Apply optional filters
      if (filters.platform && filters.platform !== "todas") {
        query = query.eq("platform", filters.platform);
      }
      if (filters.reference_month && filters.reference_month !== "todos") {
        query = query.eq("reference_month", filters.reference_month);
      }

      return query.order("created_at", { ascending: false });
    })
  );

  // Map results back to db object
  tables.forEach((table, idx) => {
    const result = results[idx];
    if (result.status === "fulfilled" && result.value.data) {
      db[table] = result.value.data;
    }
  });

  // Also fetch uploaded_files
  const { data: files } = await supabase
    .from("uploaded_files")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  db.uploaded_files = files || [];

  return db;
}

/**
 * Fetch only the marketing summary (lightweight query for KPIs)
 */
export async function fetchMarketingSummary(orgId, filters = {}) {
  if (!isSupabaseConfigured || !supabase || !orgId) return [];

  let query = supabase
    .from("fact_marketing_summary")
    .select("*")
    .eq("organization_id", orgId);

  if (filters.platform && filters.platform !== "todas") {
    query = query.eq("platform", filters.platform);
  }
  if (filters.reference_month && filters.reference_month !== "todos") {
    query = query.eq("reference_month", filters.reference_month);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[DAL] fetchMarketingSummary error:", error);
    return [];
  }
  return data || [];
}


// ============================================================
// IMPORT JOBS — Lifecycle management
// ============================================================

/**
 * Create a new import job with status "pending"
 */
export async function createImportJob(orgId, userId, fileMeta) {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase
    .from("import_jobs")
    .insert({
      organization_id: orgId,
      user_id: userId,
      status: "pending",
      file_name: fileMeta.raw_file_name || fileMeta.file_name,
      file_hash: fileMeta.file_hash || null,
      file_size_bytes: fileMeta.file_size || null,
      platform: fileMeta.platform,
      dataset_type: fileMeta.dataset_type,
      reference_month: fileMeta.reference_month || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[DAL] createImportJob error:", error);
    return null;
  }
  return data;
}

/**
 * Update import job status and statistics
 */
export async function updateImportJob(jobId, updates) {
  if (!isSupabaseConfigured || !supabase || !jobId) return;

  const { error } = await supabase
    .from("import_jobs")
    .update({
      ...updates,
      ...(updates.status === "processing" ? { started_at: new Date().toISOString() } : {}),
      ...(["completed", "failed", "partial"].includes(updates.status) ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq("id", jobId);

  if (error) {
    console.error("[DAL] updateImportJob error:", error);
  }
}

/**
 * Register uploaded file
 */
export async function registerUploadedFile(orgId, userId, fileMeta, importJobId) {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase
    .from("uploaded_files")
    .insert({
      organization_id: orgId,
      user_id: userId,
      import_job_id: importJobId,
      file_name: fileMeta.raw_file_name || fileMeta.file_name,
      file_hash: fileMeta.file_hash,
      file_size_bytes: fileMeta.file_size || null,
      platform: fileMeta.platform,
      dataset_type: fileMeta.dataset_type,
      reference_month: fileMeta.reference_month || null,
      row_count: fileMeta.row_count || 0,
    })
    .select()
    .single();

  if (error) {
    console.error("[DAL] registerUploadedFile error:", error);
    return null;
  }
  return data;
}

/**
 * Check if a file was already imported (by hash or name)
 */
export async function checkFileDuplicateRemote(orgId, fileMeta) {
  if (!isSupabaseConfigured || !supabase || !orgId) return null;

  const { data } = await supabase
    .from("uploaded_files")
    .select("id, file_name, file_hash, created_at")
    .eq("organization_id", orgId)
    .or(`file_hash.eq.${fileMeta.file_hash},file_name.eq.${fileMeta.raw_file_name || fileMeta.file_name}`)
    .limit(1)
    .single();

  return data || null;
}


// ============================================================
// UPSERT — Writing data to Supabase with batch + dedup
// ============================================================

/**
 * Upsert rows into the appropriate fact table.
 * Uses row_hash for deduplication (ON CONFLICT DO UPDATE).
 * Sends data in batches of BATCH_SIZE with retry.
 *
 * @param {string} orgId - Organization UUID
 * @param {string} userId - User UUID
 * @param {object} fileMeta - { platform, dataset_type, reference_month, ... }
 * @param {Array} rows - Normalized rows from ETL
 * @param {string} importJobId - Import job UUID
 * @param {string} sourceFileId - Uploaded file UUID
 * @param {function} onProgress - Optional progress callback (0-100)
 * @returns {{ inserted: number, updated: number, rejected: number, errors: string[] }}
 */
export async function upsertImportBatch(orgId, userId, fileMeta, rows, importJobId, sourceFileId, onProgress) {
  if (!isSupabaseConfigured || !supabase) {
    return { inserted: 0, updated: 0, rejected: rows.length, errors: ["Supabase não configurado"] };
  }

  const targetTable = getTargetTable(fileMeta.dataset_type);
  const stats = { inserted: 0, updated: 0, rejected: 0, errors: [] };

  // Prepare rows with organization context and row_hash
  const preparedRows = rows.map((row) => {
    const rowHash = buildRowKey(row);
    return buildTableRow(targetTable, row, orgId, userId, importJobId, sourceFileId, rowHash, fileMeta);
  });

  // Split into batches
  const batches = [];
  for (let i = 0; i < preparedRows.length; i += BATCH_SIZE) {
    batches.push(preparedRows.slice(i, i + BATCH_SIZE));
  }

  // Process batches sequentially with retry
  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];

    try {
      await withRetry(async () => {
        const { data, error } = await supabase
          .from(targetTable)
          .upsert(batch, {
            onConflict: "organization_id,row_hash",
            ignoreDuplicates: false,
          })
          .select("id");

        if (error) throw new Error(`Batch ${batchIdx + 1}: ${error.message}`);

        // Count: if we got data back, those are inserts/updates
        stats.inserted += (data?.length || 0);
      }, `upsert batch ${batchIdx + 1}/${batches.length}`);
    } catch (err) {
      stats.rejected += batch.length;
      stats.errors.push(err.message);
      console.error(`[DAL] Batch ${batchIdx + 1} failed permanently:`, err.message);
    }

    // Report progress
    if (onProgress) {
      const progress = Math.round(((batchIdx + 1) / batches.length) * 100);
      onProgress(progress);
    }
  }

  return stats;
}

/**
 * Build a row object for a specific table with all required fields
 */
function buildTableRow(table, row, orgId, userId, importJobId, sourceFileId, rowHash, fileMeta) {
  const base = {
    organization_id: orgId,
    user_id: userId,
    source_file_id: sourceFileId,
    import_batch_id: importJobId,
    row_hash: rowHash,
    platform: row.platform || fileMeta.platform,
    reference_month: row.reference_month || fileMeta.reference_month,
  };

  switch (table) {
    case "fact_campaigns":
      return {
        ...base,
        dataset_type: row.dataset_type || fileMeta.dataset_type,
        campaign_name: row.campaign_name || null,
        adset_name: row.adset_name || null,
        ad_name: row.ad_name || null,
        status: row.status || "Ativo",
        date: row.date || null,
        period_start: row.period_start || null,
        period_end: row.period_end || row.report_end_date || null,
        spend: row.spend || 0,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        conversions: row.conversions || 0,
        leads: row.leads || 0,
        revenue: row.revenue || 0,
        reach: row.reach || 0,
        frequency: row.frequency || 0,
        ctr: row.ctr || 0,
        cpc: row.cpc || 0,
        cpm: row.cpm || 0,
        cpl: row.cpl || 0,
        cpa: row.cpa || 0,
        roas: row.roas || 0,
        is_aggregate: row.is_aggregate || false,
      };

    case "fact_time_series":
      return {
        ...base,
        dataset_type: "daily_time_series",
        campaign_name: row.campaign_name || null,
        date: row.date,
        spend: row.spend || 0,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        conversions: row.conversions || 0,
        leads: row.leads || 0,
        revenue: row.revenue || 0,
        reach: row.reach || 0,
        ctr: row.ctr || 0,
        cpc: row.cpc || 0,
      };

    case "fact_devices":
      return {
        ...base,
        campaign_name: row.campaign_name || null,
        device: row.device,
        date: row.date || null,
        spend: row.spend || 0,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        conversions: row.conversions || 0,
        leads: row.leads || 0,
        revenue: row.revenue || 0,
      };

    case "fact_hourly":
      return {
        ...base,
        campaign_name: row.campaign_name || null,
        hour: parseInt(row.hour || 0, 10),
        date: row.date || null,
        spend: row.spend || 0,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        conversions: row.conversions || 0,
      };

    case "fact_weekday":
      return {
        ...base,
        campaign_name: row.campaign_name || null,
        weekday: row.weekday || row.day_of_week || "",
        date: row.date || null,
        spend: row.spend || 0,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        conversions: row.conversions || 0,
      };

    case "fact_weekday_hour":
      return {
        ...base,
        campaign_name: row.campaign_name || null,
        weekday: row.weekday || row.day_of_week || "",
        hour: parseInt(row.hour || 0, 10),
        date: row.date || null,
        spend: row.spend || 0,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        conversions: row.conversions || 0,
      };

    case "fact_keywords":
      return {
        ...base,
        campaign_name: row.campaign_name || null,
        keyword: row.keyword || "",
        match_type: row.match_type || null,
        date: row.date || null,
        spend: row.spend || 0,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        conversions: row.conversions || 0,
        ctr: row.ctr || 0,
        cpc: row.cpc || 0,
      };

    case "fact_search_terms":
      return {
        ...base,
        campaign_name: row.campaign_name || null,
        search_term: row.search_term || "",
        date: row.date || null,
        spend: row.spend || 0,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        conversions: row.conversions || 0,
      };

    case "fact_networks":
      return {
        ...base,
        campaign_name: row.campaign_name || null,
        network: row.network || "",
        date: row.date || null,
        spend: row.spend || 0,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        conversions: row.conversions || 0,
        revenue: row.revenue || 0,
      };

    case "fact_demographics":
      return {
        ...base,
        campaign_name: row.campaign_name || null,
        gender: row.gender || null,
        age_range: row.age_range || null,
        date: row.date || null,
        spend: row.spend || 0,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        conversions: row.conversions || 0,
      };

    case "fact_crm":
      return {
        ...base,
        crm_platform: row.crm_platform || row.platform || "bitrix",
        lead_id: row.lead_id || null,
        client_name: row.client_name || null,
        phone: row.phone || null,
        lead_status: row.lead_status || null,
        lead_source: row.lead_source || null,
        lead_medium: row.lead_medium || null,
        lead_campaign: row.lead_campaign || null,
        lead_industry: row.lead_industry || null,
        date: row.date || null,
        conversions: row.conversions || 0,
        is_demo: row.is_demo || false,
      };

    default:
      return { ...base, ...row };
  }
}


// ============================================================
// CONSOLIDATION — Rebuild marketing summary in Supabase
// ============================================================

async function fetchAllOrganizationRows(table, orgId) {
  const rows = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("organization_id", orgId)
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Falha ao carregar ${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

/**
 * Rebuild fact_marketing_summary for an organization.
 * Deletes existing summary rows and reinserts aggregated data.
 * This runs server-side via Supabase — no localStorage involved.
 */
export async function rebuildMarketingSummary(orgId) {
  if (!isSupabaseConfigured || !supabase || !orgId) return;

  const { error: deleteError } = await supabase
    .from("fact_marketing_summary")
    .delete()
    .eq("organization_id", orgId);

  if (deleteError) {
    throw new Error(`Falha ao limpar o resumo de marketing: ${deleteError.message}`);
  }

  // A consolidação remota deve usar as mesmas fontes e regras do modo local.
  // Em especial, fact_crm é necessária para Leads Qualificados e Agendados.
  const [campaigns, timeSeries, crmRows] = await Promise.all([
    fetchAllOrganizationRows("fact_campaigns", orgId),
    fetchAllOrganizationRows("fact_time_series", orgId),
    fetchAllOrganizationRows("fact_crm", orgId),
  ]);

  const consolidated = consolidateSummary({
    fact_campaigns: campaigns,
    fact_time_series: timeSeries,
    fact_crm: crmRows,
    fact_devices: [],
  });

  const summaryRows = (consolidated.fact_marketing_summary || []).map((row) => ({
    organization_id: orgId,
    platform: row.platform,
    campaign_name: row.campaign_name || null,
    date: row.date || null,
    reference_month: row.reference_month || null,
    reference_label: row.reference_label || "",
    spend: row.spend || 0,
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    conversions: row.conversions || 0,
    leads: row.leads || 0,
    revenue: row.revenue || 0,
    reach: row.reach || 0,
    ctr: row.ctr || 0,
    cpc: row.cpc || 0,
    cpm: row.cpm || 0,
    cpl: row.cpl || 0,
    cac: row.cac || 0,
    roas: row.roas || 0,
    status: row.status || "Ativo",
    is_crm: row.is_crm || false,
    crm_leads: row.crm_leads || 0,
    crm_demos: row.crm_demos || 0,
  }));

  for (let i = 0; i < summaryRows.length; i += BATCH_SIZE) {
    const batch = summaryRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("fact_marketing_summary").insert(batch);
    if (error) {
      throw new Error(`Falha ao reconstruir o resumo de marketing: ${error.message}`);
    }
  }
}


// ============================================================
// DELETE — Clear organization data
// ============================================================

/**
 * Delete all data for an organization (used by "Limpar Dados")
 */
export async function clearOrganizationData(orgId) {
  if (!isSupabaseConfigured || !supabase || !orgId) return;

  const tables = [
    "fact_marketing_summary",
    "fact_campaigns",
    "fact_time_series",
    "fact_devices",
    "fact_hourly",
    "fact_weekday",
    "fact_weekday_hour",
    "fact_keywords",
    "fact_search_terms",
    "fact_networks",
    "fact_demographics",
    "fact_crm",
    "uploaded_files",
    "import_jobs",
  ];

  await Promise.allSettled(
    tables.map((table) =>
      supabase.from(table).delete().eq("organization_id", orgId)
    )
  );

  // Log the action
  const user = await getCurrentUser();
  if (user) {
    await logAudit(orgId, user.id, "clear", "organization", orgId, { action: "clear_all_data" });
  }
}

// ============================================================
// AUDIT — Logging
// ============================================================

/**
 * Log an audit event
 */
export async function logAudit(orgId, userId, action, entityType, entityId, details = {}) {
  if (!isSupabaseConfigured || !supabase) return;

  await supabase.from("audit_logs").insert({
    organization_id: orgId,
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
}

// ============================================================
// FULL IMPORT FLOW — Orchestrator
// ============================================================

async function removeStaleImportRows(orgId, fileMeta, rows) {
  const targetTable = getTargetTable(fileMeta.dataset_type);
  const months = [...new Set(rows.map(row => row.reference_month).filter(Boolean))];
  if (months.length === 0 && fileMeta.reference_month) months.push(fileMeta.reference_month);
  if (months.length === 0) return;

  const incomingHashes = new Set(rows.map(buildRowKey));
  const staleIds = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    let query = supabase
      .from(targetTable)
      .select("id,row_hash")
      .eq("organization_id", orgId)
      .eq("platform", fileMeta.platform)
      .in("reference_month", months)
      .range(from, from + pageSize - 1);

    if (targetTable === "fact_campaigns") {
      query = query.eq("dataset_type", fileMeta.dataset_type);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Falha ao verificar registros antigos: ${error.message}`);

    (data || []).forEach(row => {
      if (!incomingHashes.has(row.row_hash)) staleIds.push(row.id);
    });

    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  for (let i = 0; i < staleIds.length; i += BATCH_SIZE) {
    const { error } = await supabase
      .from(targetTable)
      .delete()
      .eq("organization_id", orgId)
      .in("id", staleIds.slice(i, i + BATCH_SIZE));
    if (error) throw new Error(`Falha ao remover registros substituídos: ${error.message}`);
  }
}

/**
 * Complete import flow: create job → upsert data → rebuild summary → log audit
 *
 * @param {string} orgId
 * @param {string} userId
 * @param {object} fileMeta
 * @param {Array} rows - Normalized rows from ETL
 * @param {string} action - "replace" | "merge" | "ignore"
 * @param {function} onProgress - Optional (0-100)
 * @returns {{ success: boolean, job: object, stats: object, error?: string }}
 */
export async function executeImport(orgId, userId, fileMeta, rows, action = "replace", onProgress) {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, job: null, stats: null, error: "Supabase não configurado" };
  }

  // 1. Create import job
  const job = await createImportJob(orgId, userId, fileMeta);
  if (!job) {
    return { success: false, job: null, stats: null, error: "Falha ao criar import job" };
  }

  try {
    // 2. Update to processing
    await updateImportJob(job.id, { status: "processing", rows_received: rows.length });

    // 3. Register file
    const uploadedFile = await registerUploadedFile(orgId, userId, {
      ...fileMeta,
      row_count: rows.length,
    }, job.id);

    // 4. Upsert data in batches
    const stats = await upsertImportBatch(
      orgId, userId, fileMeta, rows, job.id,
      uploadedFile?.id || null,
      onProgress
    );

    // Em replace, remove somente linhas antigas do mesmo escopo que não vieram
    // no novo arquivo. A limpeza ocorre após o upsert bem-sucedido para evitar perda.
    if (action === "replace" && stats.rejected === 0) {
      await removeStaleImportRows(orgId, fileMeta, rows);
    }

    // 5. Determine final status
    const finalStatus = stats.rejected === 0 ? "completed" :
      stats.inserted > 0 ? "partial" : "failed";

    // 6. Update import job with results
    await updateImportJob(job.id, {
      status: finalStatus,
      rows_valid: stats.inserted,
      rows_rejected: stats.rejected,
      rows_inserted: stats.inserted,
      rows_updated: stats.updated,
      error_messages: stats.errors.length > 0 ? stats.errors : [],
    });

    // 7. Rebuild marketing summary
    await rebuildMarketingSummary(orgId);

    // 8. Audit log
    await logAudit(orgId, userId, "import", "import_job", job.id, {
      file: fileMeta.raw_file_name,
      platform: fileMeta.platform,
      rows_inserted: stats.inserted,
      rows_rejected: stats.rejected,
    });

    return { success: true, job, stats };
  } catch (err) {
    // Update job as failed
    await updateImportJob(job.id, {
      status: "failed",
      error_messages: [err.message],
    });
    return { success: false, job, stats: null, error: err.message };
  }
}

// ============================================================
// UTILITY — Check if DAL is available
// ============================================================

/**
 * Returns true if Supabase is configured and user is authenticated with an org
 */
export async function isDALReady() {
  if (!isSupabaseConfigured || !supabase) return false;
  const orgId = await getOrganizationId();
  return !!orgId;
}

/**
 * Get import jobs for the current organization
 */
export async function getImportJobs(orgId, limit = 20) {
  if (!isSupabaseConfigured || !supabase || !orgId) return [];

  const { data } = await supabase
    .from("import_jobs")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}
