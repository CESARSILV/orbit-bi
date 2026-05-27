"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── formatadores ─────────────────────────────────────────────────────────────
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("pt-BR");

// ─── série visual ─────────────────────────────────────────────────────────────
const SERIES = [
  { key: "google", label: "Google Ads",  color: "#7bb7ff" },
  { key: "meta",   label: "Meta Ads",    color: "#7cf7be" },
  { key: "leads",  label: "Total Leads", color: "#ffd166" },
];

// ─── parse hex → "r,g,b" ──────────────────────────────────────────────────────
const hexRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
};

// ─── componente ───────────────────────────────────────────────────────────────
export default function LineChart({ timeline }) {
  const canvasRef  = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [ready,   setReady]   = useState(false); // controla fade-in CSS

  // ─── desenha o gráfico completo (sem animação progressiva) ────────────────
  const draw = useCallback((canvas, data) => {
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.parentElement?.clientWidth  || 800;
    const H   = 290;

    canvas.width        = W * dpr;
    canvas.height       = H * dpr;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // ── sem dados ────────────────────────────────────────────────────────────
    if (!data || data.length === 0) {
      ctx.fillStyle   = "rgba(245,247,251,0.3)";
      ctx.font        = "13px Inter, sans-serif";
      ctx.textAlign   = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Nenhum dado histórico disponível", W / 2, H / 2);
      return;
    }

    const padL = 72, padR = 52, padT = 20, padB = 44;
    const cW   = W - padL - padR;
    const cH   = H - padT - padB;
    const n    = data.length;

    // ── escalas ──────────────────────────────────────────────────────────────
    const maxInvest = Math.max(...data.flatMap(d => [d.google || 0, d.meta || 0]), 1);
    const maxLeads  = Math.max(...data.map(d => d.leads || 0), 1);

    const yI = (v) => padT + cH - (v / (maxInvest * 1.18)) * cH;
    const yL = (v) => padT + cH - (v / (maxLeads  * 1.18)) * cH;
    const xP = (i) => padL + (n > 1 ? (cW / (n - 1)) * i : cW / 2);

    // ── grade ─────────────────────────────────────────────────────────────────
    ctx.strokeStyle = "rgba(255,255,255,0.055)";
    ctx.lineWidth   = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (cH / 4) * i;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + cW, y); ctx.stroke();
    }

    // ── eixo Y esquerdo (Investimento R$) ─────────────────────────────────────
    ctx.fillStyle  = "rgba(245,247,251,0.38)";
    ctx.font       = "10px Inter, sans-serif";
    ctx.textAlign  = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) {
      const v = (maxInvest * 1.18 / 4) * (4 - i);
      ctx.fillText(brl.format(v), padL - 7, padT + (cH / 4) * i);
    }

    // ── eixo Y direito (Leads) ────────────────────────────────────────────────
    if (maxLeads > 0) {
      ctx.fillStyle  = "rgba(255,209,102,0.50)";
      ctx.textAlign  = "left";
      for (let i = 0; i <= 4; i++) {
        const v = Math.round((maxLeads * 1.18 / 4) * (4 - i));
        ctx.fillText(num.format(v), W - padR + 6, padT + (cH / 4) * i);
      }
    }

    // ── rótulos eixo X ────────────────────────────────────────────────────────
    ctx.fillStyle    = "rgba(245,247,251,0.52)";
    ctx.font         = "10px Inter, sans-serif";
    ctx.textAlign    = "center";
    ctx.textBaseline = "top";

    // limita labels para não sobrepor: mostra no máximo 7
    const step = Math.ceil(n / 7);
    data.forEach((d, i) => {
      if (i % step === 0 || i === n - 1) {
        ctx.fillText(d.mes, xP(i), padT + cH + 8);
      }
    });

    // ── desenha cada série ────────────────────────────────────────────────────
    SERIES.forEach(({ key, color }) => {
      const yFn  = key === "leads" ? yL : yI;
      const pts   = data.map((d, i) => ({ x: xP(i), y: yFn(d[key] || 0), v: d[key] || 0 }));
      const hasVal = pts.some(p => p.v > 0);
      if (!hasVal) return;

      // área preenchida (só invest)
      if (key !== "leads") {
        const fill = ctx.createLinearGradient(0, padT, 0, padT + cH);
        const rgb  = hexRgb(color);
        fill.addColorStop(0, `rgba(${rgb},0.12)`);
        fill.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, padT + cH);
        pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(pts[pts.length - 1].x, padT + cH);
        ctx.closePath();
        ctx.fill();
      }

      // linha
      ctx.shadowColor  = color;
      ctx.shadowBlur   = 6;
      ctx.strokeStyle  = color;
      ctx.lineWidth    = key === "leads" ? 2 : 2.5;
      ctx.lineJoin     = "round";
      ctx.lineCap      = "round";
      ctx.setLineDash(key === "leads" ? [4, 4] : []);
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.shadowBlur   = 0;
      ctx.setLineDash([]);

      // pontos
      pts.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle   = color;
        ctx.fill();
        ctx.strokeStyle = "rgba(10,14,22,0.8)";
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      });
    });
  }, []);

  // ─── efeito principal: redesenha quando timeline muda ─────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setReady(false);
    // desenha imediatamente após um frame (garante que o canvas está montado)
    const raf = requestAnimationFrame(() => {
      draw(canvas, timeline);
      setReady(true);
    });

    const handleResize = () => { draw(canvas, timeline); };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
    };
  }, [timeline, draw]);

  // ─── tooltip via mouse ────────────────────────────────────────────────────
  const handleMouseMove = (e) => {
    if (!timeline || timeline.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const W    = rect.width;
    const padL = 72, padR = 52;
    const cW   = W - padL - padR;
    const n    = timeline.length;
    const step = n > 1 ? cW / (n - 1) : cW;
    const idx  = Math.round((mx - padL) / step);
    const i    = Math.max(0, Math.min(n - 1, idx));
    const d    = timeline[i];
    const tipX = padL + (n > 1 ? (cW / (n - 1)) * i : cW / 2);
    setTooltip({ x: tipX, mes: d.mes, google: d.google, meta: d.meta, leads: d.leads });
  };

  return (
    <article className="chart-panel wide" id="comparacao">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Evolução Histórica</p>
          <h2>Investimento Google &amp; Meta + Leads Capturados</h2>
        </div>

        {/* Legenda */}
        <div style={{ display: "flex", gap: "1.1rem", alignItems: "center" }}>
          {SERIES.map(s => (
            <span key={s.key} style={{
              display: "flex", alignItems: "center", gap: "0.35rem",
              fontSize: "0.78rem", color: "rgba(245,247,251,0.72)", fontWeight: 500
            }}>
              <span style={{
                display: "inline-block", width: s.key === "leads" ? 20 : 28,
                height: s.key === "leads" ? 0 : 2.5,
                borderTop: s.key === "leads" ? `2px dashed ${s.color}` : "none",
                background: s.key === "leads" ? "none" : s.color,
                borderRadius: 2,
                boxShadow: `0 0 5px ${s.color}`
              }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* canvas wrapper */}
      <div
        style={{
          position: "relative",
          opacity: ready ? 1 : 0,
          transition: "opacity 0.35s ease",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <canvas ref={canvasRef} />

        {/* tooltip */}
        {tooltip && (() => {
          const canvas = canvasRef.current;
          const maxX   = canvas ? canvas.clientWidth - 175 : 9999;
          const leftPx = Math.min(tooltip.x, maxX);
          return (
            <div style={{
              position: "absolute",
              left: leftPx,
              top: 8,
              transform: "translateX(-50%)",
              background: "rgba(10,14,22,0.92)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8,
              padding: "0.55rem 0.85rem",
              fontSize: "0.78rem",
              lineHeight: 1.75,
              pointerEvents: "none",
              zIndex: 20,
              backdropFilter: "blur(10px)",
              minWidth: 168,
            }}>
              <div style={{ fontWeight: 700, marginBottom: "0.25rem", color: "rgba(245,247,251,0.9)" }}>
                {tooltip.mes}
              </div>
              <div style={{ color: "#7bb7ff" }}>● Google Ads: {brl.format(tooltip.google || 0)}</div>
              <div style={{ color: "#7cf7be" }}>● Meta Ads: {brl.format(tooltip.meta   || 0)}</div>
              <div style={{ color: "#ffd166" }}>● Total Leads: {num.format(Math.round(tooltip.leads || 0))}</div>
            </div>
          );
        })()}
      </div>
    </article>
  );
}
