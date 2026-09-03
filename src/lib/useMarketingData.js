// ============================================================
// useMarketingData.js — Hook de dados do marketing
// DOit BI | Marketing Analytics Platform
// ============================================================
//
// Este hook encapsula toda a lógica de carregamento e persistência
// de dados. Suporta dois modos:
//
//   1. SUPABASE MODE (isSupabaseConfigured + user autenticado + org):
//      - Fonte primária: Supabase PostgreSQL
//      - Cache: IndexedDB (stale-while-revalidate)
//      - localStorage: preferências de UI e ajustes manuais por dispositivo
//
//   2. LOCAL MODE (fallback — Supabase não configurado):
//      - Fonte primária: localStorage (comportamento legado)
//      - Mantém compatibilidade total com o sistema atual
//
// A interface para o page.js é IDÊNTICA em ambos os modos:
//   { marketingDb, setMarketingDb, isLoading, dataSource, orgId, ... }
// ============================================================

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { getDatabase, saveDatabase, insertDataset, createInitialDb } from "./db";
import { fetchMarketingDb, executeImport, clearOrganizationData, getOrganizationId, getCurrentUser, isDALReady } from "./supabase-dal";
import { getCachedDb, setCachedDb, loadWithSWR, invalidateDbCache, cacheOrgId, stageImport, clearStagedImport, clearAllCache } from "./cache";
import {
  createKpiOverrideRecord,
  removeKpiOverride as removeKpiOverrideFromList,
  upsertKpiOverride,
} from "./kpi-overrides";

const KPI_OVERRIDE_STORAGE_PREFIX = "doit-marketing-bi-kpi-overrides-v1";

function getKpiOverrideStorageKey(organizationId) {
  return `${KPI_OVERRIDE_STORAGE_PREFIX}:${organizationId || "local"}`;
}

function readScopedKpiOverrides(organizationId) {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(getKpiOverrideStorageKey(organizationId)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("[useMarketingData] Não foi possível ler os ajustes manuais:", error);
    return [];
  }
}

function writeScopedKpiOverrides(organizationId, overrides) {
  if (typeof window === "undefined") return false;

  try {
    localStorage.setItem(getKpiOverrideStorageKey(organizationId), JSON.stringify(overrides));
    return true;
  } catch (error) {
    console.error("[useMarketingData] Não foi possível salvar os ajustes manuais:", error);
    return false;
  }
}

function clearScopedKpiOverrides(organizationId) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getKpiOverrideStorageKey(organizationId));
  } catch (error) {
    console.warn("[useMarketingData] Não foi possível limpar os ajustes manuais:", error);
  }
}

// ─── Hook principal ─────────────────────────────────────────────────────────

export function useMarketingData() {
  const [marketingDb, setMarketingDb] = useState(createInitialDb());
  const [kpiOverrides, setKpiOverrides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState("none"); // "supabase" | "local" | "cache" | "none"
  const [orgId, setOrgId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isSupabaseMode, setIsSupabaseMode] = useState(false);
  const initialLoadDone = useRef(false);

  // ─── Inicialização ──────────────────────────────────────────────────────

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    async function init() {
      // Tenta modo Supabase
      if (isSupabaseConfigured && supabase) {
        try {
          const ready = await isDALReady();
          if (ready) {
            const org = await getOrganizationId();
            const user = await getCurrentUser();

            if (org && user) {
              setOrgId(org);
              setUserId(user.id);
              setIsSupabaseMode(true);
              setKpiOverrides(readScopedKpiOverrides(org));
              await cacheOrgId(org);

              // Stale-while-revalidate: mostra cache instantâneo, busca fresh em background
              await loadWithSWR(
                () => fetchMarketingDb(org),
                (staleData) => {
                  if (staleData) {
                    setMarketingDb(staleData);
                    setDataSource("cache");
                    setIsLoading(false);
                  }
                },
                (freshData) => {
                  if (freshData) {
                    setMarketingDb(freshData);
                    setDataSource("supabase");
                  }
                  setIsLoading(false);
                }
              );
              return;
            }
          }
        } catch (err) {
          console.warn("[useMarketingData] Supabase init failed, falling back to local:", err.message);
        }
      }

      // Fallback: modo local (localStorage legado)
      setIsSupabaseMode(false);
      const localDb = getDatabase();
      setMarketingDb(localDb);
      setKpiOverrides(localDb.kpi_overrides || []);
      setDataSource("local");
      setIsLoading(false);
    }

    init();
  }, []);

  // ─── Import de dados ────────────────────────────────────────────────────

  /**
   * Importar dados (compatível com ambos os modos)
   * Em modo Supabase: envia para o servidor com retry
   * Em modo local: usa insertDataset do db.js (comportamento atual)
   *
   * @param {object} fileMeta
   * @param {Array} rows
   * @param {string} action - "replace" | "merge" | "ignore"
   * @param {function} onProgress - Optional (0-100)
   * @returns {{ success: boolean, db?: object, integrity?: object, error?: string }}
   */
  const importData = useCallback(async (fileMeta, rows, action = "replace", onProgress) => {
    if (isSupabaseMode && orgId && userId) {
      // ─── SUPABASE MODE ────────────────────────────────────────
      // 1. Stage localmente para resiliência
      await stageImport(fileMeta.file_hash || fileMeta.raw_file_name, {
        fileMeta,
        rows,
        action,
      });

      // 2. Executar import no Supabase
      const result = await executeImport(orgId, userId, fileMeta, rows, action, onProgress);

      if (result.success) {
        // 3. Limpar staging
        await clearStagedImport(fileMeta.file_hash || fileMeta.raw_file_name);

        // 4. Recarregar dados frescos do Supabase
        const freshDb = await fetchMarketingDb(orgId);
        if (freshDb) {
          setMarketingDb(freshDb);
          await setCachedDb(freshDb);
          setDataSource("supabase");
        }

        return { success: true, db: freshDb, stats: result.stats };
      }
      return { success: false, error: result.error };
    }

    // ─── LOCAL MODE (legado) ──────────────────────────────────
    const result = await insertDataset(marketingDb, fileMeta, rows, action);
    const updatedDb = result.db || result;
    setMarketingDb(updatedDb);
    setKpiOverrides(updatedDb.kpi_overrides || []);
    setDataSource("local");
    return { success: true, db: updatedDb, integrity: result.integrity };
  }, [isSupabaseMode, orgId, userId, marketingDb]);

  // ─── Ajustes manuais de KPI ─────────────────────────────────────────────
  // São persistidos fora dos fatos importados e sempre vinculados ao escopo de filtros.
  // Em modo Supabase ficam no dispositivo atual até existir uma tabela sincronizada com RLS.

  const saveKpiOverride = useCallback(async (payload) => {
    try {
      const record = createKpiOverrideRecord(payload);
      const nextOverrides = upsertKpiOverride(kpiOverrides, record);

      if (isSupabaseMode) {
        if (!writeScopedKpiOverrides(orgId, nextOverrides)) {
          return { success: false, error: "Não foi possível salvar o ajuste neste navegador." };
        }
        setKpiOverrides(nextOverrides);
        return { success: true, override: record, storage: "device" };
      }

      const nextDb = { ...marketingDb, kpi_overrides: nextOverrides };
      saveDatabase(nextDb);
      setMarketingDb(nextDb);
      setKpiOverrides(nextOverrides);
      return { success: true, override: record, storage: "local" };
    } catch (error) {
      return { success: false, error: error.message || "Não foi possível salvar o ajuste." };
    }
  }, [isSupabaseMode, kpiOverrides, marketingDb, orgId]);

  const removeKpiOverride = useCallback(async (scopeKey, metric) => {
    const nextOverrides = removeKpiOverrideFromList(kpiOverrides, scopeKey, metric);

    if (isSupabaseMode) {
      if (!writeScopedKpiOverrides(orgId, nextOverrides)) {
        return { success: false, error: "Não foi possível restaurar o cálculo automático neste navegador." };
      }
      setKpiOverrides(nextOverrides);
      return { success: true, storage: "device" };
    }

    const nextDb = { ...marketingDb, kpi_overrides: nextOverrides };
    saveDatabase(nextDb);
    setMarketingDb(nextDb);
    setKpiOverrides(nextOverrides);
    return { success: true, storage: "local" };
  }, [isSupabaseMode, kpiOverrides, marketingDb, orgId]);

  const clearKpiOverrides = useCallback(() => {
    if (isSupabaseMode) {
      clearScopedKpiOverrides(orgId);
      setKpiOverrides([]);
      return { success: true, storage: "device" };
    }

    const nextDb = { ...marketingDb, kpi_overrides: [] };
    saveDatabase(nextDb);
    setMarketingDb(nextDb);
    setKpiOverrides([]);
    return { success: true, storage: "local" };
  }, [isSupabaseMode, marketingDb, orgId]);

  // ─── Limpar dados ───────────────────────────────────────────────────────

  const clearData = useCallback(async () => {
    if (isSupabaseMode && orgId) {
      await clearOrganizationData(orgId);
      await invalidateDbCache();
      clearScopedKpiOverrides(orgId);
      setMarketingDb(createInitialDb());
      setKpiOverrides([]);
      setDataSource("supabase");
    } else {
      // Modo local: limpa localStorage
      const emptyDb = createInitialDb();
      saveDatabase(emptyDb);
      setMarketingDb(emptyDb);
      setKpiOverrides([]);
      setDataSource("local");
    }
  }, [isSupabaseMode, orgId]);

  // ─── Refresh (forçar recarregar do Supabase) ───────────────────────────

  const refresh = useCallback(async () => {
    if (isSupabaseMode && orgId) {
      setIsLoading(true);
      const freshDb = await fetchMarketingDb(orgId);
      if (freshDb) {
        setMarketingDb(freshDb);
        await setCachedDb(freshDb);
        setDataSource("supabase");
      }
      setKpiOverrides(readScopedKpiOverrides(orgId));
      setIsLoading(false);
    } else {
      const localDb = getDatabase();
      setMarketingDb(localDb);
      setKpiOverrides(localDb.kpi_overrides || []);
      setDataSource("local");
    }
  }, [isSupabaseMode, orgId]);

  // ─── Logout / troca de organização ──────────────────────────────────────

  const resetOnLogout = useCallback(async () => {
    await clearAllCache();
    setMarketingDb(createInitialDb());
    setKpiOverrides([]);
    setOrgId(null);
    setUserId(null);
    setIsSupabaseMode(false);
    setDataSource("none");
  }, []);

  // ─── Interface pública ──────────────────────────────────────────────────

  return {
    // Estado dos dados (mesma interface que antes)
    marketingDb,
    setMarketingDb,
    kpiOverrides,

    // Operações
    importData,
    saveKpiOverride,
    removeKpiOverride,
    clearKpiOverrides,
    clearData,
    refresh,
    resetOnLogout,

    // Metadados
    isLoading,
    dataSource, // "supabase" | "local" | "cache" | "none"
    isSupabaseMode,
    orgId,
    userId,
  };
}
