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
  uploaded_files: [] // log of files uploaded: { platform, dataset_type, reference_month, raw_file_name, file_hash, created_at }
};

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
  if (typeof window === "undefined") return INITIAL_DB;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return INITIAL_DB;
    const parsed = JSON.parse(data);
    
    // Ensure all tables exist in the parsed object
    const db = { ...INITIAL_DB, ...parsed };
    return db;
  } catch (err) {
    console.error("Failed to load local database, resetting:", err);
    return INITIAL_DB;
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
  // Checks duplicate based on platform, dataset_type, reference_month, raw_file_name, file_hash
  return db.uploaded_files.find(
    f => f.file_hash === fileMeta.file_hash ||
         (f.platform === fileMeta.platform &&
          f.dataset_type === fileMeta.dataset_type &&
          f.reference_month === fileMeta.reference_month)
  );
}

export async function insertDataset(db, fileMeta, rows, action = "replace") {
  const targetTable = DATASET_TABLE_MAP[fileMeta.dataset_type] || "fact_campaigns";
  
  // Make sure we have array instances
  if (!db[targetTable]) db[targetTable] = [];
  if (!db.uploaded_files) db.uploaded_files = [];

  const platform = fileMeta.platform;
  const dataset_type = fileMeta.dataset_type;
  const reference_month = fileMeta.reference_month;

  // 1. Handle actions for existing data
  if (action === "replace") {
    // Delete existing records matching this platform, dataset type and month from the target table
    db[targetTable] = db[targetTable].filter(
      r => !(r.platform === platform && r.dataset_type === dataset_type && r.reference_month === reference_month)
    );
    
    // If saving campaigns, delete campaigns
    if (targetTable === "fact_campaigns") {
      db.fact_campaigns = db.fact_campaigns.filter(
        r => !(r.platform === platform && r.reference_month === reference_month)
      );
    }

    // Remove file from file logs
    db.uploaded_files = db.uploaded_files.filter(
      f => !(f.platform === platform && f.dataset_type === dataset_type && f.reference_month === reference_month)
    );

  } else if (action === "ignore") {
    // Return early
    return db;
  } else if (action === "merge") {
    // Merge: we append them, but deduplicate individual rows by unique keys if possible
    // (e.g. Campaign name + date for campaigns, device for device performance, etc.)
  }

  // 2. Append new rows
  if (action === "merge") {
    // To merge, filter out rows that have identical keys
    const getRowKey = (r) => {
      return `${r.platform}_${r.reference_month}_${r.campaign_name || ""}_${r.date || ""}_${r.device || ""}_${r.keyword || ""}_${r.search_term || ""}_${r.gender || ""}_${r.age_range || ""}_${r.hour || ""}`;
    };
    
    const existingKeys = new Set(db[targetTable].map(getRowKey));
    const uniqueNewRows = rows.filter(r => !existingKeys.has(getRowKey(r)));
    db[targetTable] = [...db[targetTable], ...uniqueNewRows];
  } else {
    // Replace simply appends all new rows
    db[targetTable] = [...db[targetTable], ...rows];
  }

  // 3. Log the file
  db.uploaded_files.push({
    ...fileMeta,
    created_at: new Date().toISOString()
  });

  // 4. Consolidate summary table
  db = consolidateSummary(db);

  // 5. Save database locally
  saveDatabase(db);

  // 6. Optional Supabase Sync
  if (isSupabaseConfigured && supabase) {
    try {
      await syncWithSupabase(db);
    } catch (e) {
      console.error("Failed to sync database to Supabase:", e);
    }
  }

  return db;
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

  // Gather campaign level items (from fact_campaigns and fact_time_series)
  const addRowToGroups = (r) => {
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

  // If we have fact_campaigns
  if (db.fact_campaigns && db.fact_campaigns.length > 0) {
    db.fact_campaigns.forEach(addRowToGroups);
  }

  // If we have fact_time_series (adds daily granularity)
  if (db.fact_time_series && db.fact_time_series.length > 0) {
    db.fact_time_series.forEach(addRowToGroups);
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
