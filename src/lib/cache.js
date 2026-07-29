// ============================================================
// cache.js — IndexedDB Cache Layer (stale-while-revalidate)
// DOit BI | Marketing Analytics Platform
// ============================================================
//
// Responsabilidades:
//   1. Cache local via IndexedDB (idb-keyval) — rápido, sem limites do localStorage
//   2. Staging temporário de importações (resiliência a interrupções)
//   3. Padrão stale-while-revalidate para UX instantânea
//   4. localStorage reservado APENAS para preferências de UI
//
// Regras:
//   - Dados de negócio NUNCA ficam em localStorage
//   - IndexedDB é CACHE — Supabase é a fonte de verdade
//   - Se IndexedDB falhar, o sistema continua (graceful degradation)
// ============================================================

import { get, set, del, clear, keys } from "idb-keyval";

// ─── Cache Keys ─────────────────────────────────────────────────────────────
const CACHE_PREFIX = "doit_cache_";
const KEYS = {
  marketingDb: `${CACHE_PREFIX}marketing_db`,
  lastSync: `${CACHE_PREFIX}last_sync`,
  importStaging: `${CACHE_PREFIX}import_staging`,
  orgId: `${CACHE_PREFIX}org_id`,
  userProfile: `${CACHE_PREFIX}user_profile`,
};

// Cache TTL: 5 minutes (data is usable but should be revalidated)
const CACHE_TTL_MS = 5 * 60 * 1000;

// ─── Core Cache Operations ──────────────────────────────────────────────────

/**
 * Get the cached marketing database
 * @returns {object|null} Cached db object or null if not cached/expired
 */
export async function getCachedDb() {
  try {
    const cached = await get(KEYS.marketingDb);
    if (!cached) return null;
    return cached.data || null;
  } catch (err) {
    console.warn("[Cache] getCachedDb failed:", err.message);
    return null;
  }
}

/**
 * Store marketing database in cache with timestamp
 * @param {object} db - The marketing database object
 */
export async function setCachedDb(db) {
  try {
    await set(KEYS.marketingDb, {
      data: db,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn("[Cache] setCachedDb failed:", err.message);
  }
}

/**
 * Check if cache is fresh (within TTL)
 * @returns {boolean}
 */
export async function isCacheFresh() {
  try {
    const cached = await get(KEYS.marketingDb);
    if (!cached || !cached.timestamp) return false;
    return (Date.now() - cached.timestamp) < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * Get the timestamp of last sync
 * @returns {number|null} Unix timestamp or null
 */
export async function getLastSyncTime() {
  try {
    return await get(KEYS.lastSync) || null;
  } catch {
    return null;
  }
}

/**
 * Update last sync timestamp
 */
export async function setLastSyncTime() {
  try {
    await set(KEYS.lastSync, Date.now());
  } catch (err) {
    console.warn("[Cache] setLastSyncTime failed:", err.message);
  }
}


// ─── Import Staging (resiliência) ───────────────────────────────────────────

/**
 * Stage import data locally before sending to Supabase.
 * Used for recovery if the connection is lost mid-import.
 *
 * @param {string} fileHash - Unique identifier for the import
 * @param {object} stagingData - { fileMeta, rows, progress }
 */
export async function stageImport(fileHash, stagingData) {
  try {
    const existing = await get(KEYS.importStaging) || {};
    existing[fileHash] = {
      ...stagingData,
      stagedAt: Date.now(),
    };
    await set(KEYS.importStaging, existing);
  } catch (err) {
    console.warn("[Cache] stageImport failed:", err.message);
  }
}

/**
 * Get all pending staged imports
 * @returns {object} Map of fileHash → stagingData
 */
export async function getStagedImports() {
  try {
    return await get(KEYS.importStaging) || {};
  } catch {
    return {};
  }
}

/**
 * Remove a staged import after successful upload
 * @param {string} fileHash
 */
export async function clearStagedImport(fileHash) {
  try {
    const existing = await get(KEYS.importStaging) || {};
    delete existing[fileHash];
    if (Object.keys(existing).length === 0) {
      await del(KEYS.importStaging);
    } else {
      await set(KEYS.importStaging, existing);
    }
  } catch (err) {
    console.warn("[Cache] clearStagedImport failed:", err.message);
  }
}

/**
 * Check if there are pending staged imports
 * @returns {boolean}
 */
export async function hasPendingStagedImports() {
  try {
    const staged = await get(KEYS.importStaging) || {};
    return Object.keys(staged).length > 0;
  } catch {
    return false;
  }
}

// ─── Organization & Profile Cache ───────────────────────────────────────────

/**
 * Cache the current organization ID
 */
export async function cacheOrgId(orgId) {
  try {
    await set(KEYS.orgId, orgId);
  } catch {}
}

/**
 * Get cached organization ID (for instant mount before Supabase responds)
 */
export async function getCachedOrgId() {
  try {
    return await get(KEYS.orgId) || null;
  } catch {
    return null;
  }
}

/**
 * Cache user profile data
 */
export async function cacheUserProfile(profile) {
  try {
    await set(KEYS.userProfile, profile);
  } catch {}
}

/**
 * Get cached user profile
 */
export async function getCachedUserProfile() {
  try {
    return await get(KEYS.userProfile) || null;
  } catch {
    return null;
  }
}


// ─── Cache Invalidation ─────────────────────────────────────────────────────

/**
 * Clear all cached data (used on logout or org switch)
 */
export async function clearAllCache() {
  try {
    await clear();
  } catch (err) {
    console.warn("[Cache] clearAllCache failed:", err.message);
  }
}

/**
 * Invalidate marketing data cache only (forces revalidation on next read)
 */
export async function invalidateDbCache() {
  try {
    await del(KEYS.marketingDb);
    await del(KEYS.lastSync);
  } catch (err) {
    console.warn("[Cache] invalidateDbCache failed:", err.message);
  }
}

// ─── Stale-While-Revalidate Pattern ─────────────────────────────────────────

/**
 * Load data with stale-while-revalidate pattern:
 * 1. Return cached data immediately (if exists)
 * 2. Fetch fresh data from Supabase in background
 * 3. Update cache and call onFresh with new data
 *
 * @param {function} fetchFn - Async function that fetches fresh data from Supabase
 * @param {function} onStale - Called immediately with cached data (may be null)
 * @param {function} onFresh - Called when fresh data arrives from server
 * @returns {Promise<void>}
 */
export async function loadWithSWR(fetchFn, onStale, onFresh) {
  // 1. Return stale data immediately
  const cached = await getCachedDb();
  if (cached) {
    onStale(cached);
  }

  // 2. Fetch fresh data
  try {
    const fresh = await fetchFn();
    if (fresh) {
      // 3. Update cache
      await setCachedDb(fresh);
      await setLastSyncTime();
      // 4. Notify caller with fresh data
      onFresh(fresh);
    } else if (!cached) {
      // No cached data and no fresh data — return empty
      onFresh(null);
    }
  } catch (err) {
    console.error("[Cache] SWR fetch failed:", err.message);
    // If we already returned stale data, the UI is still usable
    // If no cached data exists, notify with null
    if (!cached) {
      onFresh(null);
    }
  }
}

// ─── localStorage — ONLY for UI preferences ─────────────────────────────────
// These are the ONLY keys allowed in localStorage going forward.

const LS_ALLOWED_KEYS = {
  theme: "doit-theme",
  sidebarCollapsed: "doit-sidebar-collapsed",
  recentFilters: "doit-recent-filters",
  reportPrefs: "doit-report-prefs",
};

/**
 * Get a UI preference from localStorage
 */
export function getPreference(key) {
  if (typeof window === "undefined") return null;
  const lsKey = LS_ALLOWED_KEYS[key];
  if (!lsKey) return null;
  try {
    return localStorage.getItem(lsKey);
  } catch {
    return null;
  }
}

/**
 * Set a UI preference in localStorage
 */
export function setPreference(key, value) {
  if (typeof window === "undefined") return;
  const lsKey = LS_ALLOWED_KEYS[key];
  if (!lsKey) return;
  try {
    localStorage.setItem(lsKey, value);
  } catch {}
}

/**
 * Get the list of allowed localStorage keys (for migration cleanup)
 */
export function getAllowedLocalStorageKeys() {
  return Object.values(LS_ALLOWED_KEYS);
}
