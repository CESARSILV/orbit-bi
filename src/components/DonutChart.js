"use client";

import { useEffect, useState } from "react";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("pt-BR");

// Animated bar component
function AnimatedBar({ value, maxValue, color, label, percent }) {
  const [width, setWidth] = useState(0);
  const targetWidth = maxValue > 0 ? (value / maxValue) * 100 : 0;

  useEffect(() => {
    const t = setTimeout(() => setWidth(targetWidth), 120);
    return () => clearTimeout(t);
  }, [targetWidth]);

  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <span style={{ color: "rgba(245,247,251,0.75)", fontSize: "0.85rem", fontWeight: 600 }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ color: "#f5f7fb", fontSize: "1rem", fontWeight: 800 }}>{brl.format(value)}</span>
          <span style={{ color, fontSize: "0.8rem", fontWeight: 700, minWidth: 36, textAlign: "right" }}>{percent}%</span>
        </div>
      </div>
      <div style={{
        height: 10,
        background: "rgba(255,255,255,0.06)",
        borderRadius: 999,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${width}%`,
          background: `linear-gradient(90deg, ${color}cc, ${color})`,
          borderRadius: 999,
          transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: `0 0 12px ${color}66`,
        }} />
      </div>
    </div>
  );
}

// Column bar chart
function ColumnChart({ google, meta, googleClicks, metaClicks, googleConv, metaConv }) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, [google, meta]);

  const metrics = [
    {
      key: "invest",
      label: "Investimento",
      google: google,
      meta: meta,
      format: v => brl.format(v),
    },
    {
      key: "clicks",
      label: "Cliques",
      google: googleClicks,
      meta: metaClicks,
      format: v => num.format(v),
    },
    {
      key: "conv",
      label: "Conversões",
      google: googleConv,
      meta: metaConv,
      format: v => num.format(v),
    },
  ];

  return (
    <div style={{ padding: "0 1rem", marginBottom: "1.25rem" }}>
      {/* Legend */}
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "#7bb7ff", display: "block" }} />
          <span style={{ color: "rgba(245,247,251,0.65)", fontSize: "0.78rem", fontWeight: 600 }}>Google Ads</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "#7cf7be", display: "block" }} />
          <span style={{ color: "rgba(245,247,251,0.65)", fontSize: "0.78rem", fontWeight: 600 }}>Meta Ads</span>
        </div>
      </div>

      {/* Grouped column chart per metric */}
      {metrics.map(m => {
        const maxVal = Math.max(m.google, m.meta, 1);
        const gPct   = (m.google / maxVal) * 100;
        const mPct   = (m.meta   / maxVal) * 100;

        return (
          <div key={m.key} style={{ marginBottom: "1.5rem" }}>
            <span style={{ color: "rgba(245,247,251,0.45)", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "0.65rem" }}>
              {m.label}
            </span>
            {/* Google bar */}
            <div style={{ marginBottom: "0.45rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ flex: 1, height: 22, background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: animate ? `${gPct}%` : "0%",
                    background: "linear-gradient(90deg, #4f9cff, #7bb7ff)",
                    borderRadius: 6,
                    transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)",
                    boxShadow: "0 0 10px rgba(123,183,255,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: 6,
                    minWidth: m.google > 0 ? 40 : 0,
                  }}>
                  </div>
                </div>
                <span style={{ color: "#f5f7fb", fontSize: "0.85rem", fontWeight: 700, minWidth: 80, textAlign: "right" }}>
                  {m.format(m.google)}
                </span>
              </div>
            </div>
            {/* Meta bar */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ flex: 1, height: 22, background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: animate ? `${mPct}%` : "0%",
                    background: "linear-gradient(90deg, #42c98a, #7cf7be)",
                    borderRadius: 6,
                    transition: "width 0.9s cubic-bezier(0.4,0,0.2,1) 0.1s",
                    boxShadow: "0 0 10px rgba(124,247,190,0.4)",
                    minWidth: m.meta > 0 ? 40 : 0,
                  }}>
                  </div>
                </div>
                <span style={{ color: "#f5f7fb", fontSize: "0.85rem", fontWeight: 700, minWidth: 80, textAlign: "right" }}>
                  {m.format(m.meta)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
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

  return (
    <article className={`chart-panel ${isUpdating ? "is-updating" : ""}`}>
      <div className="panel-heading" style={{ marginBottom: "1.25rem" }}>
        <div>
          <p className="eyebrow">Distribuição</p>
          <h2>Investimento por plataforma</h2>
        </div>
        {/* Total destaque */}
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#f5f7fb", fontSize: "1.35rem", fontWeight: 800, lineHeight: 1.1 }}>
            {brl.format(totalInvest)}
          </div>
          <div style={{ color: "rgba(245,247,251,0.45)", fontSize: "0.72rem", fontWeight: 500 }}>investimento total</div>
        </div>
      </div>

      {/* Gráfico de barras horizontal */}
      <ColumnChart
        google={google}
        meta={meta}
        googleClicks={googleClicks}
        metaClicks={metaClicks}
        googleConv={googleConv}
        metaConv={metaConv}
      />

      {/* Cards detalhados por plataforma */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.75rem",
        padding: "0 1rem 1.25rem",
      }}>
        {/* Google Ads */}
        <div style={{
          background: "rgba(123,183,255,0.07)",
          border: "1px solid rgba(123,183,255,0.22)",
          borderRadius: "14px",
          padding: "1rem 1.1rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.6rem" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#7bb7ff", flexShrink: 0 }} />
            <span style={{ color: "#7bb7ff", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Google Ads</span>
            <span style={{ marginLeft: "auto", background: "rgba(123,183,255,0.18)", color: "#7bb7ff", fontSize: "0.75rem", fontWeight: 800, padding: "0.1rem 0.45rem", borderRadius: 99 }}>{googlePct}%</span>
          </div>
          <div style={{ color: "#f5f7fb", fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.75rem" }}>
            {brl.format(google)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 0.75rem" }}>
            {[
              { label: "Cliques",     value: num.format(googleClicks) },
              { label: "Conversões",  value: num.format(googleConv) },
              { label: "CPA",         value: brl.format(googleCPA) },
              { label: "Campanhas",   value: googleCampaigns.length },
            ].map(m => (
              <div key={m.label}>
                <div style={{ color: "rgba(245,247,251,0.42)", fontSize: "0.72rem", marginBottom: "0.15rem" }}>{m.label}</div>
                <div style={{ color: "#f5f7fb", fontSize: "0.9rem", fontWeight: 700 }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Meta Ads */}
        <div style={{
          background: "rgba(124,247,190,0.07)",
          border: "1px solid rgba(124,247,190,0.22)",
          borderRadius: "14px",
          padding: "1rem 1.1rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.6rem" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#7cf7be", flexShrink: 0 }} />
            <span style={{ color: "#7cf7be", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Meta Ads</span>
            <span style={{ marginLeft: "auto", background: "rgba(124,247,190,0.18)", color: "#7cf7be", fontSize: "0.75rem", fontWeight: 800, padding: "0.1rem 0.45rem", borderRadius: 99 }}>{metaPct}%</span>
          </div>
          <div style={{ color: "#f5f7fb", fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.75rem" }}>
            {brl.format(meta)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 0.75rem" }}>
            {[
              { label: "Cliques",     value: num.format(metaClicks) },
              { label: "Conversões",  value: num.format(metaConv) },
              { label: "CPA",         value: brl.format(metaCPA) },
              { label: "Campanhas",   value: metaCampaigns.length },
            ].map(m => (
              <div key={m.label}>
                <div style={{ color: "rgba(245,247,251,0.42)", fontSize: "0.72rem", marginBottom: "0.15rem" }}>{m.label}</div>
                <div style={{ color: "#f5f7fb", fontSize: "0.9rem", fontWeight: 700 }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
