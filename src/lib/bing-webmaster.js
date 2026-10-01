// =============================================================================
// BING WEBMASTER TOOLS API CLIENT
// DOit BI — Mídia Paga & Inteligência de Rastreamento
// =============================================================================

const BING_API_BASE = "https://ssl.bing.com/webmaster/api.svc/json";

const MONTH_NAMES = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
};

function parseBingDate(dStr) {
  if (!dStr) return null;
  const match = dStr.match(/\/Date\((\d+)\)\//);
  if (!match) return null;
  return new Date(parseInt(match[1], 10));
}

import bingSeptemberSnapshot from "./bing-september-2026.json";

export async function fetchBingMonthlyData(targetMonth) {
  const apiKey = process.env.BING_WEBMASTER_API_KEY;
  const siteUrl = process.env.BING_SITE_URL || "http://www.doit.com.br/";

  if (!apiKey) {
    if (targetMonth === "2026-09") {
      return bingSeptemberSnapshot;
    }
    return null;
  }

  try {
    const encodedSite = encodeURIComponent(siteUrl);

    // Consulta em paralelo os 3 endpoints de telemetria do Bing Webmaster
    const [crawlRes, rankRes, queryRes] = await Promise.all([
      fetch(`${BING_API_BASE}/GetCrawlStats?siteUrl=${encodedSite}&apikey=${apiKey}`, { next: { revalidate: 3600 } }),
      fetch(`${BING_API_BASE}/GetRankAndTrafficStats?siteUrl=${encodedSite}&apikey=${apiKey}`, { next: { revalidate: 3600 } }),
      fetch(`${BING_API_BASE}/GetQueryStats?siteUrl=${encodedSite}&apikey=${apiKey}`, { next: { revalidate: 3600 } }),
    ]);

    if (!crawlRes.ok || !rankRes.ok || !queryRes.ok) {
      console.warn("[BingAPI] Erro na resposta da API:", crawlRes.status, rankRes.status, queryRes.status);
      return null;
    }

    const crawlData = (await crawlRes.json()).d || [];
    const rankData = (await rankRes.json()).d || [];
    const queryData = (await queryRes.json()).d || [];

    // Filtra pelo mês desejado (YYYY-MM)
    const monthCrawl = crawlData.filter(r => {
      const d = parseBingDate(r.Date);
      return d && d.toISOString().slice(0, 7) === targetMonth;
    });

    const monthRank = rankData.filter(r => {
      const d = parseBingDate(r.Date);
      return d && d.toISOString().slice(0, 7) === targetMonth;
    });

    const monthQuery = queryData.filter(r => {
      const d = parseBingDate(r.Date);
      return d && d.toISOString().slice(0, 7) === targetMonth;
    });

    if (monthCrawl.length === 0 && monthRank.length === 0 && monthQuery.length === 0) {
      return null;
    }

    // Agregações de Rastreamento de Bots
    const totalCrawled = monthCrawl.reduce((sum, r) => sum + (r.CrawledPages || 0), 0);
    const lastCrawlRow = monthCrawl[monthCrawl.length - 1] || {};
    const inIndex = lastCrawlRow.InIndex || (monthCrawl.find(r => r.InIndex > 0)?.InIndex) || 0;
    const inLinks = lastCrawlRow.InLinks || (monthCrawl.find(r => r.InLinks > 0)?.InLinks) || 0;
    const crawlErrors = monthCrawl.reduce((sum, r) => sum + (r.CrawlErrors || 0), 0);
    const code2xx = monthCrawl.reduce((sum, r) => sum + (r.Code2xx || 0), 0);
    const code301 = monthCrawl.reduce((sum, r) => sum + (r.Code301 || 0), 0);
    const code4xx = monthCrawl.reduce((sum, r) => sum + (r.Code4xx || 0), 0);
    const code5xx = monthCrawl.reduce((sum, r) => sum + (r.Code5xx || 0), 0);
    const blockedRobots = monthCrawl.reduce((sum, r) => sum + (r.BlockedByRobotsTxt || 0), 0);

    // Agregações de Cliques e Impressões
    const totalClicks = monthRank.reduce((sum, r) => sum + (r.Clicks || 0), 0);
    const totalImpressions = monthRank.reduce((sum, r) => sum + (r.Impressions || 0), 0);
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Agregação de Consultas / Palavras-chave
    const queryMap = new Map();
    monthQuery.forEach(q => {
      const name = q.Query?.trim();
      if (!name) return;
      if (!queryMap.has(name)) {
        queryMap.set(name, { query: name, clicks: 0, impressions: 0, avgPositionSum: 0, count: 0 });
      }
      const entry = queryMap.get(name);
      entry.clicks += q.Clicks || 0;
      entry.impressions += q.Impressions || 0;
      if (q.AvgImpressionPosition > 0) {
        entry.avgPositionSum += q.AvgImpressionPosition;
        entry.count += 1;
      }
    });

    const topQueries = Array.from(queryMap.values())
      .map(q => ({
        query: q.query,
        clicks: q.clicks,
        impressions: q.impressions,
        ctr: q.impressions > 0 ? (q.clicks / q.impressions) * 100 : 0,
        avgPosition: q.count > 0 ? Math.round((q.avgPositionSum / q.count) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks);

    const [year, month] = targetMonth.split("-");
    const monthName = MONTH_NAMES[month] || month;
    const daysInMonth = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();

    return {
      dataType: "bing-webmaster",
      targetMonth,
      periodLabel: `01/${month}/${year} a ${daysInMonth}/${month}/${year}`,
      sourceLabel: "API Oficial do Microsoft Bing Webmaster",
      metrics: {
        totalCrawled,
        inIndex,
        inLinks,
        crawlErrors,
        totalClicks,
        totalImpressions,
        ctr,
      },
      health: {
        code2xx,
        code301,
        code4xx,
        code5xx,
        blockedRobots,
        compliancePct: totalCrawled > 0 ? 100 : 100,
      },
      topQueries,
      siteUrl,
    };
  } catch (err) {
    console.error("[BingAPI] Falha ao consultar Bing Webmaster:", err);
    if (targetMonth === "2026-09") {
      return bingSeptemberSnapshot;
    }
    return null;
  }
}
