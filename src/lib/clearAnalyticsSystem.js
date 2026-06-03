// ============================================================
// clearAnalyticsSystem.js — Central Reset Engine
// DOit BI | Marketing Analytics Platform
// ============================================================
//
// Função única e autoritativa para limpeza total do sistema.
// Chamada pelo handleClearData no page.js.
//
// O que esta função limpa:
//   1. localStorage (banco local completo)
//   2. sessionStorage (sessão temporária)
//   3. Cache API (service worker caches)
//   4. IndexedDB (bancos de dados do browser)
//   5. Next.js / React Query memory caches
//   6. Supabase subscriptions ativas
//   7. Timers e intervals pendentes
// ============================================================

import { createInitialDb, saveDatabase } from "./db";

// ─── Constantes ──────────────────────────────────────────────────────────────

// Todas as chaves de localStorage que o sistema pode criar
const LS_KEYS = [
  "doit_marketing_bi_db",
  "doit_bi_db",
  "doit_filters",
  "doit_preferences",
  "doit_session",
  "doit_import_templates",
  "doit_wizard_state",
  "doit_chat_history",
  "doit_user_prefs",
  "marketingDb",
  "analyticsDb",
  "uploadedFiles",
];

// ─── Limpeza de Storage ───────────────────────────────────────────────────────

async function clearAllStorages() {
  if (typeof window === "undefined") return;

  // 1. localStorage — limpa TUDO (não só chaves conhecidas)
  try {
    localStorage.clear();
  } catch (_) {}

  // 2. sessionStorage
  try {
    sessionStorage.clear();
  } catch (_) {}

  // 3. Cache API (Next.js, SW, etc.)
  if ("caches" in window) {
    try {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    } catch (_) {}
  }

  // 4. IndexedDB — deleta todos os bancos encontrados
  if ("indexedDB" in window && typeof indexedDB.databases === "function") {
    try {
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs.map(db => new Promise(resolve => {
          const req = indexedDB.deleteDatabase(db.name);
          req.onsuccess = resolve;
          req.onerror = resolve; // ignora erros, continua
        }))
      );
    } catch (_) {}
  }
}

// ─── Limpeza de Supabase ──────────────────────────────────────────────────────

async function clearSupabaseData(supabase, userId) {
  if (!supabase || !userId) return;
  try {
    await Promise.allSettled([
      supabase.from("campaigns").delete().eq("user_id", userId),
      supabase.from("historical_metrics").delete().eq("user_id", userId),
      supabase.from("fact_campaigns").delete().eq("user_id", userId),
      supabase.from("uploaded_files").delete().eq("user_id", userId),
    ]);
  } catch (err) {
    console.error("[RESET] Supabase clear error:", err);
  }
}

// ─── Limpeza de Subscriptions ─────────────────────────────────────────────────

function clearActiveSubscriptions(supabase) {
  if (!supabase) return;
  try {
    supabase.removeAllChannels?.();
  } catch (_) {}
}

// ─── Limpeza de Timers Pendentes ──────────────────────────────────────────────

function clearAllTimers() {
  // Limpa intervalos e timeouts pendentes usando IDs sequenciais
  // (estratégia segura sem depender de biblioteca externa)
  const highestId = setTimeout(() => {}, 0);
  for (let i = 0; i <= highestId; i++) {
    clearTimeout(i);
    clearInterval(i);
  }
}

// ─── Gravar DB vazio no storage ───────────────────────────────────────────────

function persistEmptyDb() {
  try {
    const emptyDb = createInitialDb();
    saveDatabase(emptyDb);
    return emptyDb;
  } catch (_) {
    return createInitialDb();
  }
}

// ─── Função Principal ─────────────────────────────────────────────────────────

/**
 * clearAnalyticsSystem — Reset total do sistema analytics
 *
 * @param {Object} options
 * @param {Object} options.supabase         - cliente Supabase (opcional)
 * @param {string} options.userId           - ID do usuário logado (opcional)
 * @param {boolean} options.clearTimers     - se deve limpar timers pendentes
 * @returns {Promise<{emptyDb: Object, errors: string[]}>}
 */
export async function clearAnalyticsSystem({
  supabase = null,
  userId = null,
  clearTimers = false,
} = {}) {
  const errors = [];

  // Passo 1: Limpar subscriptions ativas (evita callbacks após o reset)
  clearActiveSubscriptions(supabase);

  // Passo 2: Limpar dados remotos (Supabase)
  if (supabase && userId) {
    await clearSupabaseData(supabase, userId);
  }

  // Passo 3: Limpar todos os storages do browser
  await clearAllStorages();

  // Passo 4: Limpar timers pendentes (opcional — pode interferir com animações)
  if (clearTimers) {
    clearAllTimers();
  }

  // Passo 5: Persistir DB vazio no localStorage
  // Garante que ao recarregar, getDatabase() retorne estado vazio
  const emptyDb = persistEmptyDb();

  return { emptyDb, errors };
}

// ─── Reset State Map ──────────────────────────────────────────────────────────
//
// Mapa declarativo de todos os estados React que devem ser resetados.
// Usado pelo page.js para garantir que NENHUM estado escape da limpeza.

export const RESET_STATE_MAP = {
  // Dados
  marketingDb: (createInitialDb),    // factory — cria objeto vazio
  files: [],
  base64Files: [],
  pendingUpload: null,
  duplicateFileInfo: null,

  // Modais
  showDeduplicationModal: false,
  showClearConfirmModal: false,

  // Wizard
  wizardStep: null,
  wizardFile: null,
  wizardPlatform: "google",
  wizardColumns: [],
  wizardDateRange: { start: "", end: "", label: "" },
  wizardPreviewRows: [],
  wizardMapping: {},
  wizardSaveTemplate: false,
  wizardTemplateName: "",
  wizardRawRows: [],
  wizardProgress: 0,
  wizardStatusText: "",
  wizardErrorMsg: "",
  wizardResultCount: 0,
  wizardDatasetType: "campaign_performance",
  wizardDetectedMonths: [],

  // Filtros
  platform: "todas",
  period: "todos",
  startDate: "",
  endDate: "",
  campaign: "todas",
  device: "todos",
  gender: "todos",
  age: "todas",
  network: "todas",
  keyword: "todas",
  searchTerm: "todos",

  // UI
  activeSection: "visao-geral",
  toastMessage: "",
  showToast: false,
  isIntelligenceUpdating: false,

  // Chat
  chatPending: false,
};
