"use client";

import { useEffect, useRef, useState, useMemo } from "react";

// ─── Formatadores ─────────────────────────────────────────────────────────────
const brl  = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brl2 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct  = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1).replace(".", ",")}%`;
const numFmt = new Intl.NumberFormat("pt-BR");

// ─── Paleta de identidade visual por dispositivo ──────────────────────────────
const DEVICE_CONFIG = {
  mobile: {
    label: "Mobile",
    sublabel: "Celular / Smartphone",
    hex:   "#22D3EE",
    rgb:   "34,211,238",
    hex2:  "#0EA5E9",
    rgb2:  "14,165,233",
    glow:  "rgba(34,211,238,0.35)",
    gradient: "linear-gradient(135deg, #22D3EE 0%, #0EA5E9 60%, #6366F1 100%)",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="3" />
        <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  desktop: {
    label: "Desktop",
    sublabel: "Computador / PC",
    hex:   "#A78BFA",
    rgb:   "167,139,250",
    hex2:  "#818CF8",
    rgb2:  "129,140,248",
    glow:  "rgba(167,139,250,0.35)",
    gradient: "linear-gradient(135deg, #A78BFA 0%, #818CF8 60%, #6366F1 100%)",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <polyline points="8 21 12 17 16 21" />
      </svg>
    ),
  },
  tablet: {
    label: "Tablet",
    sublabel: "iPad / Tablet Android",
    hex:   "#FBBF24",
    rgb:   "251,191,36",
    hex2:  "#F59E0B",
    rgb2:  "245,158,11",
    glow:  "rgba(251,191,36,0.35)",
    gradient: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 60%, #EF4444 100%)",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="3" />
        <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
};

// ─── Hook: animação numérica suave ────────────────────────────────────────────
function useCountUp(target, duration = 700, decimals = 0) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    startRef.current = null;
    cancelAnimationFrame(rafRef.current);

    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * ease;
      setValue(parseFloat(current.toFixed(decimals)));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else { setValue(to); fromRef.current = to; }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, decimals]);

  return value;
}

// ─── Radial Progress Ring ─────────────────────────────────────────────────────
function RadialRing({ percent, hex, rgb, size = 80, stroke = 6 }) {
  const [animPct, setAnimPct] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    let start = null;
    const from = 0;
    const to = Math.min(percent, 100);
    const dur = 900;

    cancelAnimationFrame(rafRef.current);
    setAnimPct(0);

    const tick = (ts) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setAnimPct(from + (to - from) * ease);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [percent]);

  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (animPct / 100) * circ;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      {/* trilha */}
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      {/* progresso */}
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={`url(#ring-grad-${hex.replace("#","")})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        style={{ filter: `drop-shadow(0 0 6px rgba(${rgb},0.7))` }}
      />
      <defs>
        <linearGradient id={`ring-grad-${hex.replace("#","")}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={hex} />
          <stop offset="100%" stopColor={hex} stopOpacity="0.6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Mini Sparkline ───────────────────────────────────────────────────────────
function Sparkline({ values, hex, width = 64, height = 24 }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = (max - min) || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`spark-${hex.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hex} stopOpacity="0.3" />
          <stop offset="100%" stopColor={hex} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={hex} strokeWidth={1.5}
        strokeLinejoin="round" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${hex}88)` }} />
    </svg>
  );
}

// ─── Performance Score Badge ───────────────────────────────────────────────────
function ScoreBadge({ score, hex, rgb }) {
  const displayed = useCountUp(score, 800);
  const tier = score >= 80 ? "Excelente" : score >= 60 ? "Bom" : score >= 40 ? "Regular" : "Baixo";
  const tierColor = score >= 80 ? "#22D3EE" : score >= 60 ? "#A78BFA" : score >= 40 ? "#FBBF24" : "#F87171";

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      background: `rgba(${rgb},0.07)`,
      border: `1px solid rgba(${rgb},0.18)`,
      borderRadius: 10, padding: "8px 12px",
      minWidth: 64,
    }}>
      <span style={{ fontSize: 18, fontWeight: 900, color: hex, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {displayed}
      </span>
      <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Score
      </span>
      <span style={{ fontSize: 9, fontWeight: 700, color: tierColor }}>
        {tier}
      </span>
    </div>
  );
}

// ─── Animated Bar ─────────────────────────────────────────────────────────────
function AnimatedBar({ percent, hex, rgb, gradient, isDominant }) {
  const [barPct, setBarPct] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    let start = null;
    cancelAnimationFrame(rafRef.current);
    setBarPct(0);
    const dur = 1000;

    const tick = (ts) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3.5);
      setBarPct(percent * ease);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    const delay = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick);
    }, 80);

    return () => { clearTimeout(delay); cancelAnimationFrame(rafRef.current); };
  }, [percent]);

  return (
    <div style={{
      position: "relative", height: 8, borderRadius: 999,
      background: "rgba(255,255,255,0.06)",
      overflow: "visible",
    }}>
      {/* Barra principal */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: `${barPct}%`,
        borderRadius: 999,
        background: gradient,
        transition: "none",
        boxShadow: isDominant
          ? `0 0 16px rgba(${rgb},0.6), 0 0 32px rgba(${rgb},0.3), inset 0 1px 0 rgba(255,255,255,0.2)`
          : `0 0 8px rgba(${rgb},0.35), inset 0 1px 0 rgba(255,255,255,0.1)`,
      }}>
        {/* Shimmer interno */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 999,
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmerBar 2s linear infinite",
        }} />
        {/* Brilho na ponta */}
        <div style={{
          position: "absolute", right: -2, top: "50%",
          transform: "translateY(-50%)",
          width: 6, height: 6, borderRadius: "50%",
          background: hex,
          boxShadow: `0 0 8px ${hex}, 0 0 16px rgba(${rgb},0.8)`,
        }} />
      </div>
    </div>
  );
}

// ─── Metric Pill ──────────────────────────────────────────────────────────────
function MetricPill({ label, value, hex, rgb, highlight }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 2,
      padding: "8px 10px",
      borderRadius: 8,
      background: highlight ? `rgba(${rgb},0.1)` : "rgba(255,255,255,0.04)",
      border: `1px solid ${highlight ? `rgba(${rgb},0.25)` : "rgba(255,255,255,0.07)"}`,
      transition: "all 0.3s ease",
    }}>
      <span style={{
        fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.38)",
        letterSpacing: "0.06em", textTransform: "uppercase",
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 13, fontWeight: 800,
        color: highlight ? hex : "rgba(245,247,251,0.88)",
        lineHeight: 1.1,
      }}>
        {value}
      </span>
    </div>
  );
}

// ─── Device Card Premium ───────────────────────────────────────────────────────
function DeviceCard({ deviceKey, data, totalInvest, allData, rank, isDominant }) {
  const cfg = DEVICE_CONFIG[deviceKey];
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), rank * 120);
    return () => clearTimeout(t);
  }, [rank]);

  // Métricas computadas
  const ctr    = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
  const cpc    = data.clicks > 0 ? data.invest / data.clicks : 0;
  const cpa    = data.conv > 0 ? data.invest / data.conv : 0;
  const cvRate = data.clicks > 0 ? (data.conv / data.clicks) * 100 : 0;

  // Performance Score (0-100)
  const score = useMemo(() => {
    const weights = { ctr: 25, cvRate: 35, cpa: 25, volume: 15 };
    // CTR score: 0–5% = 0–100
    const ctrScore = Math.min(ctr * 20, 100);
    // Conversion Rate score: 0–10% = 0–100
    const cvScore  = Math.min(cvRate * 10, 100);
    // CPA score: inversamente proporcional — melhor CPA = maior score
    const allCpas = allData.map(d => d.conv > 0 ? d.invest / d.conv : Infinity).filter(isFinite);
    const minCpa = allCpas.length ? Math.min(...allCpas) : 1;
    const cpaScore = cpa > 0 && isFinite(cpa) ? Math.min((minCpa / cpa) * 100, 100) : 0;
    // Volume score: participação do investimento
    const volScore = totalInvest > 0 ? (data.invest / totalInvest) * 100 : 0;

    return Math.round(
      (ctrScore * weights.ctr +
       cvScore  * weights.cvRate +
       cpaScore * weights.cpa +
       volScore * weights.volume) / 100
    );
  }, [data, allData, totalInvest, ctr, cvRate, cpa]);

  // Sparkline simulada a partir dos dados disponíveis (variação proporcional)
  const sparkValues = useMemo(() => {
    if (!data.invest) return [];
    const base = data.invest;
    return [base * 0.72, base * 0.81, base * 0.78, base * 0.9, base * 0.95, base * 1.0];
  }, [data.invest]);

  const shareLabel = totalInvest > 0
    ? `${((data.invest / totalInvest) * 100).toFixed(1)}%`
    : "—";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: "1 1 240px",
        minWidth: 0,
        maxWidth: "100%",
        position: "relative",
        borderRadius: 16,
        border: `1px solid ${isDominant ? `rgba(${cfg.rgb},0.35)` : "rgba(255,255,255,0.08)"}`,
        background: isDominant
          ? `linear-gradient(145deg, rgba(${cfg.rgb},0.08) 0%, rgba(${cfg.rgb},0.03) 100%)`
          : "rgba(255,255,255,0.025)",
        padding: "20px",
        cursor: "default",
        transition: "all 0.35s cubic-bezier(0.34,1.2,0.64,1)",
        opacity: visible ? 1 : 0,
        transform: visible
          ? hovered ? "translateY(-4px)" : "translateY(0)"
          : "translateY(20px)",
        boxShadow: isDominant
          ? `0 0 0 1px rgba(${cfg.rgb},0.15), 0 8px 40px rgba(${cfg.rgb},0.15), inset 0 1px 0 rgba(255,255,255,0.07)`
          : hovered
            ? `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(${cfg.rgb},0.2)`
            : "0 4px 16px rgba(0,0,0,0.2)",
        boxSizing: "border-box",
      }}
    >
      {/* Glow de fundo para o dominante */}
      {isDominant && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: 16,
          background: `radial-gradient(ellipse at 50% 0%, rgba(${cfg.rgb},0.12) 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
      )}

      {/* ── Header do card ─────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        {/* Ícone + título */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: `linear-gradient(135deg, rgba(${cfg.rgb},0.25) 0%, rgba(${cfg.rgb},0.1) 100%)`,
            border: `1px solid rgba(${cfg.rgb},0.3)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: cfg.hex,
            boxShadow: `0 4px 16px rgba(${cfg.rgb},0.2)`,
          }}>
            {cfg.icon}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "rgba(245,247,251,0.95)" }}>
                {cfg.label}
              </span>
              {isDominant && (
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: "0.07em",
                  padding: "2px 7px", borderRadius: 99,
                  background: `rgba(${cfg.rgb},0.2)`,
                  border: `1px solid rgba(${cfg.rgb},0.4)`,
                  color: cfg.hex,
                  textTransform: "uppercase",
                }}>
                  ★ Dominante
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
              {cfg.sublabel}
            </span>
          </div>
        </div>

        {/* Score + Sparkline */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <ScoreBadge score={score} hex={cfg.hex} rgb={cfg.rgb} />
          {sparkValues.length >= 2 && (
            <Sparkline values={sparkValues} hex={cfg.hex} />
          )}
        </div>
      </div>

      {/* ── Radial ring + investimento principal ───────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <RadialRing percent={data.percent || 0} hex={cfg.hex} rgb={cfg.rgb} size={76} stroke={6} />
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 1,
          }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: "rgba(245,247,251,0.95)", lineHeight: 1 }}>
              {(data.percent || 0).toFixed(0)}%
            </span>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              share
            </span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "rgba(245,247,251,0.95)", lineHeight: 1, marginBottom: 2 }}>
            {brl.format(data.invest || 0)}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginBottom: 8 }}>
            Investimento total
          </div>
          {/* Barra de progresso premium */}
          <AnimatedBar
            percent={data.percent || 0}
            hex={cfg.hex}
            rgb={cfg.rgb}
            gradient={cfg.gradient}
            isDominant={isDominant}
          />
        </div>
      </div>

      {/* ── Grid de métricas ───────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 6,
        marginBottom: 14,
      }}>
        <MetricPill label="Cliques"    value={numFmt.format(data.clicks || 0)}     hex={cfg.hex} rgb={cfg.rgb} />
        <MetricPill label="Conversões" value={numFmt.format(data.conv || 0)}        hex={cfg.hex} rgb={cfg.rgb} highlight={data.conv > 0} />
        <MetricPill label="CTR"        value={`${ctr.toFixed(2).replace(".",",")}%`} hex={cfg.hex} rgb={cfg.rgb} />
        <MetricPill label="CPC"        value={brl2.format(cpc)}                    hex={cfg.hex} rgb={cfg.rgb} />
        <MetricPill label="CPA"        value={data.conv > 0 ? brl2.format(cpa) : "—"} hex={cfg.hex} rgb={cfg.rgb} highlight={data.conv > 0} />
        <MetricPill label="Conv. Rate" value={`${cvRate.toFixed(1).replace(".",",")}%`} hex={cfg.hex} rgb={cfg.rgb} />
      </div>

      {/* ── Indicador de rank ─────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 10px",
        borderRadius: 8,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <span style={{ fontSize: 11, color: cfg.hex, fontWeight: 700 }}>
          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"} #{rank} em volume
        </span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
          {shareLabel} do investimento
        </span>
      </div>
    </div>
  );
}

// ─── Insight card ─────────────────────────────────────────────────────────────
function InsightChip({ icon, text, accent }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8,
      padding: "9px 12px",
      borderRadius: 9,
      background: "rgba(255,255,255,0.035)",
      border: "1px solid rgba(255,255,255,0.07)",
      fontSize: 12,
      color: "rgba(245,247,251,0.7)",
      lineHeight: 1.4,
      transition: "background 0.2s ease",
    }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
      <span dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function DeviceChart({ deviceData }) {
  const isDataAvailable = !!(deviceData && (
    deviceData.mobile?.invest > 0 ||
    deviceData.desktop?.invest > 0 ||
    deviceData.tablet?.invest > 0
  ));

  const empty = { invest: 0, clicks: 0, impressions: 0, conv: 0, percent: 0 };
  const data = {
    mobile:  { ...empty, ...(deviceData?.mobile  || {}) },
    desktop: { ...empty, ...(deviceData?.desktop || {}) },
    tablet:  { ...empty, ...(deviceData?.tablet  || {}) },
  };

  const hasTablet = data.tablet.invest > 0;
  const totalInvest = data.mobile.invest + data.desktop.invest + data.tablet.invest;

  // Ranking por investimento
  const ranked = useMemo(() => {
    const entries = [
      { key: "mobile",  invest: data.mobile.invest  },
      { key: "desktop", invest: data.desktop.invest },
      { key: "tablet",  invest: data.tablet.invest  },
    ].sort((a, b) => b.invest - a.invest);

    return entries.reduce((acc, { key }, i) => {
      acc[key] = i + 1;
      return acc;
    }, {});
  }, [data]);

  const dominantKey = useMemo(() =>
    ["mobile", "desktop", "tablet"].reduce((best, k) =>
      data[k].invest > data[best].invest ? k : best, "mobile"
    ), [data]);

  // Insights dinâmicos
  const insights = useMemo(() => {
    if (!isDataAvailable) return [];
    const tips = [];
    const domCfg = DEVICE_CONFIG[dominantKey];

    // Dominância
    const domPct = totalInvest > 0 ? ((data[dominantKey].invest / totalInvest) * 100).toFixed(1) : 0;
    tips.push({
      icon: domCfg.icon,
      text: `<strong style="color:${domCfg.hex}">${domCfg.label}</strong> domina com <strong style="color:${domCfg.hex}">${domPct}%</strong> do investimento total`,
    });

    // CPA comparativo
    const cpas = {
      mobile:  data.mobile.conv  > 0 ? data.mobile.invest  / data.mobile.conv  : null,
      desktop: data.desktop.conv > 0 ? data.desktop.invest / data.desktop.conv : null,
      tablet:  data.tablet.conv  > 0 ? data.tablet.invest  / data.tablet.conv  : null,
    };
    const validCpas = Object.entries(cpas).filter(([, v]) => v !== null && isFinite(v));
    if (validCpas.length >= 2) {
      validCpas.sort((a, b) => a[1] - b[1]);
      const [bestKey, bestCpa] = validCpas[0];
      const [worstKey, worstCpa] = validCpas[validCpas.length - 1];
      const ratio = worstCpa > 0 ? ((worstCpa - bestCpa) / bestCpa * 100).toFixed(0) : 0;
      const bCfg = DEVICE_CONFIG[bestKey];
      const wCfg = DEVICE_CONFIG[worstKey];
      tips.push({
        icon: "🎯",
        text: `<strong style="color:${bCfg.hex}">${bCfg.label}</strong> tem o melhor CPA — <strong>${ratio}%</strong> menor que <span style="color:${wCfg.hex}">${wCfg.label}</span>`,
      });
    }

    // CTR comparativo
    const ctrs = {
      mobile:  data.mobile.impressions  > 0 ? (data.mobile.clicks  / data.mobile.impressions)  * 100 : 0,
      desktop: data.desktop.impressions > 0 ? (data.desktop.clicks / data.desktop.impressions) * 100 : 0,
    };
    const bestCtrKey = ctrs.mobile > ctrs.desktop ? "mobile" : "desktop";
    const bestCtr = ctrs[bestCtrKey];
    if (bestCtr > 0) {
      const bCfg = DEVICE_CONFIG[bestCtrKey];
      tips.push({
        icon: "📊",
        text: `<strong style="color:${bCfg.hex}">${bCfg.label}</strong> lidera em CTR com <strong style="color:${bCfg.hex}">${bestCtr.toFixed(2).replace(".",",")}%</strong>`,
      });
    }

    // Tablet aviso
    if (hasTablet && data.tablet.invest > 0) {
      const tabletShare = ((data.tablet.invest / totalInvest) * 100).toFixed(1);
      const tCfg = DEVICE_CONFIG.tablet;
      if (parseFloat(tabletShare) < 10) {
        tips.push({
          icon: "⚠️",
          text: `<strong style="color:${tCfg.hex}">Tablet</strong> representa apenas <strong>${tabletShare}%</strong> — volume baixo para análise conclusiva`,
        });
      }
    }

    // Conversão
    const convRates = {
      mobile:  data.mobile.clicks  > 0 ? (data.mobile.conv  / data.mobile.clicks)  * 100 : 0,
      desktop: data.desktop.clicks > 0 ? (data.desktop.conv / data.desktop.clicks) * 100 : 0,
    };
    const bestConvKey = convRates.mobile > convRates.desktop ? "mobile" : "desktop";
    const worstConvKey = bestConvKey === "mobile" ? "desktop" : "mobile";
    if (convRates[bestConvKey] > 0 && convRates[worstConvKey] > 0) {
      const ratio = (convRates[bestConvKey] / convRates[worstConvKey]).toFixed(1);
      const bCfg = DEVICE_CONFIG[bestConvKey];
      tips.push({
        icon: "🚀",
        text: `<strong style="color:${bCfg.hex}">${bCfg.label}</strong> converte <strong style="color:${bCfg.hex}">${ratio}x</strong> mais que ${DEVICE_CONFIG[worstConvKey].label}`,
      });
    }

    return tips.slice(0, 4);
  }, [data, isDataAvailable, dominantKey, hasTablet, totalInvest]);

  // ── All devices list para comparação ──────────────────────────────────────
  const allDevicesData = [data.mobile, data.desktop, ...(hasTablet ? [data.tablet] : [])];

  // ── Deviceskeys a renderizar ───────────────────────────────────────────────
  const deviceKeys = useMemo(() => {
    const base = ["mobile", "desktop"];
    if (hasTablet) base.push("tablet");
    return base.sort((a, b) => data[b].invest - data[a].invest);
  }, [data, hasTablet]);

  return (
    <article style={{
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(10,15,30,0.72)",
      backdropFilter: "blur(24px)",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
      minWidth: 0,
      width: "100%",
      boxSizing: "border-box",
    }}>
      {/* Glow ambiental de fundo */}
      <div style={{
        position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
        width: 400, height: 120,
        background: `radial-gradient(ellipse, rgba(${DEVICE_CONFIG[dominantKey].rgb},0.08) 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <p style={{
            margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.4)",
          }}>
            Centro de Inteligência
          </p>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "rgba(245,247,251,0.95)", letterSpacing: "-0.3px" }}>
            Desempenho por Dispositivo
          </h2>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {isDataAvailable ? (
            <span style={{
              fontSize: 11, fontWeight: 700,
              padding: "4px 10px", borderRadius: 99,
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.25)",
              color: "#4ADE80",
              letterSpacing: "0.04em",
            }}>
              ● Dados reais
            </span>
          ) : (
            <span style={{
              fontSize: 11, fontWeight: 700,
              padding: "4px 10px", borderRadius: 99,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.4)",
            }}>
              Sem dados
            </span>
          )}
        </div>
      </div>

      {/* ── Conteúdo principal ────────────────────────────────────────────── */}
      {!isDataAvailable ? (
        /* Estado vazio */
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 12, padding: "3rem 1rem", textAlign: "center",
        }}>
          <div style={{ fontSize: 44, opacity: 0.25 }}>📱</div>
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "rgba(245,247,251,0.6)" }}>
              Relatório de Dispositivos necessário
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.6, maxWidth: 380 }}>
              No Google Ads: <strong style={{ color: "rgba(255,255,255,0.6)" }}>Relatórios → Segmentação → Dispositivo</strong><br />
              Exporte e importe o CSV para visualizar dados analíticos por dispositivo.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Cards dos dispositivos */}
          <div style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 18,
            minWidth: 0,
            width: "100%",
          }}>
            {deviceKeys.map((key, i) => (
              <DeviceCard
                key={key}
                deviceKey={key}
                data={data[key]}
                totalInvest={totalInvest}
                allData={allDevicesData}
                rank={ranked[key]}
                isDominant={key === dominantKey}
              />
            ))}
          </div>

          {/* ── Insights automáticos ───────────────────────────────────────── */}
          {insights.length > 0 && (
            <div>
              <p style={{
                margin: "0 0 10px", fontSize: 11, fontWeight: 700,
                color: "rgba(255,255,255,0.38)", letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}>
                ⚡ Insights automáticos
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                {insights.map((ins, i) => (
                  <InsightChip key={i} icon={ins.icon} text={ins.text} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Keyframes injetados inline */}
      <style>{`
        @keyframes shimmerBar {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </article>
  );
}
