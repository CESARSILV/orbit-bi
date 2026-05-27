"use client";

import { useState, useMemo, useRef, useCallback } from "react";

// ─── Formatadores ─────────────────────────────────────────────────────────────
const brl  = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brl2 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num  = new Intl.NumberFormat("pt-BR");
const pct  = (v) => `${(v || 0).toFixed(2).replace(".", ",")}%`;

// ─── Definição dos KPIs disponíveis ──────────────────────────────────────────
const KPI_DEFS = [
  { key: "investimento", label: "Investimento",  icon: "💰", fmt: (v) => brl.format(v),  desc: "Gasto total em mídia paga" },
  { key: "cliques",      label: "Cliques",        icon: "🖱️", fmt: (v) => num.format(v),  desc: "Cliques nos anúncios" },
  { key: "impressoes",   label: "Impressões",     icon: "👁️", fmt: (v) => num.format(v),  desc: "Total de exibições" },
  { key: "ctr",          label: "CTR",            icon: "📊", fmt: (v) => pct(v * 100),   desc: "Taxa de cliques" },
  { key: "cpc",          label: "CPC",            icon: "💲", fmt: (v) => brl2.format(v), desc: "Custo por clique" },
  { key: "cpm",          label: "CPM",            icon: "📣", fmt: (v) => brl2.format(v), desc: "Custo por mil impressões" },
  { key: "leads",        label: "Leads",          icon: "🎯", fmt: (v) => num.format(v),  desc: "Leads captados" },
  { key: "conversoes",   label: "Conversões",     icon: "✅", fmt: (v) => num.format(v),  desc: "Total de conversões" },
  { key: "cpa",          label: "CPA",            icon: "🏷️", fmt: (v) => brl2.format(v), desc: "Custo por aquisição" },
  { key: "cpl",          label: "CPL",            icon: "📋", fmt: (v) => brl2.format(v), desc: "Custo por lead" },
  { key: "alcance",      label: "Alcance",        icon: "🌐", fmt: (v) => num.format(v),  desc: "Pessoas alcançadas" },
];

const DEFAULT_KPIS = ["investimento", "cliques", "impressoes", "ctr", "leads", "conversoes", "cpa", "cpl"];

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
      background: checked ? "rgba(91,156,246,0.12)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${checked ? "rgba(91,156,246,0.35)" : "rgba(255,255,255,0.07)"}`,
      transition: "all 0.18s ease",
      userSelect: "none",
    }}>
      <input type="checkbox" checked={checked} onChange={() => onChange(kpi.key)}
        style={{ display: "none" }} />
      <span style={{ fontSize: 14 }}>{kpi.icon}</span>
      <span style={{
        fontSize: "0.78rem", fontWeight: 600,
        color: checked ? "#7bb7ff" : "rgba(245,247,251,0.55)",
      }}>{kpi.label}</span>
      <span style={{
        marginLeft: "auto", width: 14, height: 14, borderRadius: 4,
        background: checked ? "#5b9cf6" : "rgba(255,255,255,0.08)",
        border: `2px solid ${checked ? "#5b9cf6" : "rgba(255,255,255,0.15)"}`,
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
  const formatted = def.fmt(value);
  const delta = prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : null;
  const isPositive = delta >= 0;

  return (
    <div style={{
      flex: "1 1 140px", minWidth: 0,
      background: "linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: "14px 16px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, #5b9cf6, #34d399)",
        borderRadius: "12px 12px 0 0",
      }} />
      <div style={{ fontSize: 18, marginBottom: 4 }}>{def.icon}</div>
      <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(245,247,251,0.38)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
        {def.label}
      </div>
      <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "rgba(245,247,251,0.95)", lineHeight: 1.1 }}>
        {formatted}
      </div>
      {delta !== null && (
        <div style={{
          marginTop: 6, display: "inline-flex", alignItems: "center", gap: 3,
          fontSize: "0.68rem", fontWeight: 700,
          color: isPositive ? "#34d399" : "#f87171",
          background: isPositive ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
          border: `1px solid ${isPositive ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`,
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

  // Melhor mês por conversões
  const byConv = [...rows].sort((a, b) => b.conversoes - a.conversoes);
  if (byConv[0]?.conversoes > 0) {
    insights.push({
      icon: "✅",
      text: `<strong>${byConv[0].mes}</strong> liderou em conversões com <strong>${num.format(byConv[0].conversoes)} conversões</strong>.`,
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

  // Config state
  const [selectedKpis, setSelectedKpis]   = useState(DEFAULT_KPIS);
  const [clientName,   setClientName]      = useState("");
  const [groupBy,      setGroupBy]         = useState("mes"); // mes | campanha
  const [showConfig,   setShowConfig]      = useState(true);
  const [highlight,    setHighlight]       = useState(true); // linha de destaque

  // Toggle KPI
  const toggleKpi = useCallback((key) => {
    setSelectedKpis(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }, []);

  // Ordenar KPIs na mesma ordem de KPI_DEFS
  const orderedKpis = KPI_DEFS.filter(d => selectedKpis.includes(d.key));

  // Montar linhas da tabela a partir do timeline
  const tableRows = useMemo(() => {
    if (!timeline || timeline.length === 0) return [];
    return timeline.map(row => ({
      mes:         row.mes || row.reference_month || "—",
      ...calcRowKpis({
        investimento: row.investimento || 0,
        cliques:      row.google !== undefined ? (row.google + row.meta) : 0,
        impressoes:   0,
        leads:        row.leads       || 0,
        conversoes:   row.conversoes  || 0,
        alcance:      0,
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

  // Export PDF via print
  const handleExportPdf = () => {
    window.print();
  };

  const hasData = tableRows.length > 0;

  return (
    <section className="report-builder-root" id="relatorios">
      {/* ── CONFIG PANEL ─────────────────────────────────────────── */}
      <aside className={`report-config-panel ${showConfig ? "open" : ""}`}>
        <div className="report-config-inner">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "rgba(245,247,251,0.9)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              ⚙️ Configurar
            </h3>
            <button onClick={() => setShowConfig(false)} style={{
              background: "none", border: "none", color: "rgba(255,255,255,0.3)",
              cursor: "pointer", fontSize: 16, padding: 4,
            }}>✕</button>
          </div>

          {/* Nome do cliente */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "rgba(245,247,251,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
              Nome do Cliente
            </label>
            <input
              type="text"
              placeholder="Ex: Empresa XYZ"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8, padding: "8px 10px",
                color: "rgba(245,247,251,0.9)", fontSize: "0.85rem",
                outline: "none",
              }}
            />
          </div>

          {/* KPIs */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "rgba(245,247,251,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
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

          {/* Opções */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "rgba(245,247,251,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
              Opções Visuais
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.82rem", color: "rgba(245,247,251,0.65)" }}>
              <input type="checkbox" checked={highlight} onChange={e => setHighlight(e.target.checked)} />
              Destacar melhor mês
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
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "7px 12px",
                color: "rgba(245,247,251,0.7)",
                fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
              }}>
                ⚙️ Configurar
              </button>
            )}
            <div>
              <p style={{ margin: 0, fontSize: "0.68rem", color: "rgba(245,247,251,0.38)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                Orbit BI — Report Builder
              </p>
              <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "rgba(245,247,251,0.95)" }}>
                Relatório Executivo
              </h1>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "rgba(245,247,251,0.4)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 10px" }}>
              {platformLabel}
            </span>
            <span style={{ fontSize: "0.75rem", color: "rgba(245,247,251,0.4)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 10px" }}>
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
                background: "linear-gradient(135deg, #5b9cf6, #34d399)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 900, color: "#fff", flexShrink: 0,
              }}>O</div>
              <div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "rgba(245,247,251,0.95)", lineHeight: 1 }}>
                  Orbit BI
                </div>
                <div style={{ fontSize: "0.72rem", color: "rgba(245,247,251,0.38)", fontWeight: 500 }}>
                  Inteligência de mídia paga
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: "rgba(245,247,251,0.95)" }}>
                {clientName || "Relatório Executivo"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "rgba(245,247,251,0.45)", marginTop: 2 }}>
                {platformLabel} · {periodLabel}
              </div>
              <div style={{ fontSize: "0.68rem", color: "rgba(245,247,251,0.3)", marginTop: 2 }}>
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
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "rgba(245,247,251,0.5)" }}>
                Nenhum dado disponível
              </div>
              <div style={{ fontSize: "0.85rem", color: "rgba(245,247,251,0.3)", maxWidth: 400, lineHeight: 1.6 }}>
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
                          <tr key={row.mes} className={`report-tr ${isBest ? "report-tr-best" : ""} ${idx % 2 === 1 ? "report-tr-alt" : ""}`}>
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
                        { label: "Google Ads", color: "#5b9cf6", rgb: "91,156,246", value: totalG, pct: pctG },
                        { label: "Meta Ads",   color: "#34d399", rgb: "52,211,153", value: totalM, pct: pctM },
                      ].map(p => (
                        <div key={p.label} className="platform-card" style={{ borderColor: `rgba(${p.rgb},0.25)`, background: `rgba(${p.rgb},0.06)` }}>
                          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: p.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                            {p.label}
                          </div>
                          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "rgba(245,247,251,0.95)" }}>
                            {brl.format(p.value)}
                          </div>
                          <div style={{ marginTop: 8, height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ width: `${p.pct}%`, height: "100%", background: p.color, borderRadius: 99, boxShadow: `0 0 8px rgba(${p.rgb},0.5)`, transition: "width 0.8s ease" }} />
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
