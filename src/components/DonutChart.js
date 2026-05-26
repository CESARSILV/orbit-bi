"use client";

import { useEffect, useRef, useState } from "react";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlFull = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const num = new Intl.NumberFormat("pt-BR");

export default function DonutChart({ campaigns }) {
  const canvasRef = useRef(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const timerStart = setTimeout(() => setIsUpdating(true), 0);
    const timerEnd = setTimeout(() => setIsUpdating(false), 250);
    return () => {
      clearTimeout(timerStart);
      clearTimeout(timerEnd);
    };
  }, [campaigns]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let resizeTimer;

    const googleCampaigns = campaigns.filter(c => c.tipo === "google");
    const metaCampaigns   = campaigns.filter(c => c.tipo === "meta");

    const google      = googleCampaigns.reduce((s, c) => s + c.investimento, 0);
    const meta        = metaCampaigns.reduce((s, c)   => s + c.investimento, 0);
    const totalInvest = google + meta;
    const total       = totalInvest || 1;

    const googleConv  = googleCampaigns.reduce((s, c) => s + (c.conversoes || 0), 0);
    const metaConv    = metaCampaigns.reduce((s, c)   => s + (c.conversoes || 0), 0);
    const googleClicks = googleCampaigns.reduce((s, c) => s + (c.cliques || 0), 0);
    const metaClicks   = metaCampaigns.reduce((s, c)   => s + (c.cliques || 0), 0);
    const googleCPA   = googleConv > 0 ? google / googleConv : 0;
    const metaCPA     = metaConv > 0   ? meta / metaConv     : 0;

    setStats({ google, meta, totalInvest, googleConv, metaConv, googleClicks, metaClicks, googleCPA, metaCPA });

    const draw = () => {
      const ratio      = window.devicePixelRatio || 1;
      const clientWidth = canvas.parentElement?.clientWidth || 280;
      const clientHeight = 220;

      canvas.width = clientWidth * ratio;
      canvas.height = clientHeight * ratio;
      canvas.style.width  = `${clientWidth}px`;
      canvas.style.height = `${clientHeight}px`;

      ctx.scale(ratio, ratio);
      ctx.clearRect(0, 0, clientWidth, clientHeight);

      const centerX = clientWidth / 2;
      const centerY = 100;
      const radius  = 70;
      let start = -Math.PI / 2;

      const slices = [
        { label: "Google Ads", value: google, color: "#7bb7ff" },
        { label: "Meta Ads",   value: meta,   color: "#7cf7be" },
      ];

      if (totalInvest === 0) {
        // Empty ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.lineWidth = 20;
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.stroke();
      } else {
        slices.forEach(slice => {
          const end = start + (slice.value / total) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, start, end);
          ctx.lineWidth = 20;
          ctx.strokeStyle = slice.color;
          ctx.stroke();
          start = end;
        });
      }

      // Central Text
      ctx.fillStyle = "#f5f7fb";
      ctx.font = "800 20px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(brl.format(totalInvest), centerX, centerY - 6);

      ctx.fillStyle = "rgba(245, 247, 251, 0.55)";
      ctx.font = "11px Inter, sans-serif";
      ctx.fillText("investimento total", centerX, centerY + 14);
    };

    draw();

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(draw, 100);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, [campaigns]);

  const googlePct = stats ? Math.round((stats.google / (stats.totalInvest || 1)) * 100) : 0;
  const metaPct   = stats ? Math.round((stats.meta   / (stats.totalInvest || 1)) * 100) : 0;

  return (
    <article className={`chart-panel ${isUpdating ? "is-updating" : ""}`}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Distribuição</p>
          <h2>Investimento por plataforma</h2>
        </div>
      </div>

      <canvas ref={canvasRef} height="220" />

      {/* Cards de plataforma */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.75rem",
        padding: "0 1rem 1rem",
        marginTop: "0.25rem",
      }}>
        {/* Google Ads */}
        <div style={{
          background: "rgba(123,183,255,0.07)",
          border: "1px solid rgba(123,183,255,0.2)",
          borderRadius: "12px",
          padding: "0.85rem 1rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.6rem" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#7bb7ff", flexShrink: 0 }} />
            <span style={{ color: "#7bb7ff", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Google Ads
            </span>
            <span style={{ marginLeft: "auto", color: "#7bb7ff", fontSize: "0.72rem", fontWeight: 700 }}>
              {googlePct}%
            </span>
          </div>
          <div style={{ color: "#f5f7fb", fontSize: "1.1rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            {stats ? brl.format(stats.google) : "R$ 0"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem 0.5rem" }}>
            <div>
              <div style={{ color: "rgba(245,247,251,0.42)", fontSize: "0.67rem", marginBottom: "0.1rem" }}>Cliques</div>
              <div style={{ color: "rgba(245,247,251,0.85)", fontSize: "0.8rem", fontWeight: 600 }}>{stats ? num.format(stats.googleClicks) : "0"}</div>
            </div>
            <div>
              <div style={{ color: "rgba(245,247,251,0.42)", fontSize: "0.67rem", marginBottom: "0.1rem" }}>Conversões</div>
              <div style={{ color: "rgba(245,247,251,0.85)", fontSize: "0.8rem", fontWeight: 600 }}>{stats ? num.format(stats.googleConv) : "0"}</div>
            </div>
            <div>
              <div style={{ color: "rgba(245,247,251,0.42)", fontSize: "0.67rem", marginBottom: "0.1rem" }}>CPA</div>
              <div style={{ color: "rgba(245,247,251,0.85)", fontSize: "0.8rem", fontWeight: 600 }}>{stats ? brl.format(stats.googleCPA) : "R$ 0"}</div>
            </div>
            <div>
              <div style={{ color: "rgba(245,247,251,0.42)", fontSize: "0.67rem", marginBottom: "0.1rem" }}>Campanhas</div>
              <div style={{ color: "rgba(245,247,251,0.85)", fontSize: "0.8rem", fontWeight: 600 }}>
                {campaigns.filter(c => c.tipo === "google").length}
              </div>
            </div>
          </div>
        </div>

        {/* Meta Ads */}
        <div style={{
          background: "rgba(124,247,190,0.07)",
          border: "1px solid rgba(124,247,190,0.2)",
          borderRadius: "12px",
          padding: "0.85rem 1rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.6rem" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#7cf7be", flexShrink: 0 }} />
            <span style={{ color: "#7cf7be", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Meta Ads
            </span>
            <span style={{ marginLeft: "auto", color: "#7cf7be", fontSize: "0.72rem", fontWeight: 700 }}>
              {metaPct}%
            </span>
          </div>
          <div style={{ color: "#f5f7fb", fontSize: "1.1rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            {stats ? brl.format(stats.meta) : "R$ 0"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem 0.5rem" }}>
            <div>
              <div style={{ color: "rgba(245,247,251,0.42)", fontSize: "0.67rem", marginBottom: "0.1rem" }}>Cliques</div>
              <div style={{ color: "rgba(245,247,251,0.85)", fontSize: "0.8rem", fontWeight: 600 }}>{stats ? num.format(stats.metaClicks) : "0"}</div>
            </div>
            <div>
              <div style={{ color: "rgba(245,247,251,0.42)", fontSize: "0.67rem", marginBottom: "0.1rem" }}>Conversões</div>
              <div style={{ color: "rgba(245,247,251,0.85)", fontSize: "0.8rem", fontWeight: 600 }}>{stats ? num.format(stats.metaConv) : "0"}</div>
            </div>
            <div>
              <div style={{ color: "rgba(245,247,251,0.42)", fontSize: "0.67rem", marginBottom: "0.1rem" }}>CPA</div>
              <div style={{ color: "rgba(245,247,251,0.85)", fontSize: "0.8rem", fontWeight: 600 }}>{stats ? brl.format(stats.metaCPA) : "R$ 0"}</div>
            </div>
            <div>
              <div style={{ color: "rgba(245,247,251,0.42)", fontSize: "0.67rem", marginBottom: "0.1rem" }}>Campanhas</div>
              <div style={{ color: "rgba(245,247,251,0.85)", fontSize: "0.8rem", fontWeight: 600 }}>
                {campaigns.filter(c => c.tipo === "meta").length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
