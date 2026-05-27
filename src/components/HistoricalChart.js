"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "@/lib/ThemeContext";

// ECharts carregado no lado do cliente (evita SSR issues)
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

// ─── Formatadores ─────────────────────────────────────────────────────────────
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brl2 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pctFmt = (v) => (v >= 0 ? "+" : "") + v.toFixed(1).replace(".", ",") + "%";
const num = new Intl.NumberFormat("pt-BR");

// ─── Paleta (gerada dinamicamente pelo hook) ─────────────────────────────────
function usePalette() {
  const { theme } = useTheme();
  const dark = theme !== "light";
  return {
    google:  "#5B9CF6",
    meta:    "#34D399",
    leads:   "#FBBF24",
    bg:      dark ? "#0A0F1E"                       : "#ffffff",
    surface: dark ? "#0f1629"                       : "#f8fafc",
    border:  dark ? "rgba(255,255,255,0.07)"        : "rgba(15,23,42,0.08)",
    text:    dark ? "rgba(245,247,251,0.85)"        : "#1e293b",
    muted:   dark ? "rgba(245,247,251,0.42)"        : "#64748b",
    gridCol: dark ? "rgba(255,255,255,0.05)"        : "rgba(15,23,42,0.06)",
    tooltipBg: dark ? "rgba(10,15,30,0.96)"        : "rgba(255,255,255,0.98)",
    tooltipBorder: dark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.12)",
    isDark: dark,
  };
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiMini({ label, value, accent, sub }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      flex: "1 1 120px",
      minWidth: 0,
      background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
      border: `1px solid rgba(255,255,255,0.07)`,
      borderRadius: 14,
      padding: "1.1rem 1.25rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.3rem",
      transition: "opacity 0.45s ease, transform 0.45s ease",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(10px)",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${accent}55, transparent)`,
      }} />
      <span style={{ fontSize: "0.7rem", fontWeight: 600, color: C.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontSize: "1.25rem", fontWeight: 800, color: C.text, lineHeight: 1.2 }}>
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: "0.72rem", color: accent, fontWeight: 600 }}>
          {sub}
        </span>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function HistoricalChart({ timeline }) {
  const C = usePalette();
  const chartRef = useRef(null);
  const containerRef = useRef(null);

  const data = useMemo(() => {
    if (timeline && timeline.length >= 1) return timeline;
    return [];
  }, [timeline]);

  const kpis = useMemo(() => {
    if (!data.length) return null;
    const totalInvest = data.reduce((s, d) => s + (d.google || 0) + (d.meta || 0), 0);
    const totalLeads  = data.reduce((s, d) => s + (d.leads || 0), 0);
    const cplMedio    = totalLeads > 0 ? totalInvest / totalLeads : 0;
    const byTotal = data.map(d => ({ mes: d.mes, total: (d.google || 0) + (d.meta || 0), leads: d.leads || 0 }));
    const bestMonth = byTotal.reduce((best, d) => d.leads > best.leads ? d : best, byTotal[0]);
    const first = (data[0].google || 0) + (data[0].meta || 0);
    const last  = (data[data.length - 1].google || 0) + (data[data.length - 1].meta || 0);
    const growth = first > 0 ? ((last - first) / first) * 100 : 0;
    return { totalInvest, totalLeads, cplMedio, bestMonth, growth };
  }, [data]);

  const growthByMonth = useMemo(() => {
    return data.map((d, i) => {
      if (i === 0) return 0;
      const prev = (data[i - 1].google || 0) + (data[i - 1].meta || 0);
      const curr = (d.google || 0) + (d.meta || 0);
      return prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    });
  }, [data]);

  const option = useMemo(() => {
    const months  = data.map(d => d.mes);
    const googleV = data.map(d => d.google || 0);
    const metaV   = data.map(d => d.meta   || 0);
    const leadsV  = data.map(d => d.leads  || 0);
    const maxInvest = Math.max(...googleV.map((g, i) => g + metaV[i]), 1) * 1.35;
    const maxLeads  = Math.max(...leadsV, 1) * 1.35;

    return {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 900,
      animationEasing: "cubicOut",
      animationDelay: (idx) => idx * 60,
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          crossStyle: { color: C.border, width: 1 },
          lineStyle: { color: C.gridCol, width: 1 },
          label: { show: false },
        },
        backgroundColor: C.tooltipBg,
        borderColor: C.tooltipBorder,
        borderRadius: 12,
        borderWidth: 1,
        padding: [14, 18],
        textStyle: { color: C.text, fontFamily: "Inter, sans-serif", fontSize: 13 },
        extraCssText: "backdrop-filter: blur(12px); box-shadow: 0 8px 32px rgba(0,0,0,0.5);",
        formatter: (params) => {
          const idx   = params[0]?.dataIndex ?? 0;
          const month = months[idx];
          const gVal  = googleV[idx];
          const mVal  = metaV[idx];
          const lVal  = leadsV[idx];
          const total = gVal + mVal;
          const cpl   = lVal > 0 ? total / lVal : 0;
          const grow  = growthByMonth[idx];
          const growColor = grow >= 0 ? "#34D399" : "#F87171";
          const growIcon  = grow >= 0 ? "▲" : "▼";
          return `<div style="font-family:Inter,sans-serif;min-width:210px">
            <div style="font-weight:700;font-size:13px;color:rgba(245,247,251,0.95);margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.08)">${month}</div>
            <div style="display:flex;flex-direction:column;gap:5px;">
              <div style="display:flex;justify-content:space-between;align-items:center"><span style="color:#5B9CF6;font-size:12px">● Google Ads</span><span style="font-weight:600;color:rgba(245,247,251,0.9)">${brl.format(gVal)}</span></div>
              <div style="display:flex;justify-content:space-between;align-items:center"><span style="color:#34D399;font-size:12px">● Meta Ads</span><span style="font-weight:600;color:rgba(245,247,251,0.9)">${brl.format(mVal)}</span></div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.07)"><span style="color:rgba(245,247,251,0.55);font-size:12px">Total</span><span style="font-weight:700;color:rgba(245,247,251,0.95)">${brl.format(total)}</span></div>
              <div style="display:flex;justify-content:space-between;align-items:center"><span style="color:#FBBF24;font-size:12px">◆ Leads</span><span style="font-weight:600;color:rgba(245,247,251,0.9)">${num.format(lVal)}</span></div>
              <div style="display:flex;justify-content:space-between;align-items:center"><span style="color:rgba(245,247,251,0.55);font-size:12px">CPL</span><span style="font-weight:600;color:rgba(245,247,251,0.9)">${brl2.format(cpl)}</span></div>
              ${idx > 0 ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.07)"><span style="color:rgba(245,247,251,0.55);font-size:12px">Crescimento</span><span style="font-weight:700;color:${growColor}">${growIcon} ${Math.abs(grow).toFixed(1).replace(".",",")}%</span></div>` : ""}
            </div></div>`;
        },
      },
      legend: { show: false },
      grid: { left: 72, right: 66, top: 24, bottom: 48, containLabel: false },
      xAxis: {
        type: "category",
        data: months,
        axisLine:  { lineStyle: { color: "rgba(255,255,255,0.06)" } },
        axisTick:  { show: false },
        axisLabel: { color: C.muted, fontFamily: "Inter, sans-serif", fontSize: 10.5, margin: 14, interval: 0 },
        splitLine: { show: false },
      },
      yAxis: [
        {
          type: "value", name: "", max: maxInvest, min: 0, splitNumber: 4,
          axisLine: { show: false }, axisTick: { show: false },
          splitLine: { lineStyle: { color: C.gridCol, type: "dashed" } },
          axisLabel: { color: C.muted, fontFamily: "Inter, sans-serif", fontSize: 10.5, formatter: (v) => brl.format(v) },
        },
        {
          type: "value", name: "", max: maxLeads, min: 0, splitNumber: 4,
          axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false },
          axisLabel: { color: "rgba(251,191,36,0.6)", fontFamily: "Inter, sans-serif", fontSize: 10.5, formatter: (v) => num.format(Math.round(v)) },
        },
      ],
      series: [
        {
          name: "Google Ads", type: "bar", yAxisIndex: 0, data: googleV, barWidth: "22%", barGap: "8%",
          itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#5B9CF6" }, { offset: 1, color: "rgba(91,156,246,0.25)" }] }, borderRadius: [5, 5, 0, 0] },
          emphasis: { itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#7BB7FF" }, { offset: 1, color: "rgba(123,183,255,0.4)" }] }, shadowBlur: 12, shadowColor: "rgba(91,156,246,0.5)" } },
        },
        {
          name: "Meta Ads", type: "bar", yAxisIndex: 0, data: metaV, barWidth: "22%",
          itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#34D399" }, { offset: 1, color: "rgba(52,211,153,0.2)" }] }, borderRadius: [5, 5, 0, 0] },
          emphasis: { itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#6EEEC7" }, { offset: 1, color: "rgba(110,238,199,0.4)" }] }, shadowBlur: 12, shadowColor: "rgba(52,211,153,0.5)" } },
        },
        {
          name: "Leads", type: "line", yAxisIndex: 1, data: leadsV, smooth: 0.55, symbol: "circle", symbolSize: 7,
          lineStyle: { color: C.leads, width: 2.5, shadowBlur: 10, shadowColor: "rgba(251,191,36,0.45)" },
          itemStyle: { color: C.leads, borderColor: C.bg, borderWidth: 2 },
          emphasis: { scale: true, itemStyle: { shadowBlur: 16, shadowColor: "rgba(251,191,36,0.7)" } },
          areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(251,191,36,0.15)" }, { offset: 1, color: "rgba(251,191,36,0.01)" }] } },
        },
      ],
    };
  }, [data, growthByMonth, C]);

  // ── ResizeObserver: redesenha ECharts ao redimensionar o container ───────
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      const instance = chartRef.current?.getEchartsInstance?.();
      if (instance && !instance.isDisposed()) {
        instance.resize();
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // ── Dispose ECharts na desmontagem ───────────────────────────────────────
  useEffect(() => {
    return () => {
      const instance = chartRef.current?.getEchartsInstance?.();
      if (instance && !instance.isDisposed()) {
        instance.dispose();
      }
    };
  }, []);

  if (!data || data.length === 0) {
    return (
      <article
        className="chart-panel wide"
        id="comparacao"
        style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "2.5rem", minHeight: 280, opacity: 0.5 }}
      >
        <div style={{ fontSize: 32, opacity: 0.4 }}>📊</div>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.88rem", margin: 0, textAlign: "center" }}>
          Nenhum dado importado ainda.<br />Importe um relatório para visualizar o histórico de investimento.
        </p>
      </article>
    );
  }

  if (!kpis) return null;

  const growthColor = kpis.growth >= 0 ? C.meta : "#F87171";
  const growthLabel = kpis.growth >= 0 ? `▲ ${pctFmt(kpis.growth)}` : `▼ ${pctFmt(kpis.growth)}`;

  return (
    <article
      className="chart-panel wide"
      id="comparacao"
      ref={containerRef}
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "1.5rem 1.6rem", minWidth: 0, overflow: "hidden" }}
    >
      {/* ── Cabeçalho ────────────────────────────────────────────────────── */}
      <div className="panel-heading" style={{ marginBottom: 0 }}>
        <div>
          <p className="eyebrow">Evolução Histórica</p>
          <h2 style={{ margin: 0 }}>Investimento &amp; Leads por Período</h2>
        </div>
        <div style={{ display: "flex", gap: "1.4rem", alignItems: "center", flexWrap: "wrap" }}>
          {[
            { color: C.google, label: "Google Ads",  shape: "rect"  },
            { color: C.meta,   label: "Meta Ads",    shape: "rect"  },
            { color: C.leads,  label: "Total Leads", shape: "circle"},
          ].map(s => (
            <span key={s.label} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: C.muted, fontWeight: 500 }}>
              {s.shape === "rect"
                ? <span style={{ width: 12, height: 12, borderRadius: 3, background: s.color, display: "inline-block", boxShadow: `0 0 6px ${s.color}55` }} />
                : <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, display: "inline-block", boxShadow: `0 0 6px ${s.color}88` }} />
              }
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <KpiMini label="Total Investido" value={brl.format(kpis.totalInvest)} accent={C.google} sub={`${data.length} meses`} />
        <KpiMini label="Leads Totais"    value={num.format(kpis.totalLeads)}  accent={C.leads}  sub="Todos os canais" />
        <KpiMini label="CPL Médio"       value={brl2.format(kpis.cplMedio)}   accent={C.meta}   sub="Custo por lead" />
        <KpiMini label="Melhor Mês"      value={kpis.bestMonth?.mes?.split("/")[0] ?? "—"} accent={C.leads} sub={`${num.format(kpis.bestMonth?.leads || 0)} leads`} />
        <KpiMini label="Crescimento"     value={growthLabel}                  accent={growthColor} sub="Primeiro vs último mês" />
      </div>

      {/* ── Gráfico ECharts ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 280, minWidth: 0, width: "100%" }}>
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: "280px", width: "100%" }}
          opts={{ renderer: "canvas", devicePixelRatio: typeof window !== "undefined" ? (window.devicePixelRatio || 2) : 2 }}
          notMerge={false}
          lazyUpdate={false}
          theme={null}
        />
      </div>
    </article>
  );
}
