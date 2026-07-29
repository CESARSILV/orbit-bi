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
//      - localStorage: apenas preferências de UI
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
import { getDatabase, saveDatabase, insertDataset, createInitialDb, consolidateSummary } from "./db";
import { fetchMarketingDb, executeImport, clearOrganizationData, getOrganizationId, getCurrentUser, isDALReady, rebuildMarketingSummary } from "./supabase-dal";
import { getCachedDb, setCachedDb, loadWithSWR, invalidateDbCache, cacheOrgId, getCachedOrgId, stageImport, clearStagedImport, clearAllCache } from "./cache";

// ─── Hook principal ─────────────────────────────────────────────────────────

export function useMarketingData() {
  const [marketingDb, setMarketingDb] = useState(createInitialDb());
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
      } else {
        return { success: false, error: result.error };
      }
    } else {
      // ─── LOCAL MODE (legado) ──────────────────────────────────
      const result = await insertDataset(marketingDb, fileMeta, rows, action);
      const updatedDb = result.db || result;
      setMarketingDb(updatedDb);
      setDataSource("local");
      return { success: true, db: updatedDb, integrity: result.integrity };
    }
  }, [isSupabaseMode, orgId, userId, marketingDb]);

  // ─── Limpar dados ───────────────────────────────────────────────────────

  const clearData = useCallback(async () => {
    if (isSupabaseMode && orgId) {
      await clearOrganizationData(orgId);
      await invalidateDbCache();
      setMarketingDb(createInitialDb());
      setDataSource("supabase");
    } else {
      // Modo local: limpa localStorage
      const emptyDb = createInitialDb();
      saveDatabase(emptyDb);
      setMarketingDb(emptyDb);
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
      setIsLoading(false);
    } else {
      const localDb = getDatabase();
      setMarketingDb(localDb);
      setDataSource("local");
    }
  }, [isSupabaseMode, orgId]);

  // ─── Logout / troca de organização ──────────────────────────────────────

  const resetOnLogout = useCallback(async () => {
    await clearAllCache();
    setMarketingDb(createInitialDb());
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

    // Operações
    importData,
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
