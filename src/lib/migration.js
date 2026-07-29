// ============================================================
// migration.js — Migração de localStorage para Supabase
// DOit BI | Marketing Analytics Platform
// ============================================================
//
// Responsabilidades:
//   1. Detectar se existem dados legados no localStorage
//   2. Migrar dados para o Supabase de forma idempotente
//   3. Validar integridade pós-migração
//   4. Limpar localStorage após migração bem-sucedida
//   5. Preservar apenas chaves de UI no localStorage
//
// Fluxo:
//   - Ao fazer login com Supabase pela primeira vez, o sistema
//     detecta dados no localStorage e oferece migração.
//   - A migração é idempotente: usar row_hash evita duplicatas.
//   - Se interrompida, pode ser retomada sem perda de dados.
// ============================================================

"use client";

import { getDatabase, createInitialDb, saveDatabase } from "./db";
import { isSupabaseConfigured } from "./supabase";
import { upsertImportBatch, registerUploadedFile, createImportJob, updateImportJob, rebuildMarketingSummary, logAudit } from "./supabase-dal";
import { getAllowedLocalStorageKeys } from "./cache";
import { buildRowKey } from "./data-validator";

// ─── Constants ──────────────────────────────────────────────────────────────

const MIGRATION_FLAG = "doit_migration_completed";
const LEGACY_DB_KEY = "doit_marketing_bi_db";

// Dataset type mapping for tables
const TABLE_DATASET_MAP = {
  fact_campaigns: "campaign_performance",
  fact_time_series: "daily_time_series",
  fact_devices: "device_performance",
  fact_hourly: "hourly_performance",
  fact_weekday: "weekday_performance",
  fact_weekday_hour: "weekday_hour_performance",
  fact_keywords: "search_keywords",
  fact_search_terms: "search_terms",
  fact_networks: "network_performance",
  fact_demographics: "demographics_gender_age",
  fact_crm: "crm_leads",
};

// ─── Detection ──────────────────────────────────────────────────────────────

/**
 * Check if there are legacy data in localStorage that should be migrated
 * @returns {{ hasData: boolean, rowCount: number, tables: string[] }}
 */
export function detectLegacyData() {
  if (typeof window === "undefined") return { hasData: false, rowCount: 0, tables: [] };

  // If migration was already done, skip
  if (localStorage.getItem(MIGRATION_FLAG) === "true") {
    return { hasData: false, rowCount: 0, tables: [], alreadyMigrated: true };
  }

  try {
    const raw = localStorage.getItem(LEGACY_DB_KEY);
    if (!raw) return { hasData: false, rowCount: 0, tables: [] };

    const db = JSON.parse(raw);
    let totalRows = 0;
    const tablesWithData = [];

    const tablesToCheck = [
      "fact_campaigns", "fact_time_series", "fact_devices",
      "fact_hourly", "fact_weekday", "fact_weekday_hour",
      "fact_keywords", "fact_search_terms", "fact_networks",
      "fact_demographics", "fact_crm",
    ];

    tablesToCheck.forEach((table) => {
      const rows = db[table];
      if (Array.isArray(rows) && rows.length > 0) {
        totalRows += rows.length;
        tablesWithData.push(table);
      }
    });

    return {
      hasData: totalRows > 0,
      rowCount: totalRows,
      tables: tablesWithData,
    };
  } catch {
    return { hasData: false, rowCount: 0, tables: [] };
  }
}


// ─── Migration Execution ────────────────────────────────────────────────────

/**
 * Execute the full migration from localStorage to Supabase.
 * Idempotent: uses row_hash unique constraint to avoid duplicates.
 *
 * @param {string} orgId - Organization UUID
 * @param {string} userId - User UUID
 * @param {function} onProgress - Callback: ({ table, progress, totalProgress, message })
 * @returns {{ success: boolean, migratedRows: number, errors: string[] }}
 */
export async function migrateLocalToSupabase(orgId, userId, onProgress) {
  if (!isSupabaseConfigured || !orgId || !userId) {
    return { success: false, migratedRows: 0, errors: ["Supabase não configurado ou usuário não autenticado"] };
  }

  const db = getDatabase();
  const errors = [];
  let totalMigrated = 0;

  const tablesToMigrate = [
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
  ];

  // Count total rows for progress
  let totalRows = 0;
  tablesToMigrate.forEach((table) => {
    const rows = db[table];
    if (Array.isArray(rows)) totalRows += rows.length;
  });

  if (totalRows === 0) {
    markMigrationComplete();
    return { success: true, migratedRows: 0, errors: [] };
  }

  let processedRows = 0;

  // Create a migration import job
  const migrationJob = await createImportJob(orgId, userId, {
    raw_file_name: `migration_localStorage_${new Date().toISOString()}`,
    file_hash: `migration_${Date.now()}`,
    platform: "all",
    dataset_type: "migration",
    reference_month: null,
  });

  const jobId = migrationJob?.id || null;

  if (jobId) {
    await updateImportJob(jobId, { status: "processing", rows_received: totalRows });
  }

  // Migrate each table
  for (const table of tablesToMigrate) {
    const rows = db[table];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    const datasetType = TABLE_DATASET_MAP[table] || "campaign_performance";

    // Determine platform from rows (use first non-empty platform found)
    const platform = rows.find((r) => r.platform)?.platform || "google";

    const fileMeta = {
      platform,
      dataset_type: datasetType,
      reference_month: null,
    };

    // Prepare rows with row_hash
    const preparedRows = rows.map((row) => ({
      ...row,
      row_hash: buildRowKey(row),
    }));

    // Upsert in batches
    try {
      const stats = await upsertImportBatch(
        orgId,
        userId,
        fileMeta,
        preparedRows,
        jobId,
        null, // no source file for migration
        (batchProgress) => {
          // Calculate overall progress
          const tableProgress = processedRows + Math.round((batchProgress / 100) * rows.length);
          const overallProgress = Math.round((tableProgress / totalRows) * 100);

          if (onProgress) {
            onProgress({
              table,
              progress: batchProgress,
              totalProgress: overallProgress,
              message: `Migrando ${table} (${batchProgress}%)...`,
            });
          }
        }
      );

      totalMigrated += stats.inserted;
      processedRows += rows.length;

      if (stats.errors.length > 0) {
        errors.push(...stats.errors.map((e) => `${table}: ${e}`));
      }
    } catch (err) {
      errors.push(`${table}: ${err.message}`);
      processedRows += rows.length;
    }

    // Report per-table progress
    if (onProgress) {
      onProgress({
        table,
        progress: 100,
        totalProgress: Math.round((processedRows / totalRows) * 100),
        message: `${table} concluído`,
      });
    }
  }

  // Rebuild summary
  try {
    await rebuildMarketingSummary(orgId);
  } catch (err) {
    errors.push(`rebuildMarketingSummary: ${err.message}`);
  }

  // Update job status
  const finalStatus = errors.length === 0 ? "completed" : totalMigrated > 0 ? "partial" : "failed";
  if (jobId) {
    await updateImportJob(jobId, {
      status: finalStatus,
      rows_valid: totalMigrated,
      rows_rejected: totalRows - totalMigrated,
      rows_inserted: totalMigrated,
      error_messages: errors,
    });
  }

  // Audit
  await logAudit(orgId, userId, "migration", "import_job", jobId, {
    source: "localStorage",
    totalRows,
    migratedRows: totalMigrated,
    errors: errors.length,
  });

  // Mark migration as complete
  if (finalStatus === "completed" || finalStatus === "partial") {
    markMigrationComplete();
  }

  return {
    success: errors.length === 0,
    migratedRows: totalMigrated,
    errors,
  };
}


// ─── Post-Migration Cleanup ─────────────────────────────────────────────────

/**
 * Mark migration as completed (flag in localStorage)
 */
function markMigrationComplete() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MIGRATION_FLAG, "true");
  } catch {}
}

/**
 * Check if migration was already completed
 */
export function isMigrationCompleted() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MIGRATION_FLAG) === "true";
}

/**
 * Clean up localStorage after successful migration.
 * Removes all business data, preserving only UI preferences.
 */
export function cleanupLocalStorageAfterMigration() {
  if (typeof window === "undefined") return;

  const allowedKeys = new Set(getAllowedLocalStorageKeys());
  // Also keep the migration flag itself
  allowedKeys.add(MIGRATION_FLAG);

  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !allowedKeys.has(key)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  });

  console.log(`[Migration] Cleanup: removed ${keysToRemove.length} legacy keys from localStorage`);
}

/**
 * Verify migration integrity: compare row counts between local and remote.
 *
 * @param {string} orgId
 * @param {object} localDb - The local database object
 * @returns {{ ok: boolean, localCount: number, remoteCount: number, drift: number }}
 */
export async function verifyMigrationIntegrity(orgId, localDb) {
  if (!isSupabaseConfigured) return { ok: false, localCount: 0, remoteCount: 0, drift: 0 };

  const { supabase } = await import("./supabase");

  // Count local rows
  let localCount = 0;
  ["fact_campaigns", "fact_time_series", "fact_devices", "fact_hourly",
   "fact_weekday", "fact_weekday_hour", "fact_keywords", "fact_search_terms",
   "fact_networks", "fact_demographics", "fact_crm"].forEach((table) => {
    if (Array.isArray(localDb[table])) localCount += localDb[table].length;
  });

  // Count remote rows (using count query)
  let remoteCount = 0;
  const tables = [
    "fact_campaigns", "fact_time_series", "fact_devices", "fact_hourly",
    "fact_weekday", "fact_weekday_hour", "fact_keywords", "fact_search_terms",
    "fact_networks", "fact_demographics", "fact_crm",
  ];

  const results = await Promise.allSettled(
    tables.map((table) =>
      supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
    )
  );

  results.forEach((r) => {
    if (r.status === "fulfilled" && r.value.count) {
      remoteCount += r.value.count;
    }
  });

  const drift = Math.abs(localCount - remoteCount);
  // Tolerance: within 5% or 10 rows (dedup may reduce count)
  const tolerance = Math.max(localCount * 0.05, 10);
  const ok = drift <= tolerance;

  return { ok, localCount, remoteCount, drift };
}

// ─── Resume Interrupted Migration ───────────────────────────────────────────

/**
 * Check if there was a migration that started but didn't complete.
 * Returns the import_job if found.
 */
export async function findInterruptedMigration(orgId) {
  if (!isSupabaseConfigured) return null;

  const { supabase } = await import("./supabase");
  const { data } = await supabase
    .from("import_jobs")
    .select("*")
    .eq("organization_id", orgId)
    .eq("status", "processing")
    .ilike("file_name", "migration_%")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data || null;
}

/**
 * Reset migration flag (for testing or re-running migration)
 */
export function resetMigrationFlag() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MIGRATION_FLAG);
}
