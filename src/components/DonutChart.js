"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";

// ─── Formatadores ─────────────────────────────────────────────────────────────
const brl  = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brl2 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct  = (v) => (v >= 0 ? "+" : "") + v.toFixed(1).replace(".", ",") + "%";

// ─── Paleta ───────────────────────────────────────────────────────────────────
const GOOGLE = { hex: "#FBBC05", rgb: "251,188,5",   name: "Google Ads" };
const META   = { hex: "#0866FF", rgb: "8,102,255",   name: "Meta Ads"   };

// ─── Hook: animação numérica suave (lerp por RAF) ─────────────────────────────
function useRollingNumber(target, duration = 700) {
  const [displayed, setDisplayed] = useState(target);
  const state = useRef({ from: target, to: target, start: null, raf: null });

  useEffect(() => {
    const from = state.current.to ?? target;
    state.current = { from, to: target, start: null };

    const animate = (ts) => {
      if (!state.current.start) state.current.start = ts;
      const t = Math.min((ts - state.current.start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out
      setDisplayed(state.current.from + (state.current.to - state.current.from) * ease);
      if (t < 1) state.current.raf = requestAnimationFrame(animate);
      else        setDisplayed(state.current.to);
    };

    cancelAnimationFrame(state.current.raf);
    state.current.raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(state.current.raf);
  }, [target, duration]);

  return Math.round(displayed);
}

// ─── SVG Ring de progresso ────────────────────────────────────────────────────
function Ring({ pct: targetPct, color, size = 72, stroke = 6 }) {
  const [animPct, setAnimPct] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    let start = null;
    const from = 0;
    const to   = targetPct;
    const dur  = 900;
    const tick = (ts) => {
      if (!start) start = ts;
      const t    = Math.min((ts - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setAnimPct(from + (to - from) * ease);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [targetPct]);

  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (animPct / 100) * circ;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      {/* trilha */}
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--border-soft)" strokeWidth={stroke} />
      {/* progresso */}
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: "none" }}
      />
    </svg>
  );
}

// ─── Mini sparkline (SVG, últimos N pontos) ───────────────────────────────────
function Sparkline({ values, color, width = 80, height = 28 }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}88)` }}
      />
    </svg>
  );
}

// ─── Card de plataforma premium ────────────────────────────────────────────────
function PlatformCard({ platform, value, percent, total, activeCampaigns, totalCampaigns,
                         delta, sparkValues, isDominant, delay = 0 }) {
  const rolledVal = useRollingNumber(value, 750);
  const rolledPct = useRollingNumber(percent, 650);
  const [visible, setVisible] = useState(false);
  const [barH, setBarH]       = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), delay);
    const t2 = setTimeout(() => setBarH(percent), delay + 120);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [delay, percent]);

  // reanima quando valor muda
  useEffect(() => {
    let t;
    const tReset = setTimeout(() => {
      setBarH(0);
      t = setTimeout(() => setBarH(percent), 80);
    }, 0);
    return () => {
      clearTimeout(tReset);
      if (t) clearTimeout(t);
    };
  }, [percent]);

  const isPositive = delta >= 0;
  const color      = platform === "google" ? GOOGLE.hex : META.hex;
  const rgb        = platform === "google" ? GOOGLE.rgb : META.rgb;
  const label      = platform === "google" ? GOOGLE.name : META.name;

  const maxBarH  = 130; // px
  const barPx    = Math.max((barH / 100) * maxBarH, value > 0 ? 6 : 0);

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(16px)",
      transition: `opacity 0.5s ease ${delay}ms, transform 0.5s cubic-bezier(0.34,1.4,0.64,1) ${delay}ms`,
    }}>
      {/* ── Ring + percentual ───────────────────────────────────────── */}
      <div style={{ position: "relative", marginBottom: "var(--space-xs)" }}>
        <Ring pct={percent} color={color} size={68} stroke={5} />
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: "var(--fs-body)", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
            {rolledPct}%
          </span>
        </div>
      </div>

      {/* ── Valor principal ─────────────────────────────────────────── */}
      <div style={{ textAlign: "center", marginBottom: "var(--space-sm)" }}>
        <div style={{ fontSize: "var(--fs-title-md)", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1 }}>
          {brl.format(rolledVal)}
        </div>

        {/* delta */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "0.2rem",
          marginTop: "0.3rem",
          fontSize: "var(--fs-caption)", fontWeight: 700,
          color: isPositive ? "#34D399" : "#F87171",
          background: isPositive ? "rgba(52,211,153,0.10)" : "rgba(248,113,113,0.10)",
          border: `1px solid ${isPositive ? "rgba(52,211,153,0.18)" : "rgba(248,113,113,0.18)"}`,
          borderRadius: 99, padding: "0.12rem 0.5rem",
          transition: "all 0.4s ease",
        }}>
          <span style={{ fontSize: "var(--fs-small)" }}>{isPositive ? "▲" : "▼"}</span>
          {Math.abs(delta).toFixed(1).replace(".", ",")}%
        </div>
      </div>

      {/* ── Barra vertical animada ──────────────────────────────────── */}
      <div style={{
        width: "100%",
        height: maxBarH,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "var(--hover-bg)",
        borderRadius: "10px 10px 0 0",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* grades */}
        {[25, 50, 75].map(p => (
          <div key={p} style={{
            position: "absolute", bottom: `${p}%`, left: 0, right: 0,
            height: 1, background: "var(--border-soft)",
          }} />
        ))}

        {/* barra com gradiente + glow */}
        <div style={{
          width: isDominant ? "72%" : "60%",
          height: `${barPx}px`,
          background: `linear-gradient(180deg, ${color} 0%, rgba(${rgb},0.55) 60%, rgba(${rgb},0.15) 100%)`,
          borderRadius: "7px 7px 0 0",
          transition: "height 0.85s cubic-bezier(0.34,1.15,0.64,1), width 0.5s ease",
          boxShadow: isDominant
            ? `0 -8px 30px rgba(${rgb},0.5), 0 0 50px rgba(${rgb},0.18), inset 0 1px 0 var(--border-soft)`
            : `0 -4px 16px rgba(${rgb},0.28), inset 0 1px 0 var(--border-soft)`,
          position: "relative",
        }}>
          {/* reflexo interno */}
          <div style={{
            position: "absolute", inset: "0 20% auto 20%", height: "30%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 100%)",
            borderRadius: "6px 6px 0 0",
          }} />
        </div>

        {/* Glow ambiental no fundo quando é dominante */}
        {isDominant && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "40%",
            background: `radial-gradient(ellipse at 50% 100%, rgba(${rgb},0.12) 0%, transparent 70%)`,
            pointerEvents: "none",
          }} />
        )}
      </div>

      {/* Linha base */}
      <div style={{
        width: "100%", height: 2,
        background: `linear-gradient(90deg, transparent, rgba(${rgb},0.6), transparent)`,
        borderRadius: "0 0 4px 4px",
      }} />

      {/* ── Label inferior ──────────────────────────────────────────── */}
      <div style={{ marginTop: "var(--space-sm)", textAlign: "center" }}>
        <div style={{
          color,
          fontSize: "var(--fs-caption)", fontWeight: 700,
          letterSpacing: "0.07em", textTransform: "uppercase",
          textShadow: `0 0 12px rgba(${rgb},0.6)`,
          display: "flex", alignItems: "center", gap: "0.3rem", justifyContent: "center",
        }}>
          {isDominant && <span style={{ fontSize: "var(--fs-small)" }}>★</span>}
          {label}
        </div>
        <div style={{
          color: "var(--text-muted)", fontSize: "var(--fs-small)", marginTop: "0.2rem",
        }}>
          {totalCampaigns > 0
            ? activeCampaigns === totalCampaigns
              ? `${totalCampaigns} ativa${totalCampaigns !== 1 ? "s" : ""}`
              : `${activeCampaigns} ativa${activeCampaigns !== 1 ? "s" : ""} · ${totalCampaigns} total`
            : "sem dados"}
        </div>

        {/* Sparkline */}
        {sparkValues && sparkValues.length >= 2 && (
          <div style={{ marginTop: "0.4rem", display: "flex", justifyContent: "center" }}>
            <Sparkline values={sparkValues} color={color} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Barra de dominância horizontal ───────────────────────────────────────────
function DominanceBar({ googlePct, metaPct }) {
  const [gPct, setGPct] = useState(50);
  useEffect(() => {
    const t = setTimeout(() => setGPct(googlePct), 100);
    return () => clearTimeout(t);
  }, [googlePct]);

  return (
    <div style={{ marginTop: "var(--space-md)", padding: "0 0.25rem" }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontSize: "var(--fs-small)", fontWeight: 600,
        color: "var(--text-muted)",
        marginBottom: "0.35rem", letterSpacing: "0.04em",
      }}>
        <span style={{ color: GOOGLE.hex }}>Google {gPct.toFixed(0)}%</span>
        <span style={{ color: META.hex }}>Meta {(100 - gPct).toFixed(0)}%</span>
      </div>
      <div style={{
        height: 6, borderRadius: 99, overflow: "hidden",
        background: `rgba(${META.rgb},0.25)`,
        position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          width: `${gPct}%`,
          background: `linear-gradient(90deg, ${GOOGLE.hex}, rgba(${GOOGLE.rgb},0.6))`,
          borderRadius: 99,
          transition: "width 0.85s cubic-bezier(0.34,1.1,0.64,1)",
          boxShadow: `2px 0 10px rgba(${GOOGLE.rgb},0.45)`,
        }} />
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function DonutChart({ campaigns = [], timeline = [] }) {
  // Totais por plataforma
  const google = useMemo(() =>
    campaigns.filter(c => c.tipo === "google").reduce((s, c) => s + c.investimento, 0), [campaigns]);
  const meta = useMemo(() =>
    campaigns.filter(c => c.tipo === "meta").reduce((s, c) => s + c.investimento, 0), [campaigns]);
  const totalInvest = google + meta;

  const googlePct = totalInvest > 0 ? (google / totalInvest) * 100 : 0;
  const metaPct   = totalInvest > 0 ? (meta   / totalInvest) * 100 : 0;

  // Contagens de campanhas
  const googleActive = campaigns.filter(c => c.tipo === "google" && c.status === "Ativa").length;
  const metaActive   = campaigns.filter(c => c.tipo === "meta"   && c.status === "Ativa").length;
  const googleTotal  = campaigns.filter(c => c.tipo === "google").length;
  const metaTotal    = campaigns.filter(c => c.tipo === "meta").length;

  // Delta: compara 2ª metade vs 1ª metade do timeline
  const delta = useMemo(() => {
    if (!timeline || timeline.length < 2) return { google: 0, meta: 0 };
    const half = Math.ceil(timeline.length / 2);
    const first = timeline.slice(0, half);
    const last  = timeline.slice(half);
    const sumG1 = first.reduce((s, d) => s + (d.google || 0), 0);
    const sumG2 = last.reduce ((s, d) => s + (d.google || 0), 0);
    const sumM1 = first.reduce((s, d) => s + (d.meta   || 0), 0);
    const sumM2 = last.reduce ((s, d) => s + (d.meta   || 0), 0);
    return {
      google: sumG1 > 0 ? ((sumG2 - sumG1) / sumG1) * 100 : 0,
      meta:   sumM1 > 0 ? ((sumM2 - sumM1) / sumM1) * 100 : 0,
    };
  }, [timeline]);

  // Sparklines: últimos 5 pontos de cada plataforma
  const sparkGoogle = useMemo(() => timeline.slice(-5).map(d => d.google || 0), [timeline]);
  const sparkMeta   = useMemo(() => timeline.slice(-5).map(d => d.meta   || 0), [timeline]);

  const isDominantGoogle = google >= meta;
  const rolledTotal = useRollingNumber(totalInvest, 750);

  // ── Empty state: sem dados importados ─────────────────────────────────────
  if (totalInvest === 0 && campaigns.length === 0) {
    return (
      <article className="chart-panel" style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: "var(--space-sm)", minHeight: 200, opacity: 0.5,
      }}>
        <div style={{ fontSize: 28, opacity: 0.4 }}>🍩</div>
        <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-secondary)", margin: 0, textAlign: "center" }}>
          Nenhum dado de plataforma.<br />Importe relatórios para ver a distribuição.
        </p>
      </article>
    );
  }


  return (
    <article className="chart-panel" style={{ display: "flex", flexDirection: "column" }}>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="panel-heading" style={{ marginBottom: "var(--space-sm)" }}>
        <div>
          <p className="eyebrow">Distribuição</p>
          <h2 style={{ margin: 0 }}>Investimento por Plataforma</h2>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "var(--text-primary)", fontSize: "var(--fs-title-lg)", fontWeight: 800, lineHeight: 1.1 }}>
            {brl.format(rolledTotal)}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-caption)", fontWeight: 500 }}>
            total geral
          </div>
        </div>
      </div>

      {/* ── Cards das plataformas ─────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "1.25rem", flex: 1, padding: "0 0.25rem" }}>
        <PlatformCard
          platform="google"
          value={google}
          percent={Math.round(googlePct)}
          total={totalInvest}
          activeCampaigns={googleActive}
          totalCampaigns={googleTotal}
          delta={delta.google}
          sparkValues={sparkGoogle}
          isDominant={isDominantGoogle}
          delay={0}
        />
        <PlatformCard
          platform="meta"
          value={meta}
          percent={Math.round(metaPct)}
          total={totalInvest}
          activeCampaigns={metaActive}
          totalCampaigns={metaTotal}
          delta={delta.meta}
          sparkValues={sparkMeta}
          isDominant={!isDominantGoogle}
          delay={80}
        />
      </div>

      {/* ── Barra de dominância ──────────────────────────────────────── */}
      <DominanceBar googlePct={googlePct} metaPct={metaPct} />

      {/* ── Legenda de dominância ────────────────────────────────────── */}
      <div style={{
        marginTop: "var(--space-sm)",
        padding: "0.55rem 0.8rem",
        background: "var(--hover-bg)",
        borderRadius: 10,
        border: "1px solid var(--border-soft)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.4rem",
        fontSize: "var(--fs-secondary)",
        color: "var(--text-muted)",
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: isDominantGoogle ? GOOGLE.hex : META.hex,
          boxShadow: `0 0 6px ${isDominantGoogle ? GOOGLE.hex : META.hex}`,
          display: "inline-block",
        }} />
        <span>
          <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>
            {isDominantGoogle ? "Google Ads" : "Meta Ads"}
          </strong>
          {" lidera o período com "}
          <strong style={{ color: isDominantGoogle ? GOOGLE.hex : META.hex }}>
            {Math.round(isDominantGoogle ? googlePct : metaPct)}%
          </strong>
          {" do investimento"}
        </span>
      </div>
    </article>
  );
}
