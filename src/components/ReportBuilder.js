"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";

// ─── Chave de persistência ────────────────────────────────────────────────────
const PREFS_KEY = "orbit-report-prefs";

function loadPrefs() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)); } catch { return null; }
}

// ─── Formatadores ─────────────────────────────────────────────────────────────
const brl  = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brl2 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num  = new Intl.NumberFormat("pt-BR");
const pct  = (v) => `${(v || 0).toFixed(2).replace(".", ",")}%`;

// ─── Definição dos KPIs disponíveis ──────────────────────────────────────────
const KPI_DEFS = [
  { key: "investimento", label: "Investimento",  icon: "💰", fmt: (v) => brl.format(v),  desc: "Gasto total em mídia paga" },
  { key: "cliques",      label: "Cliques",        icon: "🖱️", fmt: (v) => num.format(v),  desc: "Cliques nos anúncios" },
  { key: "impressoes",   icon: "👁️", label: "Impressões",     fmt: (v) => num.format(v),  desc: "Total de exibições" },
  { key: "ctr",          label: "CTR",            icon: "📊", fmt: (v) => pct(v * 100),   desc: "Taxa de cliques" },
  { key: "cpc",          label: "CPC",            icon: "💲", fmt: (v) => brl2.format(v), desc: "Custo por clique" },
  { key: "cpm",          label: "CPM",            icon: "📣", fmt: (v) => brl2.format(v), desc: "Custo por mil impressões" },
  { key: "leads",        label: "Leads",          icon: "🎯", fmt: (v) => num.format(v),  desc: "Leads captados" },
  { key: "conversoes",   label: "Agendamentos",   icon: "✅", fmt: (v) => num.format(v),  desc: "Agendamentos que foram Marcados" },
  { key: "demos",        label: "Demos Realizadas", icon: "🔮", fmt: (v) => num.format(v), desc: "Demos que foram realizadas para o Cliente" },
  { key: "cpa",          label: "CPA",            icon: "🏷️", fmt: (v) => brl2.format(v), desc: "Custo por agendamento" },
  { key: "cpl",          label: "CPL",            icon: "📋", fmt: (v) => brl2.format(v), desc: "Custo por lead" },
  { key: "alcance",      label: "Alcance",        icon: "🌐", fmt: (v) => num.format(v),  desc: "Pessoas alcançadas" },
];

const DEFAULT_KPIS = ["investimento", "cliques", "impressoes", "ctr", "leads", "conversoes", "demos", "cpa", "cpl"];

// ─── Calcula linha de dados para um mês ──────────────────────────────────────
function calcRowKpis(row) {
  const investimento = row.investimento || 0;
  const cliques      = row.cliques     || 0;
  const impressoes   = row.impressoes  || 0;
  const leads        = row.leads       || 0;
  const conversoes   = row.conversoes  || 0;
  const alcance      = row.alcance     || 0;

  return {
    investimento,
    cliques,
    impressoes,
    ctr:      impressoes > 0 ? cliques / impressoes : 0,
    cpc:      cliques    > 0 ? investimento / cliques    : 0,
    cpm:      impressoes > 0 ? (investimento / impressoes) * 1000 : 0,
    leads,
    conversoes,
    demos:    0,
    cpa:      conversoes > 0 ? investimento / conversoes : 0,
    cpl:      leads      > 0 ? investimento / leads      : 0,
    alcance,
  };
}

// ─── Linha de total ───────────────────────────────────────────────────────────
function calcTotalRow(rows) {
  const total = {
    investimento: 0, cliques: 0, impressoes: 0,
    leads: 0, conversoes: 0, alcance: 0,
  };
  rows.forEach(r => {
    total.investimento += r.investimento || 0;
    total.cliques      += r.cliques      || 0;
    total.impressoes   += r.impressoes   || 0;
    total.leads        += r.leads        || 0;
    total.conversoes   += r.conversoes   || 0;
    total.alcance      += r.alcance      || 0;
  });
  return calcRowKpis(total);
}

// ─── Toggle Chip ──────────────────────────────────────────────────────────────
function KpiToggle({ kpi, checked, onChange }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 10px", borderRadius: 8, cursor: "pointer",
      background: checked ? "rgba(91,156,246,0.12)" : "var(--hover-bg)",
      border: checked ? "1px solid rgba(91,156,246,0.35)" : "1px solid var(--border-soft)",
      transition: "all 0.18s ease",
      userSelect: "none",
    }}>
      <input type="checkbox" checked={checked} onChange={() => onChange(kpi.key)}
        style={{ display: "none" }} />
      <span style={{ fontSize: 14 }}>{kpi.icon}</span>
      <span style={{
        fontSize: "0.78rem", fontWeight: 600,
        color: checked ? "var(--blue)" : "var(--text-secondary)",
      }}>{kpi.label}</span>
      <span style={{
        marginLeft: "auto", width: 14, height: 14, borderRadius: 4,
        background: checked ? "var(--blue)" : "var(--input-bg)",
        border: checked ? "2px solid var(--blue)" : "2px solid var(--input-border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, transition: "all 0.18s ease",
      }}>
        {checked && <span style={{ color: "#fff", fontSize: 9, fontWeight: 900 }}>✓</span>}
      </span>
    </label>
  );
}

// ─── Card de KPI do sumário ───────────────────────────────────────────────────
function SummaryCard({ kpi, value, prevValue }) {
  const def = KPI_DEFS.find(d => d.key === kpi);
  if (!def) return null;
  const displayVal = (kpi === "conversoes" || kpi === "demos") ? 0 : value;
  const formatted = def.fmt(displayVal);
  const delta = prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : null;
  const isPositive = delta >= 0;

  return (
    <div style={{
      flex: "1 1 140px", minWidth: 0,
      background: "var(--hover-bg)",
      border: "1px solid var(--border-soft)",
      borderRadius: 12, padding: "14px 16px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, #fbbc05, #0866ff)",
        borderRadius: "12px 12px 0 0",
      }} />
      <div style={{ fontSize: 18, marginBottom: 4 }}>{def.icon}</div>
      <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
        {def.label}
      </div>
      <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1 }}>
        {formatted}
      </div>
      {delta !== null && (
        <div style={{
          marginTop: 6, display: "inline-flex", alignItems: "center", gap: 3,
          fontSize: "0.68rem", fontWeight: 700,
          color: isPositive ? "#34d399" : "#f87171",
          background: isPositive ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
          border: isPositive ? "1px solid rgba(52,211,153,0.2)" : "1px solid rgba(248,113,113,0.2)",
          borderRadius: 99, padding: "2px 6px",
        }}>
          {isPositive ? "▲" : "▼"} {Math.abs(delta).toFixed(1).replace(".", ",")}%
        </div>
      )}
    </div>
  );
}

// ─── Insight automático ────────────────────────────────────────────────────────
function generateInsights(rows, totals) {
  const insights = [];
  if (!rows || rows.length === 0) return insights;

  // Melhor mês por leads
  const byLeads = [...rows].sort((a, b) => b.leads - a.leads);
  if (byLeads[0]?.leads > 0) {
    insights.push({
      icon: "🏆",
      text: `<strong>${byLeads[0].mes}</strong> foi o mês com maior captação de leads: <strong>${num.format(byLeads[0].leads)} leads</strong>.`,
    });
  }

  // Menor CPL
  const withCpl = rows.filter(r => r.leads > 0);
  if (withCpl.length >= 2) {
    const byCpl = [...withCpl].sort((a, b) => (a.investimento / a.leads) - (b.investimento / b.leads));
    const bestCpl = byCpl[0];
    insights.push({
      icon: "💡",
      text: `<strong>${bestCpl.mes}</strong> apresentou o menor CPL: <strong>${brl2.format(bestCpl.investimento / bestCpl.leads)}</strong>.`,
    });
  }

  // Crescimento MoM
  if (rows.length >= 2) {
    const last = rows[rows.length - 1];
    const prev = rows[rows.length - 2];
    if (prev.investimento > 0) {
      const growth = ((last.investimento - prev.investimento) / prev.investimento) * 100;
      const direction = growth >= 0 ? "crescimento" : "redução";
      insights.push({
        icon: growth >= 0 ? "📈" : "📉",
        text: `Variação do investimento em <strong>${last.mes}</strong> vs <strong>${prev.mes}</strong>: ${growth >= 0 ? "+" : ""}${growth.toFixed(1).replace(".", ",")}% (${direction}).`,
      });
    }
  }

  // Melhor mês por agendamentos
  const byConv = [...rows].sort((a, b) => b.conversoes - a.conversoes);
  if (byConv[0]?.conversoes > 0) {
    insights.push({
      icon: "✅",
      text: `<strong>${byConv[0].mes}</strong> liderou em agendamentos com <strong>${num.format(byConv[0].conversoes)} agendamentos</strong>.`,
    });
  }

  return insights.slice(0, 4);
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ReportBuilder({
  timeline,
  totals,
  filteredCampaigns,
  platform,
  period,
  startDate,
  endDate,
}) {
  const printRef = useRef(null);
  // Config state — inicializa do localStorage após montar no cliente (SSR-safe)
  const [selectedKpis,   setSelectedKpis]   = useState(DEFAULT_KPIS);
  const [clientName,     setClientName]      = useState("");
  const [showConfig,     setShowConfig]      = useState(true);
  const [highlight,      setHighlight]       = useState(true);
  const [saveAsDefault,  setSaveAsDefault]   = useState(false);

  useEffect(() => {
    const prefs = loadPrefs();
    if (prefs) {
      setTimeout(() => {
        if (prefs.selectedKpis) {
          let kpis = prefs.selectedKpis;
          if (kpis.includes("conversoes") && !kpis.includes("demos")) {
            const idx = kpis.indexOf("conversoes");
            kpis = [...kpis.slice(0, idx + 1), "demos", ...kpis.slice(idx + 1)];
          }
          setSelectedKpis(kpis);
        }
        if (prefs.clientName) setClientName(prefs.clientName);
        if (prefs.highlight !== undefined) setHighlight(prefs.highlight);
        if (prefs.saveAsDefault !== undefined) setSaveAsDefault(prefs.saveAsDefault);
      }, 0);
    }
  }, []);

  // Persiste preferências no localStorage sempre que algo mudar (se saveAsDefault estiver ativo)
  useEffect(() => {
    if (!saveAsDefault) return;
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      selectedKpis, clientName, highlight, saveAsDefault
    }));
  }, [selectedKpis, clientName, highlight, saveAsDefault]);

  // Ao ativar saveAsDefault, salva imediatamente
  const handleSaveAsDefault = useCallback((checked) => {
    setSaveAsDefault(checked);
    if (checked) {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        selectedKpis, clientName, highlight, saveAsDefault: true
      }));
    } else {
      // Remove a persistência, mas mantém as seleções da sessão atual
      localStorage.removeItem(PREFS_KEY);
    }
  }, [selectedKpis, clientName, highlight]);

  // Toggle KPI
  const toggleKpi = useCallback((key) => {
    setSelectedKpis(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }, []);

  // Ordenar KPIs na mesma ordem de KPI_DEFS
  const orderedKpis = KPI_DEFS.filter(d => selectedKpis.includes(d.key));

  // Montar linhas da tabela a partir do timeline — usando campos REAIS
  const tableRows = useMemo(() => {
    if (!timeline || timeline.length === 0) return [];
    return timeline.map(row => ({
      mes: row.mes || row.reference_month || "—",
      ...calcRowKpis({
        investimento: row.investimento || 0,
        cliques:      row.cliques      || 0,   // ✅ campo real
        impressoes:   row.impressoes   || 0,   // ✅ campo real
        leads:        row.leads        || 0,
        conversoes:   row.conversoes   || 0,
        alcance:      row.alcance      || 0,   // ✅ campo real
      }),
    }));
  }, [timeline]);

  // Totais usando os dados reais passados (mais completos)
  const summaryKpis = selectedKpis.slice(0, 6);

  // Linha de total
  const totalRow = useMemo(() => calcTotalRow(tableRows), [tableRows]);

  // Insights
  const insights = useMemo(() => generateInsights(tableRows, totals), [tableRows, totals]);

  // Índice da melhor linha (maior conversão/lead)
  const bestRowIdx = useMemo(() => {
    if (tableRows.length === 0) return -1;
    let best = 0;
    tableRows.forEach((r, i) => {
      if (r.leads > tableRows[best].leads) best = i;
    });
    return tableRows[best].leads > 0 ? best : -1;
  }, [tableRows]);

  // Período label
  const periodLabel = useMemo(() => {
    if (startDate && endDate) return `${startDate} — ${endDate}`;
    if (period !== "todos") return period;
    return "Histórico completo";
  }, [period, startDate, endDate]);

  const platformLabel = platform === "todas" ? "Todas as plataformas" : platform === "google" ? "Google Ads" : "Meta Ads";
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  // Export CSV
  const handleExportCsv = () => {
    if (tableRows.length === 0) return;
    const header = ["Mês", ...orderedKpis.map(k => k.label)].join(";");
    const dataRows = tableRows.map(row =>
      [row.mes, ...orderedKpis.map(k => String(row[k] ?? "").replace(".", ","))].join(";")
    );
    const totalLine = ["TOTAL", ...orderedKpis.map(k => String(totalRow[k] ?? "").replace(".", ","))].join(";");
    const csv = [header, ...dataRows, totalLine].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `orbit-relatorio-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Export PDF — janela nova, tema claro, auto-scale para caber em 1 página
  const handleExportPdf = () => {
    const brlFmt  = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
    const brl2Fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
    const numFmt  = (v) => new Intl.NumberFormat("pt-BR").format(Math.round(v || 0));
    const pctFmt  = (v) => `${((v || 0) * 100).toFixed(2).replace(".", ",")}%`;

    const fmtKpi = (key, val) => {
      if (["investimento","cpc","cpm","cpa","cpl"].includes(key)) return key === "investimento" ? brlFmt(val) : brl2Fmt(val);
      if (key === "ctr") return pctFmt(val);
      return numFmt(val);
    };

    // KPI Cards
    const kpiCardsHtml = summaryKpis.map(key => {
      const def = KPI_DEFS.find(d => d.key === key);
      if (!def) return "";
      const rawVal = totals[key] ?? totalRow[key] ?? 0;
      const val = (key === "conversoes" || key === "demos") ? 0 : rawVal;
      return `<div class="kpi-card"><div class="kpi-ic">${def.icon}</div><div class="kpi-lb">${def.label}</div><div class="kpi-vl">${fmtKpi(key, val)}</div></div>`;
    }).join("");

    // Tabela
    const theadHtml = `<tr><th class="th-mes">Mês</th>${orderedKpis.map(k => `<th>${k.label}</th>`).join("")}</tr>`;
    const tbodyHtml = tableRows.map((row, idx) => {
      const isBest = highlight && idx === bestRowIdx;
      return `<tr class="${isBest ? "best" : idx % 2 === 1 ? "alt" : ""}"><td class="td-mes">${isBest ? "★ " : ""}${row.mes}</td>${orderedKpis.map(k => `<td class="td-n">${fmtKpi(k.key, row[k.key] ?? 0)}</td>`).join("")}</tr>`;
    }).join("");
    const tfootHtml = `<tr class="total"><td class="td-mes">TOTAL</td>${orderedKpis.map(k => `<td class="td-n">${fmtKpi(k.key, totalRow[k.key] ?? 0)}</td>`).join("")}</tr>`;

    // Insights
    const insightsHtml = insights.length > 0
      ? `<div class="sec"><div class="sec-t">⚡ Insights Automáticos</div><div class="ins-grid">${insights.map(i => `<div class="ins">${i.icon} <span>${i.text}</span></div>`).join("")}</div></div>`
      : "";

    // Plataformas inline
    let platformHtml = "";
    if (timeline && timeline.some(r => r.google > 0 || r.meta > 0)) {
      const totalG = timeline.reduce((s, r) => s + (r.google || 0), 0);
      const totalM = timeline.reduce((s, r) => s + (r.meta   || 0), 0);
      const tot    = totalG + totalM;
      const pG = tot > 0 ? (totalG / tot * 100).toFixed(1).replace(".", ",") : "0,0";
      const pM = tot > 0 ? (totalM / tot * 100).toFixed(1).replace(".", ",") : "0,0";
      platformHtml = `<div class="sec"><div class="sec-t">🔀 Distribuição por Plataforma</div><div class="plat-row"><div class="plat" style="border-left:3px solid #3b82f6"><span class="plat-l" style="color:#3b82f6">Google Ads</span><span class="plat-v">${brlFmt(totalG)}</span><span class="plat-p">${pG}% do invest.</span></div><div class="plat" style="border-left:3px solid #10b981"><span class="plat-l" style="color:#10b981">Meta Ads</span><span class="plat-v">${brlFmt(totalM)}</span><span class="plat-p">${pM}% do invest.</span></div></div></div>`;
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório Executivo — ${clientName || "Orbit BI"}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:#fff;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  /* wrapper que será escalado pelo JS */
  .page{width:277mm;padding:5mm 6mm;display:flex;flex-direction:column;gap:3mm}

  /* CABEÇALHO */
  .hdr{display:flex;justify-content:space-between;align-items:center;padding-bottom:3mm;border-bottom:2px solid #0f172a}
  .brand{display:flex;align-items:center;gap:8px}
  .logo{width:30px;height:30px;border-radius:6px;background:linear-gradient(135deg,#3b82f6,#10b981);display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:14px;flex-shrink:0}
  .brand-name{font-size:13pt;font-weight:800;line-height:1}
  .brand-sub{font-size:7pt;color:#64748b}
  .hdr-r{text-align:right}
  .cli{font-size:11pt;font-weight:800}
  .hdr-m{font-size:7pt;color:#64748b;margin-top:1px}

  /* KPIs */
  .kpi-row{display:flex;gap:4px}
  .kpi-card{flex:1;border:1px solid #e2e8f0;border-radius:6px;padding:5px 7px;background:#f8fafc;border-top:2px solid #3b82f6;min-width:0}
  .kpi-ic{font-size:11px;margin-bottom:1px}
  .kpi-lb{font-size:6pt;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:1px;white-space:nowrap}
  .kpi-vl{font-size:9pt;font-weight:800;color:#0f172a;white-space:nowrap}

  /* SEÇÕES */
  .sec{display:flex;flex-direction:column;gap:1.5mm}
  .sec-t{font-size:6.5pt;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;padding-bottom:1.5mm;border-bottom:1px solid #e2e8f0}

  /* TABELA */
  table{width:100%;border-collapse:collapse;font-size:7.5pt}
  th{padding:4px 8px;text-align:right;background:#0f172a;color:#fff;font-size:6.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}
  th.th-mes{text-align:left}
  td{padding:4px 8px;text-align:right;border-bottom:1px solid #f1f5f9;color:#1e293b;white-space:nowrap;font-size:7.5pt}
  td.td-mes{text-align:left;font-weight:600;color:#0f172a}
  td.td-n{font-variant-numeric:tabular-nums}
  tr.alt{background:#f8fafc}
  tr.best td{background:#fef9c3!important;color:#78350f!important;font-weight:600}
  tr.best td.td-mes{color:#92400e!important}
  tr.total td{background:#eff6ff!important;border-top:2px solid #93c5fd;border-bottom:none;font-weight:800!important;color:#1e3a8a!important}

  /* INSIGHTS */
  .ins-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}
  .ins{display:flex;align-items:flex-start;gap:5px;padding:5px 7px;border:1px solid #e2e8f0;border-radius:5px;font-size:7pt;color:#475569;background:#f8fafc;line-height:1.4}
  .ins strong{color:#0f172a}

  /* PLATAFORMAS */
  .plat-row{display:flex;gap:6px}
  .plat{flex:1;display:flex;align-items:center;gap:10px;padding:5px 8px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc}
  .plat-l{font-size:7pt;font-weight:700;text-transform:uppercase;white-space:nowrap}
  .plat-v{font-size:11pt;font-weight:900;color:#0f172a;flex:1;text-align:right}
  .plat-p{font-size:6.5pt;color:#64748b;white-space:nowrap}

  /* RODAPÉ */
  .footer{display:flex;justify-content:space-between;padding-top:2mm;border-top:1px solid #e2e8f0;font-size:6.5pt;color:#94a3b8;margin-top:auto}

  @page{size:A4 landscape;margin:8mm 10mm}
  @media print{body{background:#fff!important}.page{width:100%!important;transform:none!important}}
</style>
</head>
<body>
<div class="page" id="page">

  <div class="hdr">
    <div class="brand">
      <div class="logo">O</div>
      <div><div class="brand-name">Orbit BI</div><div class="brand-sub">Inteligência de mídia paga</div></div>
    </div>
    <div class="hdr-r">
      <div class="cli">${clientName || "Relatório Executivo"}</div>
      <div class="hdr-m">${platformLabel} &nbsp;·&nbsp; ${periodLabel}</div>
      <div class="hdr-m">Gerado em ${today}</div>
    </div>
  </div>

  <div class="kpi-row">${kpiCardsHtml}</div>

  <div class="sec">
    <div class="sec-t">📅 Evolução Mensal — ${tableRows.length} ${tableRows.length === 1 ? "mês" : "meses"}</div>
    <table><thead>${theadHtml}</thead><tbody>${tbodyHtml}</tbody><tfoot>${tfootHtml}</tfoot></table>
  </div>

  ${insightsHtml}
  ${platformHtml}

  <div class="footer">
    <span>Orbit BI — Inteligência de Mídia Paga</span>
    <span>${clientName || "Relatório Executivo"} &nbsp;·&nbsp; ${periodLabel}</span>
    <span>Gerado em ${today}</span>
  </div>

</div>
<script>
  // Auto-scale: mede o conteúdo real e encolhe para caber em 1 página A4 landscape
  window.addEventListener('load', function() {
    var page = document.getElementById('page');
    // Altura útil da página A4 landscape (210mm - 16mm margens) em px a 96dpi
    var maxH = (210 - 16) * (96 / 25.4);
    var maxW = (297 - 20) * (96 / 25.4);
    var contentH = page.scrollHeight;
    var contentW = page.scrollWidth;
    var scaleH = contentH > maxH ? maxH / contentH : 1;
    var scaleW = contentW > maxW ? maxW / contentW : 1;
    var scale  = Math.min(scaleH, scaleW, 1);
    if (scale < 1) {
      page.style.transformOrigin = 'top left';
      page.style.transform = 'scale(' + scale + ')';
      document.body.style.height = Math.ceil(contentH * scale) + 'px';
    }
    setTimeout(function() { window.print(); }, 400);
  });
</script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=1400,height=900");
    if (!win) { alert("Permita pop-ups para este site e tente novamente."); return; }
    win.document.write(html);
    win.document.close();
  };

  const hasData = tableRows.length > 0;

  return (
    <section className="report-builder-root" id="relatorios">
      {/* ── CONFIG PANEL ─────────────────────────────────────────── */}
      <aside className={`report-config-panel ${showConfig ? "open" : ""}`}>
        <div className="report-config-inner">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              ⚙️ Configurar
            </h3>
            <button onClick={() => setShowConfig(false)} style={{
              background: "none", border: "none", color: "var(--text-muted)",
              cursor: "pointer", fontSize: 16, padding: 4,
            }}>✕</button>
          </div>

          {/* Nome do cliente */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
              Nome do Cliente
            </label>
            <input
              type="text"
              placeholder="Ex: Empresa XYZ"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "var(--input-bg)",
                border: "1px solid var(--input-border)",
                borderRadius: 8, padding: "8px 10px",
                color: "var(--text-primary)", fontSize: "0.85rem",
                outline: "none",
              }}
            />
          </div>

          {/* KPIs */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
              KPIs do Relatório
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {KPI_DEFS.map(kpi => (
                <KpiToggle
                  key={kpi.key}
                  kpi={kpi}
                  checked={selectedKpis.includes(kpi.key)}
                  onChange={toggleKpi}
                />
              ))}
            </div>
          </div>

          {/* Opções Visuais */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
              Opções Visuais
            </label>

            {/* Destacar melhor mês */}
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 10 }}>
              <input type="checkbox" checked={highlight} onChange={e => setHighlight(e.target.checked)} />
              Destacar melhor mês
            </label>

            {/* Manter como padrão */}
            <label style={{
              display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer",
              fontSize: "0.82rem", lineHeight: 1.45,
              padding: "8px 10px", borderRadius: 8,
              background: saveAsDefault ? "rgba(52,211,153,0.08)" : "var(--hover-bg)",
              border: saveAsDefault ? "1px solid rgba(52,211,153,0.3)" : "1px solid var(--border-soft)",
              transition: "all 0.18s ease",
            }}>
              <input
                type="checkbox"
                checked={saveAsDefault}
                onChange={e => handleSaveAsDefault(e.target.checked)}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <span>
                <span style={{ display: "block", fontWeight: 700, color: saveAsDefault ? "#34d399" : "var(--text-secondary)" }}>
                  Manter opções como Padrão
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  {saveAsDefault ? "✅ Salvo — será restaurado na próxima visita" : "Salva KPIs, cliente e visual para próximas sessões"}
                </span>
              </span>
            </label>
          </div>

          {/* Ações */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={handleExportPdf} style={{
              width: "100%", padding: "10px",
              background: "linear-gradient(135deg, #5b9cf6, #3b7dd8)",
              border: "none", borderRadius: 10,
              color: "#fff", fontWeight: 700, fontSize: "0.85rem",
              cursor: "pointer", transition: "opacity 0.2s",
            }}>
              📄 Exportar PDF
            </button>
            <button onClick={handleExportCsv} style={{
              width: "100%", padding: "10px",
              background: "rgba(52,211,153,0.12)",
              border: "1px solid rgba(52,211,153,0.3)",
              borderRadius: 10, color: "#34d399",
              fontWeight: 700, fontSize: "0.85rem",
              cursor: "pointer", transition: "all 0.2s",
            }}>
              📊 Exportar CSV
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN PREVIEW ─────────────────────────────────────────── */}
      <div className="report-preview-area">
        {/* Topbar do report builder */}
        <div className="report-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {!showConfig && (
              <button onClick={() => setShowConfig(true)} style={{
                background: "var(--hover-bg)",
                border: "1px solid var(--border-soft)",
                borderRadius: 8, padding: "7px 12px",
                color: "var(--text-secondary)",
                fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
              }}>
                ⚙️ Configurar
              </button>
            )}
            <div>
              <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                Orbit BI — Report Builder
              </p>
              <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)" }}>
                Relatório Executivo
              </h1>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "var(--hover-bg)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: "4px 10px" }}>
              {platformLabel}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "var(--hover-bg)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: "4px 10px" }}>
              {periodLabel}
            </span>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399" }} />
            <span style={{ fontSize: "0.72rem", color: "#34d399", fontWeight: 600 }}>Tempo real</span>
          </div>
        </div>

        {/* ── ÁREA DE IMPRESSÃO ────────────────────────────────────── */}
        <div id="report-print-area" ref={printRef} className="report-print-root">

          {/* CABEÇALHO */}
          <div className="report-header-block">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "linear-gradient(135deg, #fbbc05, #0866ff)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 900, color: "#fff", flexShrink: 0,
              }}>O</div>
              <div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
                  Orbit BI
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500 }}>
                  Inteligência de mídia paga
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>
                {clientName || "Relatório Executivo"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                {platformLabel} · {periodLabel}
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>
                Gerado em {today}
              </div>
            </div>
          </div>

          {/* SEM DADOS */}
          {!hasData ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 16, padding: "4rem 2rem",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 48, opacity: 0.25 }}>📋</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Nenhum dado disponível
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: 400, lineHeight: 1.6 }}>
                Importe relatórios do Google Ads ou Meta Ads para visualizar e exportar o relatório executivo.
              </div>
            </div>
          ) : (
            <>
              {/* ── KPI SUMMARY CARDS ───────────────────────────── */}
              <div className="report-kpi-summary">
                {summaryKpis.map(key => {
                  const kpiDef = KPI_DEFS.find(d => d.key === key);
                  if (!kpiDef) return null;
                  const value = totals[key] ?? totalRow[key] ?? 0;
                  return (
                    <SummaryCard key={key} kpi={key} value={value} prevValue={0} />
                  );
                })}
              </div>

              {/* ── TABELA DINÂMICA ─────────────────────────────── */}
              <div className="report-table-section">
                <div className="report-section-title">
                  <span>📅</span> Evolução Mensal — {tableRows.length} {tableRows.length === 1 ? "mês" : "meses"}
                </div>

                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th className="report-th report-th-mes">Mês</th>
                        {orderedKpis.map(kpi => (
                          <th key={kpi.key} className="report-th report-th-num">
                            <span className="kpi-icon">{kpi.icon}</span>
                            {kpi.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row, idx) => {
                        const isBest = highlight && idx === bestRowIdx;
                        return (
                          <tr key={row.mes} className={"report-tr" + (isBest ? " report-tr-best" : "") + (idx % 2 === 1 ? " report-tr-alt" : "")}>
                            <td className="report-td report-td-mes">
                              {isBest && <span className="best-badge">★</span>}
                              {row.mes}
                            </td>
                            {orderedKpis.map(kpi => (
                              <td key={kpi.key} className="report-td report-td-num">
                                {kpi.fmt(row[kpi.key] ?? 0)}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="report-tr-total">
                        <td className="report-td report-td-mes" style={{ fontWeight: 800 }}>TOTAL</td>
                        {orderedKpis.map(kpi => (
                          <td key={kpi.key} className="report-td report-td-num" style={{ fontWeight: 800 }}>
                            {kpi.fmt(totalRow[kpi.key] ?? 0)}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* ── INSIGHTS AUTOMÁTICOS ────────────────────────── */}
              {insights.length > 0 && (
                <div className="report-insights-section">
                  <div className="report-section-title">
                    <span>⚡</span> Insights Automáticos
                  </div>
                  <div className="report-insights-grid">
                    {insights.map((ins, i) => (
                      <div key={i} className="report-insight-chip">
                        <span className="insight-icon">{ins.icon}</span>
                        <span dangerouslySetInnerHTML={{ __html: ins.text }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── DISTRIBUIÇÃO POR PLATAFORMA ─────────────────── */}
              {timeline && timeline.some(r => r.google > 0 || r.meta > 0) && (
                <div className="report-platform-section">
                  <div className="report-section-title">
                    <span>🔀</span> Distribuição por Plataforma
                  </div>
                  <div className="report-platform-cards">
                    {(() => {
                      const totalG = timeline.reduce((s, r) => s + (r.google || 0), 0);
                      const totalM = timeline.reduce((s, r) => s + (r.meta   || 0), 0);
                      const totalAll = totalG + totalM;
                      const pctG = totalAll > 0 ? (totalG / totalAll) * 100 : 0;
                      const pctM = totalAll > 0 ? (totalM / totalAll) * 100 : 0;
                      return [
                        { label: "Google Ads", color: "#FBBC05", rgb: "251,188,5", value: totalG, pct: pctG },
                        { label: "Meta Ads",   color: "#0866FF", rgb: "8,102,255", value: totalM, pct: pctM },
                      ].map(p => (
                        <div key={p.label} className="platform-card" style={{ borderColor: "rgba(" + p.rgb + ",0.25)", background: "rgba(" + p.rgb + ",0.06)" }}>
                          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: p.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                            {p.label}
                          </div>
                          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--text-primary)" }}>
                            {brl.format(p.value)}
                          </div>
                          <div style={{ marginTop: 8, height: 5, background: "var(--border-soft)", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ width: p.pct + "%", height: "100%", background: p.color, borderRadius: 99, boxShadow: "0 0 8px rgba(" + p.rgb + ",0.5)", transition: "width 0.8s ease" }} />
                          </div>
                          <div style={{ fontSize: "0.72rem", color: p.color, fontWeight: 700, marginTop: 4 }}>
                            {p.pct.toFixed(1).replace(".", ",")}% do investimento
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </>
          )}

          {/* RODAPÉ */}
          <div className="report-footer">
            <span>Orbit BI — Inteligência de Mídia Paga</span>
            <span>Gerado em {today}</span>
            <span>{clientName || "Relatório Executivo"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
