"use client";

import { useEffect, useState } from "react";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("pt-BR");

// Coluna vertical animada
function VerticalBar({ value, maxValue, color, glow, label, sublabel, percent, delay = 0 }) {
  const [height, setHeight] = useState(0);
  const targetHeight = maxValue > 0 ? Math.max((value / maxValue) * 100, value > 0 ? 4 : 0) : 0;

  useEffect(() => {
    const t = setTimeout(() => setHeight(targetHeight), 150 + delay);
    return () => clearTimeout(t);
  }, [targetHeight, delay]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
      {/* Valor acima da barra */}
      <div style={{ marginBottom: "0.6rem", textAlign: "center" }}>
        <div style={{ color: "#f5f7fb", fontSize: "1rem", fontWeight: 800, lineHeight: 1.2 }}>
          {brl.format(value)}
        </div>
        <div style={{
          background: `rgba(${color}, 0.18)`,
          color: `rgb(${color})`,
          fontSize: "0.7rem",
          fontWeight: 700,
          padding: "0.08rem 0.4rem",
          borderRadius: 99,
          marginTop: "0.25rem",
          display: "inline-block",
        }}>
          {percent}%
        </div>
      </div>

      {/* Área da barra */}
      <div style={{
        width: "100%",
        height: 160,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(255,255,255,0.025)",
        borderRadius: "10px 10px 0 0",
        overflow: "hidden",
        position: "relative",
      }}>
        {/* Grade de referência */}
        {[25, 50, 75].map(p => (
          <div key={p} style={{
            position: "absolute",
            bottom: `${p}%`,
            left: 0,
            right: 0,
            height: 1,
            background: "rgba(255,255,255,0.04)",
          }} />
        ))}
        {/* Barra */}
        <div style={{
          width: "70%",
          height: `${height}%`,
          background: `linear-gradient(180deg, rgb(${color}) 0%, rgb(${color}) 70%, rgba(${color},0.5) 100%)`,
          borderRadius: "6px 6px 0 0",
          transition: `height 0.9s cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
          boxShadow: `0 -6px 24px rgba(${glow}, 0.45), 0 0 40px rgba(${glow}, 0.15)`,
          position: "relative",
        }} />
      </div>

      {/* Linha base */}
      <div style={{ width: "100%", height: 2, background: `rgba(${color}, 0.35)`, borderRadius: "0 0 4px 4px" }} />

      {/* Label abaixo */}
      <div style={{ marginTop: "0.65rem", textAlign: "center" }}>
        <div style={{ color: `rgb(${color})`, fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {label}
        </div>
        <div style={{ color: "rgba(245,247,251,0.38)", fontSize: "0.68rem", marginTop: "0.15rem" }}>
          {sublabel}
        </div>
      </div>
    </div>
  );
}

export default function DonutChart({ campaigns }) {
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const timerStart = setTimeout(() => setIsUpdating(true), 0);
    const timerEnd   = setTimeout(() => setIsUpdating(false), 250);
    return () => { clearTimeout(timerStart); clearTimeout(timerEnd); };
  }, [campaigns]);

  const googleCampaigns = campaigns.filter(c => c.tipo === "google");
  const metaCampaigns   = campaigns.filter(c => c.tipo === "meta");

  const google      = googleCampaigns.reduce((s, c) => s + c.investimento, 0);
  const meta        = metaCampaigns.reduce((s, c)   => s + c.investimento, 0);
  const totalInvest = google + meta;

  const googleConv   = googleCampaigns.reduce((s, c) => s + (c.conversoes || 0), 0);
  const metaConv     = metaCampaigns.reduce((s, c)   => s + (c.conversoes || 0), 0);
  const googleClicks = googleCampaigns.reduce((s, c) => s + (c.cliques    || 0), 0);
  const metaClicks   = metaCampaigns.reduce((s, c)   => s + (c.cliques    || 0), 0);
  const googleCPA    = googleConv > 0 ? google / googleConv : 0;
  const metaCPA      = metaConv  > 0 ? meta   / metaConv   : 0;

  const googlePct = totalInvest > 0 ? Math.round((google / totalInvest) * 100) : 0;
  const metaPct   = totalInvest > 0 ? Math.round((meta   / totalInvest) * 100) : 0;
  const maxVal    = Math.max(google, meta, 1);

  return (
    <article className={`chart-panel ${isUpdating ? "is-updating" : ""}`}>
      {/* Header */}
      <div className="panel-heading" style={{ marginBottom: "1.5rem" }}>
        <div>
          <p className="eyebrow">Distribuição</p>
          <h2>Investimento por plataforma</h2>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#f5f7fb", fontSize: "1.4rem", fontWeight: 800, lineHeight: 1.1 }}>
            {brl.format(totalInvest)}
          </div>
          <div style={{ color: "rgba(245,247,251,0.42)", fontSize: "0.72rem", fontWeight: 500 }}>total geral</div>
        </div>
      </div>

      {/* Gráfico de colunas verticais */}
      <div style={{
        display: "flex",
        gap: "1.5rem",
        padding: "0 1.25rem 1.5rem",
        alignItems: "flex-end",
      }}>
        <VerticalBar
          value={google}
          maxValue={maxVal}
          color="123,183,255"
          glow="123,183,255"
          label="Google Ads"
          sublabel={`${googleCampaigns.length} campanha${googleCampaigns.length !== 1 ? "s" : ""}`}
          percent={googlePct}
          delay={0}
        />
        <VerticalBar
          value={meta}
          maxValue={maxVal}
          color="124,247,190"
          glow="124,247,190"
          label="Meta Ads"
          sublabel={`${metaCampaigns.length} campanha${metaCampaigns.length !== 1 ? "s" : ""}`}
          percent={metaPct}
          delay={80}
        />
      </div>

    </article>
  );
}
