"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── formatadores ────────────────────────────────────────────────────────────
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat("pt-BR");

// ─── paleta de cores por série ───────────────────────────────────────────────
const SERIES = [
  { key: "google", label: "Google Ads",  color: "#7bb7ff", glow: "rgba(123,183,255,0.35)" },
  { key: "meta",   label: "Meta Ads",    color: "#7cf7be", glow: "rgba(124,247,190,0.35)" },
  { key: "leads",  label: "Total Leads", color: "#ffd166", glow: "rgba(255,209,102,0.35)" },
];

// ─── helpers ─────────────────────────────────────────────────────────────────
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

function formatVal(key, v) {
  if (key === "leads") return num.format(Math.round(v));
  return brl.format(v);
}

// ─── componente principal ─────────────────────────────────────────────────────
export default function LineChart({ timeline }) {
  const canvasRef      = useRef(null);
  const animRef        = useRef(null);
  const prevTimeline   = useRef(null);
  const [tooltip, setTooltip] = useState(null);   // { x, y, month, values }
  const [isUpdating, setIsUpdating] = useState(false);

  // anima as linhas de 0 → 1 com easing ao mudar dados
  const animateDraw = useCallback((canvas, data, fromProgress = 0) => {
    const startTime = performance.now();
    const duration  = 700; // ms

    const frame = (now) => {
      const raw = (now - startTime) / duration;
      const progress = Math.min(easeInOut(Math.min(raw, 1)), 1);
      drawChart(canvas, data, lerp(fromProgress, 1, progress));
      if (progress < 1) {
        animRef.current = requestAnimationFrame(frame);
      }
    };

    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(frame);
  }, []);

  // desenha todas as 3 linhas no canvas até `progress` (0..1)
  const drawChart = (canvas, data, progress = 1) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr    = window.devicePixelRatio || 1;
    const W      = canvas.parentElement?.clientWidth || 700;
    const H      = 280;

    canvas.width        = W * dpr;
    canvas.height       = H * dpr;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    if (!data || data.length === 0) {
      ctx.fillStyle = "rgba(245,247,251,0.35)";
      ctx.font      = "13px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Nenhum dado histórico disponível", W / 2, H / 2);
      return;
    }

    const padL = 58, padR = 20, padT = 24, padB = 48;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    // calcula visíveis até progress
    const visibleCount = Math.max(1, Math.ceil(data.length * progress));
    const visibleData  = data.slice(0, visibleCount);

    // ─── escala eixo Y ──────────────────────────────────────────────────
    // Investimento (google + meta) em eixo principal; leads em eixo secundário
    const maxInvest = Math.max(...data.map(d => Math.max(d.google || 0, d.meta || 0)), 1);
    const maxLeads  = Math.max(...data.map(d => d.leads || 0), 1);

    const yInvest = (v) => padT + chartH - (v / (maxInvest * 1.15)) * chartH;
    const yLeads  = (v) => padT + chartH - (v / (maxLeads  * 1.15)) * chartH;
    const xPos    = (i) => padL + (chartW / (data.length - 1 || 1)) * i;

    // ─── grade de fundo ─────────────────────────────────────────────────
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth   = 1;
    for (let i = 0; i < 5; i++) {
      const y = padT + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + chartW, y);
      ctx.stroke();
    }

    // ─── rótulos eixo Y esquerdo (Investimento) ──────────────────────────
    ctx.fillStyle = "rgba(245,247,251,0.4)";
    ctx.font      = "10px Inter, sans-serif";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const v = (maxInvest * 1.15 / 4) * (4 - i);
      ctx.fillText(brl.format(v), padL - 6, padT + (chartH / 4) * i + 4);
    }

    // ─── rótulos eixo Y direito (Leads) ──────────────────────────────────
    if (maxLeads > 0) {
      ctx.fillStyle = "rgba(255,209,102,0.55)";
      ctx.textAlign = "left";
      for (let i = 0; i <= 4; i++) {
        const v = Math.round((maxLeads * 1.15 / 4) * (4 - i));
        ctx.fillText(num.format(v), W - padR + 4, padT + (chartH / 4) * i + 4);
      }
    }

    // ─── rótulos eixo X (meses) ──────────────────────────────────────────
    ctx.fillStyle = "rgba(245,247,251,0.55)";
    ctx.font      = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    data.forEach((d, i) => {
      if (i < visibleCount) {
        ctx.fillText(d.mes, xPos(i), padT + chartH + 26);
      }
    });

    // ─── desenha cada série ───────────────────────────────────────────────
    SERIES.forEach(({ key, color, glow }) => {
      const yFn = key === "leads" ? yLeads : yInvest;
      const pts  = visibleData.map((d, i) => ({
        x: xPos(i),
        y: yFn(d[key] || 0),
        v: d[key] || 0,
      }));

      if (pts.length < 2) return;

      // sombra luminosa
      ctx.shadowColor  = glow;
      ctx.shadowBlur   = 8;
      ctx.strokeStyle  = color;
      ctx.lineWidth    = 2.5;
      ctx.lineJoin     = "round";
      ctx.lineCap      = "round";
      ctx.beginPath();
      pts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.shadowBlur = 0;

      // área preenchida (somente para investimento)
      if (key !== "leads") {
        const fill = ctx.createLinearGradient(0, padT, 0, padT + chartH);
        fill.addColorStop(0, color.replace("#", "rgba(").replace(/(..)(..)(..)/, (_, r, g, b) =>
          `${parseInt(r,16)},${parseInt(g,16)},${parseInt(b,16)}`) + ",0.14)");
        fill.addColorStop(1, color.replace("#", "rgba(").replace(/(..)(..)(..)/, (_, r, g, b) =>
          `${parseInt(r,16)},${parseInt(g,16)},${parseInt(b,16)}`) + ",0)");

        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, padT + chartH);
        pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(pts[pts.length - 1].x, padT + chartH);
        ctx.closePath();
        ctx.fill();
      }

      // pontos
      pts.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "#0d1117";
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      });
    });
  };

  // efeito principal — redesenha e anima quando timeline muda
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const hadData = prevTimeline.current && prevTimeline.current.length > 0;
    prevTimeline.current = timeline;

    setIsUpdating(true);
    setTimeout(() => setIsUpdating(false), 300);

    if (!timeline || timeline.length === 0) {
      drawChart(canvas, [], 1);
      return;
    }

    // anima de 0 se é a primeira vez; de ~0.3 se já havia dados (atualização)
    animateDraw(canvas, timeline, hadData ? 0.2 : 0);

    const handleResize = () => animateDraw(canvas, timeline, 1);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline]);

  // ─── tooltip via mouse ────────────────────────────────────────────────────
  const handleMouseMove = (e) => {
    if (!timeline || timeline.length === 0) return;
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const mx     = e.clientX - rect.left;
    const W      = rect.width;
    const padL   = 58, padR = 20;
    const chartW = W - padL - padR;
    const step   = chartW / (timeline.length - 1 || 1);
    const idx    = Math.round((mx - padL) / step);
    const clamped = Math.max(0, Math.min(timeline.length - 1, idx));
    const d      = timeline[clamped];
    setTooltip({ x: padL + step * clamped, mes: d.mes, google: d.google, meta: d.meta, leads: d.leads });
  };

  return (
    <article className={`chart-panel wide ${isUpdating ? "is-updating" : ""}`} id="comparacao">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Evolução Histórica</p>
          <h2>Investimento Google &amp; Meta + Leads Capturados</h2>
        </div>

        {/* Legenda */}
        <div style={{ display: "flex", gap: "1.1rem", alignItems: "center" }}>
          {SERIES.map(s => (
            <span key={s.key} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", color: "rgba(245,247,251,0.72)", fontWeight: 500 }}>
              <span style={{ display: "inline-block", width: 28, height: 2.5, borderRadius: 2, background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* canvas */}
      <div style={{ position: "relative" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <canvas ref={canvasRef} />

        {/* tooltip */}
        {tooltip && (
          <div style={{
            position: "absolute",
            left: Math.min(tooltip.x, canvasRef.current?.clientWidth - 160 || 999),
            top: 8,
            transform: "translateX(-50%)",
            background: "rgba(13,17,23,0.92)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "0.55rem 0.8rem",
            fontSize: "0.78rem",
            lineHeight: 1.7,
            pointerEvents: "none",
            zIndex: 10,
            backdropFilter: "blur(8px)",
            minWidth: 160,
          }}>
            <div style={{ fontWeight: 700, marginBottom: "0.3rem", color: "rgba(245,247,251,0.9)" }}>{tooltip.mes}</div>
            <div style={{ color: "#7bb7ff" }}>● Google Ads: {brl.format(tooltip.google || 0)}</div>
            <div style={{ color: "#7cf7be" }}>● Meta Ads: {brl.format(tooltip.meta || 0)}</div>
            <div style={{ color: "#ffd166" }}>● Total Leads: {num.format(Math.round(tooltip.leads || 0))}</div>
          </div>
        )}
      </div>
    </article>
  );
}
