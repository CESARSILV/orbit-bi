import { supabase, isSupabaseConfigured } from "./supabase";
import { buildRowKey, validateImportIntegrity, detectDuplicateRows } from "./data-validator";

// ----------------------------------------------------
// DB Initial State & Schema Definitions
// ----------------------------------------------------

export const INITIAL_DB = {
  fact_campaigns: [],
  fact_devices: [],
  fact_hourly: [],
  fact_weekday: [],
  fact_weekday_hour: [],
  fact_keywords: [],
  fact_search_terms: [],
  fact_networks: [],
  fact_demographics: [],
  fact_time_series: [],
  fact_conversions: [],
  fact_crm: [],
  fact_marketing_summary: [],
  uploaded_files: []
};

export function createInitialDb() {
  return {
    fact_campaigns: [],
    fact_devices: [],
    fact_hourly: [],
    fact_weekday: [],
    fact_weekday_hour: [],
    fact_keywords: [],
    fact_search_terms: [],
    fact_networks: [],
    fact_demographics: [],
    fact_time_series: [],
    fact_conversions: [],
    fact_crm: [],
    fact_marketing_summary: [],
    uploaded_files: []
  };
}

const STORAGE_KEY = "doit_marketing_bi_db";

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
  crm_leads: "fact_crm"
};

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const MONTH_MAP_PT = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
  janeiro: 0, fevereiro: 1, marco: 2, março: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
};

export function getRowReferenceMonth(r) {
  if (!r) return "";
  
  const parseLegacyRef = (ref) => {
    const s = String(ref).trim().toLowerCase();
    if (/^\d{4}-\d{2}$/.test(s)) return s;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 7);
    if (s.includes("/")) {
      const parts = s.split("/");
      if (parts.length === 2) {
        const p0 = parts[0].trim();
        const p1 = parts[1].trim();
        if (p1.length === 4) {
          const year = p1;
          let month = "";
          if (/^\d+$/.test(p0)) {
            month = p0.padStart(2, "0");
          } else {
            const mIdx = MONTH_MAP_PT[p0];
            if (mIdx !== undefined) month = String(mIdx + 1).padStart(2, "0");
          }
          if (month) return `${year}-${month}`;
        }
      }
    }
    for (const [key, val] of Object.entries(MONTH_MAP_PT)) {
      if (s.includes(key)) {
        const yearMatch = s.match(/\d{4}/);
        const year = yearMatch ? yearMatch[0] : new Date().getFullYear();
        return `${year}-${String(val + 1).padStart(2, "0")}`;
      }
    }
    return "";
  };

  if (r.reference_month) {
    const parsed = parseLegacyRef(r.reference_month);
    if (parsed) return parsed;
  }
  
  if (r.date) {
    if (r.date instanceof Date) {
      const y = r.date.getFullYear();
      const m = String(r.date.getMonth() + 1).padStart(2, "0");
      return `${y}-${m}`;
    }
    const d = String(r.date).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(d)) return d;
    // Handle DD/MM/YYYY or DD-MM-YYYY
    const brMatch = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (brMatch) {
      const monthPad = String(brMatch[2]).padStart(2, "0");
      return `${brMatch[3]}-${monthPad}`;
    }
    const parsed = parseLegacyRef(d);
    if (parsed) return parsed;
  }
  return "";
}

export function getRowDatasetType(r, tableName) {
  if (r.dataset_type) return r.dataset_type;
  
  if (tableName === "fact_campaigns") {
    if (r.platform === "google") return "campaign_performance";
    if (r.platform === "meta") {
      if (r.ad_name || r.ad_id) return "meta_ad_performance";
      if (r.adset_name || r.adset_id) return "meta_adset_performance";
      return "meta_campaign_performance";
    }
    return "campaign_performance";
  }
  
  const invMap = {
    fact_devices: "device_performance",
    fact_hourly: "hourly_performance",
    fact_weekday: "weekday_performance",
    fact_weekday_hour: "weekday_hour_performance",
    fact_keywords: "search_keywords",
    fact_search_terms: "search_terms",
    fact_networks: "network_performance",
    fact_demographics: "demographics_gender_age",
    fact_time_series: "daily_time_series"
  };
  
  return invMap[tableName] || "campaign_performance";
}

// ----------------------------------------------------
// Core Database CRUD Functions
// ----------------------------------------------------

export function getDatabase() {
  if (typeof window === "undefined") return createInitialDb();
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return createInitialDb();
    const parsed = JSON.parse(data);
    
    // Ensure all tables exist in the parsed object
    const db = { ...createInitialDb(), ...parsed };

    // ----------------------------------------------------------------
    // AUTO-DEDUPLICATION & AUTO-CLEAN — roda em cada carregamento.
    // Corrige duplicatas causadas por múltiplas importações do mesmo arquivo.
    //
    // ⚠️  REGRA DE SEGURANÇA: só remove se tiver CERTEZA ABSOLUTA de duplicata.
    //     Falso positivo aqui destrói dados reais do usuário.
    // ----------------------------------------------------------------

    let needsSave = false;

    // Normalização preventiva de dados históricos / legado (corrige "Outubro/2025" -> "2025-10" nos registros locais)
    const normalizeLegacyRows = (table) => {
      if (!db[table] || !Array.isArray(db[table])) return;
      db[table].forEach(r => {
        const standardMonth = getRowReferenceMonth(r);
        if (standardMonth && r.reference_month !== standardMonth) {
          r.reference_month = standardMonth;
          needsSave = true;
        }
      });
    };
    
    // Rodar normalização preventiva para as tabelas principais
    ["fact_campaigns", "fact_time_series", "fact_devices", "fact_keywords", "fact_search_terms", "fact_networks", "fact_demographics"].forEach(normalizeLegacyRows);

    const isDashOnly = (name) => !name || /^[-–—\s]+$/.test(String(name).trim());

    if (db.fact_campaigns && db.fact_campaigns.length > 0) {
      const before = db.fact_campaigns.length;

      // PASSO 1: Remove linhas de total com campaign_name = "--" ou similar
      db.fact_campaigns = db.fact_campaigns.filter(r => !isDashOnly(r.campaign_name));

      // PASSO 2: Dedup estrita — usa buildRowKey centralizado (normaliza data para YYYY-MM)
      // Evita falsos positivos causados por formatos de data diferentes (2025-10-01 vs 2025-10)
      const seenStrict = new Set();
      db.fact_campaigns = db.fact_campaigns.filter(r => {
        const key = buildRowKey(r);
        if (seenStrict.has(key)) return false;
        seenStrict.add(key);
        return true;
      });

      // PASSO 3: Dedup de double-import — VERSÃO SEGURA
      //
      // Problema: usuário importa o mesmo arquivo 2x.
      // Ambas as linhas passam pelo PASSO 2 porque têm datas levemente
      // diferentes (ex: "2025-10-01" vs "2025-10"), escapando da dedup estrita.
      //
      // Solução SEGURA: agrupa por (platform + tipo + mês + campanha + adset + ad).
      // Remove duplicata SOMENTE se:
      //   - O grupo tem EXATAMENTE 2 linhas (par suspeito)
      //   - O spend das duas é IDÊNTICO (±R$0.01)
      //   - Os clicks das duas são IDÊNTICOS (±1 click)
      //   - As impressões das duas são IDÊNTICAS (±10 impressões)
      //
      // Isso exige 3 métricas coincidentes — extremamente improvável em dados legítimos.
      // ⚠️ NUNCA aplica se grupo tem 3+ linhas (dados diários Meta/Google com muitas linhas/mês)
      //
      // IMPORTANTE: usa referências de objeto (não índices numéricos) para evitar
      // o bug de índice stale que corrompia dados no PASSO 3 anterior.
      const monthGroups = new Map();
      db.fact_campaigns.forEach(r => {
        const isSegmented = r.device || r.keyword || r.search_term || r.gender || r.age_range || r.hour;
        if (isSegmented) return; // segmentadas: não participam do grupo
        const key = [
          r.platform || "",
          getRowDatasetType(r, "fact_campaigns"),
          getRowReferenceMonth(r),
          r.campaign_name || "",
          r.adset_name   || "",
          r.ad_name      || "",
        ].join("|");
        if (!monthGroups.has(key)) monthGroups.set(key, []);
        monthGroups.get(key).push(r);
      });

      // Usa Set de referências de objeto para remoção segura (sem dependência de índice)
      const rowsToRemove = new Set();
      monthGroups.forEach(group => {
        if (group.length !== 2) return; // só trata pares — 3+ linhas = dados diários, não toca
        const [a, b] = group;
        const spendMatch  = Math.abs((a.spend  || 0) - (b.spend  || 0)) < 0.02;
        const clicksMatch = Math.abs((a.clicks || 0) - (b.clicks || 0)) <= 1;
        const imprMatch   = Math.abs((a.impressions || 0) - (b.impressions || 0)) <= 10;

        // Exige as 3 métricas coincidentes para ter certeza que é double-import
        if (spendMatch && clicksMatch && imprMatch) {
          rowsToRemove.add(b); // remove a segunda (mantém a primeira)
          console.warn(`[DB] Dedup double-import: par idêntico removido (spend=${a.spend}, clicks=${a.clicks})`);
        }
      });

      if (rowsToRemove.size > 0) {
        db.fact_campaigns = db.fact_campaigns.filter(r => !rowsToRemove.has(r));
      }

      const after = db.fact_campaigns.length;
      if (before !== after) {
        console.warn(`[DB] AUTO-CLEAN fact_campaigns: ${before} → ${after} registros (removidos ${before - after}).`);
        needsSave = true;
      }
    }

    // Limpa duplicatas de fact_time_series usando buildRowKey
    if (db.fact_time_series && db.fact_time_series.length > 0) {
      const before = db.fact_time_series.length;
      const seen = new Set();
      db.fact_time_series = db.fact_time_series.filter(r => {
        const key = buildRowKey(r);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const after = db.fact_time_series.length;
      if (before !== after) {
        console.warn(`[DB] AUTO-CLEAN fact_time_series: ${before} → ${after} registros.`);
        needsSave = true;
      }
    }

    // SEMPRE reconstrói fact_marketing_summary a partir das tabelas raw.
    // Isso garante que o summary nunca fique desatualizado após dedup.
    const rebuilt = consolidateSummary(db);

    // Só grava de volta se houve dedup real (não apenas mudança de summary).
    // Isso evita o "repair loop" onde cada reload salvava e alterava os dados.
    if (needsSave) {
      saveDatabase(rebuilt);
      return rebuilt;
    }

    // Se o summary mudou mas não houve dedup, devolve sem gravar
    // (evita sobrescrever o localStorage a cada leitura)
    return rebuilt;
  } catch (err) {
    console.error("Failed to load local database, resetting:", err);
    return createInitialDb();
  }
}


export function saveDatabase(db) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error("Failed to save local database:", err);
  }
}

// ----------------------------------------------------
// Deduplication Engine
// ----------------------------------------------------

export function checkFileDuplicate(db, fileMeta) {
  // Checks duplicate based on raw_file_name or file_hash
  return db.uploaded_files.find(
    f => f.file_hash === fileMeta.file_hash || f.raw_file_name === fileMeta.raw_file_name
  );
}

export async function insertDataset(db, fileMeta, rows, action = "replace") {
  // Deep copy / clone the db to prevent mutating the imported INITIAL_DB reference
  const newDb = {
    ...db,
    fact_campaigns: [...(db.fact_campaigns || [])],
    fact_devices: [...(db.fact_devices || [])],
    fact_hourly: [...(db.fact_hourly || [])],
    fact_weekday: [...(db.fact_weekday || [])],
    fact_weekday_hour: [...(db.fact_weekday_hour || [])],
    fact_keywords: [...(db.fact_keywords || [])],
    fact_search_terms: [...(db.fact_search_terms || [])],
    fact_networks: [...(db.fact_networks || [])],
    fact_demographics: [...(db.fact_demographics || [])],
    fact_time_series: [...(db.fact_time_series || [])],
    fact_conversions: [...(db.fact_conversions || [])],
    fact_crm: [...(db.fact_crm || [])],
    fact_marketing_summary: [...(db.fact_marketing_summary || [])],
    uploaded_files: [...(db.uploaded_files || [])]
  };

  const targetTable = DATASET_TABLE_MAP[fileMeta.dataset_type] || "fact_campaigns";
  
  // Make sure we have array instances
  if (!newDb[targetTable]) newDb[targetTable] = [];
  if (!newDb.uploaded_files) newDb.uploaded_files = [];

  const platform = fileMeta.platform;
  const dataset_type = fileMeta.dataset_type;
  const reference_month = fileMeta.reference_month;

  // MONTH-LEVEL & DATASET-TYPE CLEAR:
  // Em vez de apagar todos os dados históricos de uma plataforma inteira,
  // limpamos apenas os registros existentes para o mesmo mês de referência,
  // plataforma e tipo de dado. Isso garante idempotência e mantém o histórico de outros meses.
  if (platform && action === "replace") {
    // Detecta todos os meses de referência presentes nos dados importados para limpar apenas os meses afetados
    const monthsInRows = new Set(rows.map(r => getRowReferenceMonth(r)).filter(Boolean));
    if (monthsInRows.size === 0 && reference_month) {
      monthsInRows.add(reference_month);
    }

    console.log(`[DB] MONTH-LEVEL CLEAR: removendo dados de '${platform}' (${targetTable}) para os meses [${Array.from(monthsInRows).join(", ")}] e tipo '${dataset_type}' antes de inserir novo arquivo.`);
    
    newDb[targetTable] = (newDb[targetTable] || []).filter(
      r => !(
        r.platform === platform &&
        getRowDatasetType(r, targetTable) === dataset_type &&
        monthsInRows.has(getRowReferenceMonth(r))
      )
    );
    
    newDb.uploaded_files = (newDb.uploaded_files || []).filter(
      f => !(
        f.platform === platform &&
        f.dataset_type === dataset_type &&
        monthsInRows.has(getRowReferenceMonth(f))
      )
    );
  } else if (action === "ignore") {
    return newDb;
  }

  // 2. Append new rows
  if (action === "merge") {
    // Para merge: filtra rows que têm chave idêntica usando buildRowKey
    const existingKeys = new Set(newDb[targetTable].map(r => buildRowKey(r)));
    const uniqueNewRows = rows.filter(r => !existingKeys.has(buildRowKey(r)));
    newDb[targetTable] = [...newDb[targetTable], ...uniqueNewRows];
  } else {
    // Replace: adiciona todas as rows novas (a limpeza prévia já garantiu idempotência)
    newDb[targetTable] = [...newDb[targetTable], ...rows];
  }

  // 3. Log the file
  newDb.uploaded_files.push({
    ...fileMeta,
    created_at: new Date().toISOString()
  });

  // 4. Consolidate summary table
  const updatedDb = consolidateSummary(newDb);

  // 5. Save database locally
  saveDatabase(updatedDb);

  // 6. Validação de integridade pós-importação
  // Compara o total do arquivo (calculado no ETL) com o total consolidado no banco.
  const integrityResult = validateImportIntegrity(fileMeta, updatedDb);
  if (!integrityResult.ok && !integrityResult.skipped) {
    console.warn(`[DB] INTEGRITY CHECK FAILED: ${integrityResult.message}`);
  } else if (!integrityResult.skipped) {
    console.log(`[DB] INTEGRITY CHECK OK: ${integrityResult.message}`);
  }

  // 7. Optional Supabase Sync
  if (isSupabaseConfigured && supabase) {
    try {
      await syncWithSupabase(updatedDb);
    } catch (e) {
      console.error("Failed to sync database to Supabase:", e);
    }
  }

  return { db: updatedDb, integrity: integrityResult };
}

// ----------------------------------------------------
// Aggregation & Consolidation Engine
// ----------------------------------------------------

export function consolidateSummary(db) {
  // Consolidates campaign metrics from fact_campaigns and fact_time_series to feed the dashboard
  // Grouped by day, week, month, quarter, year, campaign, platform
  
  // Clear and rebuild summary
  const summary = [];

  // Group by campaign name, date, platform
  const groups = {};

  // 1. Group fact_campaigns by platform and reference_month to determine the best dataset_type for each
  const platformMonthDatasets = {}; // platform_month -> Set of dataset_types
  if (db.fact_campaigns && db.fact_campaigns.length > 0) {
    db.fact_campaigns.forEach(r => {
      const pmKey = `${r.platform || ""}_${getRowReferenceMonth(r)}`;
      if (!platformMonthDatasets[pmKey]) {
        platformMonthDatasets[pmKey] = new Set();
      }
      const type = getRowDatasetType(r, "fact_campaigns");
      if (type) {
        platformMonthDatasets[pmKey].add(type);
      }
    });
  }

  // 2. Determine the authoritative dataset_type for each platform_month
  const authoritativeDataset = {}; // platform_month -> dataset_type
  for (const [pmKey, datasetTypes] of Object.entries(platformMonthDatasets)) {
    const isMeta = pmKey.startsWith("meta_");
    const typesArray = Array.from(datasetTypes);
    
    let chosen = typesArray[0] || "";
    if (isMeta) {
      // Preference: meta_campaign_performance > meta_adset_performance > meta_ad_performance > campaign_performance
      if (datasetTypes.has("meta_campaign_performance")) {
        chosen = "meta_campaign_performance";
      } else if (datasetTypes.has("meta_adset_performance")) {
        chosen = "meta_adset_performance";
      } else if (datasetTypes.has("meta_ad_performance")) {
        chosen = "meta_ad_performance";
      } else if (datasetTypes.has("campaign_performance")) {
        chosen = "campaign_performance";
      }
    } else {
      // Google preference: campaign_performance > others
      if (datasetTypes.has("campaign_performance")) {
        chosen = "campaign_performance";
      }
    }
    authoritativeDataset[pmKey] = chosen;
  }

  // Track which campaign + month + platform has daily time series data
  const hasDailyData = new Set();
  if (db.fact_time_series && db.fact_time_series.length > 0) {
    db.fact_time_series.forEach(r => {
      const refMonth = getRowReferenceMonth(r);
      if (r.platform && refMonth && r.campaign_name) {
        hasDailyData.add(`${r.platform}_${refMonth}_${r.campaign_name}`);
      }
    });
  }

  // Track which campaign + month + platform has campaign data
  // (usado pelo addRowToGroups para priorizar fact_campaigns sobre fact_time_series)
  const hasCampaignData = new Set();
  if (db.fact_campaigns && db.fact_campaigns.length > 0) {
    db.fact_campaigns.forEach(r => {
      const refMonth = getRowReferenceMonth(r);
      const pmKey = `${r.platform || ""}_${refMonth}`;
      const type = getRowDatasetType(r, "fact_campaigns");
      
      // Only track campaign data if it matches the authoritative dataset type
      const authType = authoritativeDataset[pmKey];
      if (authType && type !== authType) {
        return; // Skip non-authoritative types
      }
      
      if (r.platform && refMonth && r.campaign_name) {
        hasCampaignData.add(`${r.platform}_${refMonth}_${r.campaign_name}`);
      }
    });
  }

  // Gather campaign level items (from fact_campaigns and fact_time_series)
  const addRowToGroups = (r, isCampaignTable = false) => {
    const refMonth = getRowReferenceMonth(r);
    const pmKey = `${r.platform || ""}_${refMonth}`;

    // For campaign table rows, only include the authoritative dataset_type for that platform and month
    if (isCampaignTable) {
      const type = getRowDatasetType(r, "fact_campaigns");
      const authType = authoritativeDataset[pmKey];
      if (authType && type !== authType) {
        return; // skip non-authoritative level (e.g. skip adsets if campaigns exist, avoiding double counting)
      }
    }

    // PRIORIDADE CORRIGIDA: fact_campaigns SEMPRE tem prioridade sobre fact_time_series.
    if (!isCampaignTable && r.platform && refMonth && r.campaign_name) {
      if (hasCampaignData.has(`${r.platform}_${refMonth}_${r.campaign_name}`)) {
        return; // fact_campaigns é a fonte authoritária — ignora a série temporal
      }
    }

    const key = `${r.platform}_${refMonth}_${r.campaign_name}_${r.date || refMonth}`;
    if (!groups[key]) {
      groups[key] = {
        platform: r.platform,
        campaign_name: r.campaign_name,
        date: r.date || `${refMonth}-01`,
        day: r.day || 1,
        week: r.week || 1,
        month: r.month || (refMonth ? parseInt(refMonth.split("-")[1], 10) : 1),
        month_name: r.month_name || (refMonth ? MONTHS_PT[parseInt(refMonth.split("-")[1], 10) - 1] : ""),
        quarter: r.quarter || (refMonth ? `Q${Math.ceil(parseInt(refMonth.split("-")[1], 10) / 3)}` : "Q1"),
        year: r.year || (refMonth ? parseInt(refMonth.split("-")[0], 10) : new Date().getFullYear()),
        year_month: r.year_month || refMonth,
        reference_month: refMonth,
        reference_label: r.reference_label || (refMonth ? `${MONTHS_PT[parseInt(refMonth.split("-")[1], 10) - 1]}/${refMonth.split("-")[0]}` : ""),
        spend: 0,
        clicks: 0,
        impressions: 0,
        conversions: 0,
        leads: 0,
        reach: 0,
        revenue: 0,
        status: r.status || "Ativo"
      };
    }

    const g = groups[key];
    g.spend += r.spend || 0;
    g.clicks += r.clicks || 0;
    g.impressions += r.impressions || 0;
    g.conversions += r.conversions || 0;
    g.leads += r.leads || 0;
    g.reach += r.reach || 0;
    g.revenue += r.revenue || 0;
  };

  // 1º: processa fact_campaigns (fonte primária — relatórios mensais/diários de campanhas)
  if (db.fact_campaigns && db.fact_campaigns.length > 0) {
    db.fact_campaigns.forEach(r => addRowToGroups(r, true));
  }

  // 2º: processa fact_time_series (fonte secundária — só preenche onde não há dado de campanha)
  if (db.fact_time_series && db.fact_time_series.length > 0) {
    db.fact_time_series.forEach(r => addRowToGroups(r, false));
  }

  // 3º: processa fact_crm (anexa conversões reais / demonstrações aos grupos existentes de anúncios)
  if (db.fact_crm && db.fact_crm.length > 0) {
    db.fact_crm.forEach(r => {
      // Tenta descobrir a plataforma pela fonte/utm source
      let sourceStr = ((r.lead_source || "") + " " + (r.lead_medium || "")).toLowerCase();
      let detectedPlatform = "unknown";
      if (sourceStr.includes("google") || sourceStr.includes("gads") || sourceStr.includes("adwords")) {
        detectedPlatform = "google";
      } else if (sourceStr.includes("meta") || sourceStr.includes("facebook") || sourceStr.includes("instagram") || sourceStr.includes("ig")) {
        detectedPlatform = "meta";
      } else {
        return; // Só contabiliza se conseguirmos atribuir a google ou meta
      }

      const refMonth = getRowReferenceMonth(r) || r.reference_month || (r.date && String(r.date).slice(0, 7));
      if (!refMonth) return;

      const campaignMatch = r.lead_campaign || "--"; // Agrupa no "--" se não souber a campanha
      
      const key = `${detectedPlatform}_${refMonth}_${campaignMatch}_${refMonth}`;

      // Se o grupo ainda não existir para esse mês/plataforma/campanha, a gente pode criar ou apenas anexar
      if (!groups[key]) {
        groups[key] = {
          platform: detectedPlatform,
          campaign_name: campaignMatch,
          date: `${refMonth}-01`,
          day: 1, week: 1, month: parseInt(refMonth.split("-")[1], 10),
          month_name: MONTHS_PT[parseInt(refMonth.split("-")[1], 10) - 1],
          quarter: `Q${Math.ceil(parseInt(refMonth.split("-")[1], 10) / 3)}`,
          year: parseInt(refMonth.split("-")[0], 10),
          year_month: refMonth,
          reference_month: refMonth,
          reference_label: `${MONTHS_PT[parseInt(refMonth.split("-")[1], 10) - 1]}/${refMonth.split("-")[0]}`,
          spend: 0, clicks: 0, impressions: 0, conversions: 0, leads: 0, reach: 0, revenue: 0, status: "CRM Data"
        };
      }

      groups[key].leads += 1;
      
      // Verifica se é qualificado / demonstração (baseado na coluna etapa)
      const statusStr = (r.lead_status || "").toLowerCase();
      if (statusStr.includes("convertido") || statusStr.includes("demonstração") || statusStr.includes("demonstracao") || statusStr.includes("qualificado") || statusStr.includes("ganho") || statusStr.includes("efetivad")) {
        groups[key].conversions += 1;
      }
    });
  }

  // ATENÇÃO: fact_devices, fact_networks e fact_demographics NÃO contribuem para
  // fact_marketing_summary. Eles são sub-cortes do mesmo investimento e só alimentam
  // gráficos de distribuição específicos (DeviceChart, RegionalMap, etc.).
  // Incluir segmentos aqui causaria double-counting do investimento total.

  // Recalculate ratios and build final summary rows
  for (const g of Object.values(groups)) {
    g.ctr = g.impressions > 0 ? g.clicks / g.impressions : 0;
    g.cpc = g.clicks > 0 ? g.spend / g.clicks : 0;
    g.cpm = g.impressions > 0 ? (g.spend / g.impressions) * 1000 : 0;
    g.cpl = g.leads > 0 ? g.spend / g.leads : 0;
    g.cac = g.conversions > 0 ? g.spend / g.conversions : 0;
    g.roas = g.spend > 0 ? g.revenue / g.spend : 0;

    summary.push(g);
  }

  // AUTO-DERIVE fact_devices: apenas se fact_devices estiver vazio e fact_campaigns tiver device.
  // IMPORTANTE: fact_devices é usado SOMENTE em gráficos de distribuição (DeviceChart).
  // Ele NUNCA contribui para o fact_marketing_summary para evitar double-counting de investimento.
  let derivedDevices = db.fact_devices || [];
  if (derivedDevices.length === 0 && db.fact_campaigns && db.fact_campaigns.length > 0) {
    const deviceRows = db.fact_campaigns.filter(r => r.device && String(r.device).trim() !== "");
    if (deviceRows.length > 0) {
      const devGroups = {};
      deviceRows.forEach(r => {
        const refMonth = getRowReferenceMonth(r);
        const key = `${r.platform}_${refMonth}_${r.campaign_name}_${r.device}`;
        if (!devGroups[key]) {
          devGroups[key] = {
            platform: r.platform,
            reference_month: refMonth,
            reference_label: r.reference_label || (refMonth ? `${MONTHS_PT[parseInt(refMonth.split("-")[1], 10) - 1]}/${refMonth.split("-")[0]}` : ""),
            campaign_name: r.campaign_name,
            device: r.device,
            date: r.date || `${refMonth}-01`,
            spend: 0, clicks: 0, impressions: 0, conversions: 0, leads: 0, reach: 0, revenue: 0
          };
        }
        const g = devGroups[key];
        g.spend       += r.spend       || 0;
        g.clicks      += r.clicks      || 0;
        g.impressions += r.impressions || 0;
        g.conversions += r.conversions || 0;
        g.leads       += r.leads       || 0;
        g.reach       += r.reach       || 0;
        g.revenue     += r.revenue     || 0;
      });
      derivedDevices = Object.values(devGroups);
      console.log(`[DB] Auto-derived ${derivedDevices.length} device records from fact_campaigns.`);
    }
  }

  // C-04 FIX: Return a NEW object instead of mutating the parameter
  return { ...db, fact_marketing_summary: summary, fact_devices: derivedDevices };
}

// ----------------------------------------------------
// Supabase Sync Engine
// ----------------------------------------------------

export async function syncWithSupabase(db) {
  // C-06 FIX: Guard against null supabase client before any operation
  if (!supabase || !isSupabaseConfigured) return;

  // Syncs fact_campaigns and fact_marketing_summary (aggregated) to Supabase tables
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;

  // 1. Sync campaigns table
  // A-10 FIX: Use upsert instead of delete+insert to avoid data loss on network failure
  if (db.fact_campaigns && db.fact_campaigns.length > 0) {
    // Map facts to Supabase columns
    const campaignsToInsert = db.fact_campaigns.map(c => ({
      id: c.id,
      nome: c.campaign_name,
      plataforma: c.platform === "google" ? "Google Ads" : "Meta Ads",
      tipo: c.platform,
      investimento: c.spend || 0,
      receita: c.revenue || 0,
      roas: c.roas || 0,
      cpa: c.cpl || c.cac || 0,
      ctr: (c.ctr || 0) * 100,
      cpc: c.cpc || 0,
      conversoes: c.conversions || 0,
      status: c.status || "Ativo",
      user_id: user.id
    }));

    const { error: syncErr } = await supabase
      .from("campaigns")
      .upsert(campaignsToInsert, { onConflict: "id", ignoreDuplicates: false });
    if (syncErr) console.error("Error syncing campaigns to Supabase:", syncErr);
  }

  // 2. Sync monthly historical metrics
  // A-10 FIX: Use upsert by (mes, user_id) to avoid delete+insert race condition
  const monthGroups = {};
  db.fact_marketing_summary.forEach(s => {
    const label = s.reference_label;
    if (!label) return;
    if (!monthGroups[label]) {
      monthGroups[label] = {
        mes: label,
        investimento: 0,
        receita: 0,
        conversoes: 0,
        user_id: user.id
      };
    }
    monthGroups[label].investimento += s.spend || 0;
    monthGroups[label].receita += s.revenue || 0;
    monthGroups[label].conversoes += s.conversions || 0;
  });

  const timelineToInsert = Object.values(monthGroups).map(m => {
    const roas = m.investimento > 0 ? m.receita / m.investimento : 0;
    const cpa = m.conversoes > 0 ? m.investimento / m.conversoes : 0;
    return {
      mes: m.mes,
      receita: m.receita,
      investimento: m.investimento,
      roas: roas,
      cpa: cpa,
      user_id: user.id
    };
  });

  if (timelineToInsert.length > 0) {
    const { error: timelineErr } = await supabase
      .from("historical_metrics")
      .upsert(timelineToInsert, { onConflict: "mes,user_id", ignoreDuplicates: false });
    if (timelineErr) console.error("Error syncing historical metrics to Supabase:", timelineErr);
  }
}
