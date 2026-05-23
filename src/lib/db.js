import { supabase, isSupabaseConfigured } from "./supabase";

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
    fact_marketing_summary: [],
    uploaded_files: []
  };
}

const STORAGE_KEY = "orbit_marketing_bi_db";

const DATASET_TABLE_MAP = {
  campaign_performance: "fact_campaigns",
  meta_campaign_performance: "fact_campaigns",
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
  daily_time_series: "fact_time_series"
};

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
    return db;
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

  // 1. Handle actions for existing data
  if (action === "replace") {
    // Delete existing records matching this raw_file_name from the target table
    newDb[targetTable] = newDb[targetTable].filter(
      r => r.raw_file_name !== fileMeta.raw_file_name
    );
    
    // If saving campaigns, delete campaigns with the same raw_file_name
    if (targetTable === "fact_campaigns") {
      newDb.fact_campaigns = newDb.fact_campaigns.filter(
        r => r.raw_file_name !== fileMeta.raw_file_name
      );
    }

    // Remove file from file logs
    newDb.uploaded_files = newDb.uploaded_files.filter(
      f => f.raw_file_name !== fileMeta.raw_file_name
    );

  } else if (action === "ignore") {
    // Return early
    return newDb;
  } else if (action === "merge") {
    // Merge: we append them, but deduplicate individual rows by unique keys if possible
  }

  // 2. Append new rows
  if (action === "merge") {
    // To merge, filter out rows that have identical keys
    const getRowKey = (r) => {
      return `${r.platform}_${r.reference_month}_${r.campaign_name || ""}_${r.date || ""}_${r.device || ""}_${r.keyword || ""}_${r.search_term || ""}_${r.gender || ""}_${r.age_range || ""}_${r.hour || ""}`;
    };
    
    const existingKeys = new Set(newDb[targetTable].map(getRowKey));
    const uniqueNewRows = rows.filter(r => !existingKeys.has(getRowKey(r)));
    newDb[targetTable] = [...newDb[targetTable], ...uniqueNewRows];
  } else {
    // Replace simply appends all new rows
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

  // 6. Optional Supabase Sync
  if (isSupabaseConfigured && supabase) {
    try {
      await syncWithSupabase(updatedDb);
    } catch (e) {
      console.error("Failed to sync database to Supabase:", e);
    }
  }

  return updatedDb;
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

  // Track which campaign + month + platform has daily time series data
  const hasDailyData = new Set();
  if (db.fact_time_series && db.fact_time_series.length > 0) {
    db.fact_time_series.forEach(r => {
      if (r.platform && r.reference_month && r.campaign_name) {
        hasDailyData.add(`${r.platform}_${r.reference_month}_${r.campaign_name}`);
      }
    });
  }

  // Gather campaign level items (from fact_campaigns and fact_time_series)
  const addRowToGroups = (r, isCampaignTable = false) => {
    // Prevent double counting: if we are processing campaign table, but we already have daily breakdown for this platform/month/campaign, ignore it.
    if (isCampaignTable && r.platform && r.reference_month && r.campaign_name) {
      if (hasDailyData.has(`${r.platform}_${r.reference_month}_${r.campaign_name}`)) {
        return;
      }
    }

    const key = `${r.platform}_${r.reference_month}_${r.campaign_name}_${r.date || r.reference_month}`;
    if (!groups[key]) {
      groups[key] = {
        platform: r.platform,
        campaign_name: r.campaign_name,
        date: r.date || `${r.reference_month}-01`,
        day: r.day || 1,
        week: r.week || 1,
        month: r.month,
        month_name: r.month_name,
        quarter: r.quarter,
        year: r.year,
        year_month: r.year_month,
        reference_month: r.reference_month,
        reference_label: r.reference_label,
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

  // If we have fact_campaigns (pass isCampaignTable = true)
  if (db.fact_campaigns && db.fact_campaigns.length > 0) {
    db.fact_campaigns.forEach(r => addRowToGroups(r, true));
  }

  // If we have fact_time_series (adds daily granularity)
  if (db.fact_time_series && db.fact_time_series.length > 0) {
    db.fact_time_series.forEach(r => addRowToGroups(r, false));
  }

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

  db.fact_marketing_summary = summary;
  return db;
}

// ----------------------------------------------------
// Supabase Sync Engine
// ----------------------------------------------------

export async function syncWithSupabase(db) {
  // Syncs fact_campaigns and fact_marketing_summary (aggregated) to Supabase tables
  // Standard Supabase Schema is:
  // - public.campaigns (investimento, receita, roas, cpa, ctr, cpc, conversoes, status, user_id)
  // - public.historical_metrics (mes, receita, investimento, roas, cpa, user_id)

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;

  // 1. Sync campaigns table
  // Clear all user campaigns
  await supabase
    .from("campaigns")
    .delete()
    .eq("user_id", user.id);

  if (db.fact_campaigns && db.fact_campaigns.length > 0) {
    // Map facts to Supabase columns
    const campaignsToInsert = db.fact_campaigns.map(c => ({
      nome: c.campaign_name,
      plataforma: c.platform === "google" ? "Google Ads" : "Meta Ads",
      tipo: c.platform,
      investimento: c.spend || 0,
      receita: c.revenue || 0,
      roas: c.roas || 0,
      cpa: c.cpl || c.cac || 0,
      ctr: (c.ctr || 0) * 100, // CTR stored in percent in Supabase campaigns table
      cpc: c.cpc || 0,
      conversoes: c.conversions || 0,
      status: c.status || "Ativo",
      user_id: user.id
    }));

    const { error: syncErr } = await supabase.from("campaigns").insert(campaignsToInsert);
    if (syncErr) console.error("Error syncing campaigns to Supabase:", syncErr);
  }

  // 2. Sync monthly historical metrics
  // Clear all user metrics
  await supabase
    .from("historical_metrics")
    .delete()
    .eq("user_id", user.id);

  // Group summary by reference label to insert monthly historical rows
  const monthGroups = {};
  db.fact_marketing_summary.forEach(s => {
    const label = s.reference_label;
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
    const { error: timelineErr } = await supabase.from("historical_metrics").insert(timelineToInsert);
    if (timelineErr) console.error("Error syncing historical metrics to Supabase:", timelineErr);
  }
}
