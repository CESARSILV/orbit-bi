"use client";

import { useEffect, useState } from "react";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("pt-BR");

function DeviceRow({ icon, label, percent, data, barClass, animatedWidth }) {
  return (
    <div className="device-item" style={{ marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
        {/* Ícone */}
        <div className="device-icon-wrapper" style={{ flexShrink: 0 }}>
          {icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Label + % */}
          <div className="device-label-row">
            <span className="device-name">{label}</span>
            <span className="device-percentage">{percent.toFixed(0)}%</span>
          </div>

          {/* Barra */}
          <div className="device-bar-container" style={{ marginBottom: "0.65rem" }}>
            <div className={`device-bar-fill ${barClass}`} style={{ width: animatedWidth }} />
          </div>

          {/* 4 métricas em grid 2×2 */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: "0.4rem 0.75rem",
          }}>
            <div>
              <span className="metric-lbl">Investimento</span>
              <span className="metric-val">{brl.format(data.invest)}</span>
            </div>
            <div>
              <span className="metric-lbl">Cliques</span>
              <span className="metric-val">{num.format(data.clicks || 0)}</span>
            </div>
            <div>
              <span className="metric-lbl">Conversões</span>
              <span className="metric-val">{num.format(data.conv)}</span>
            </div>
            <div>
              <span className="metric-lbl">CPA</span>
              <span className="metric-val">{brl.format(data.cpa)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DeviceChart({ deviceData }) {
  const [animate, setAnimate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timerStart = setTimeout(() => setIsUpdating(true), 0);
    const timerEnd = setTimeout(() => setIsUpdating(false), 250);
    return () => { clearTimeout(timerStart); clearTimeout(timerEnd); };
  }, [deviceData]);

  const isDataAvailable = !!deviceData;
  const data = deviceData || {
    mobile:  { percent: 0, invest: 0, clicks: 0, conv: 0, cpa: 0 },
    desktop: { percent: 0, invest: 0, clicks: 0, conv: 0, cpa: 0 },
    tablet:  { percent: 0, invest: 0, clicks: 0, conv: 0, cpa: 0 },
  };

  const hasTablet = data.tablet && data.tablet.invest > 0;

  const mobileWidth  = animate ? `${data.mobile.percent}%`  : "0%";
  const desktopWidth = animate ? `${data.desktop.percent}%` : "0%";
  const tabletWidth  = animate ? `${(data.tablet?.percent || 0)}%` : "0%";

  const mobileIcon = (
    <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="device-svg">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );

  const desktopIcon = (
    <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="device-svg">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );

  const tabletIcon = (
    <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="device-svg">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );

  return (
    <article className={`glass-card device-card ${isUpdating ? "is-updating" : ""}`}>
      <div className="card-header">
        <div>
          <p className="eyebrow">Desempenho de Dispositivos</p>
          <h3>Celular vs Computador{hasTablet ? " vs Tablet" : ""}</h3>
        </div>
        <span className={isDataAvailable ? "badge-suporte" : "badge-suporte-empty"}>
          {isDataAvailable ? "Planilha Atualizada" : "Sem Dados"}
        </span>
      </div>

      <div className="device-distribution">
        {isDataAvailable ? (
          <>
            <DeviceRow
              icon={mobileIcon}
              label="Celular"
              percent={data.mobile.percent}
              data={data.mobile}
              barClass="mobile-fill"
              animatedWidth={mobileWidth}
            />

            <DeviceRow
              icon={desktopIcon}
              label="Computador"
              percent={data.desktop.percent}
              data={data.desktop}
              barClass="desktop-fill"
              animatedWidth={desktopWidth}
            />

            {hasTablet && (
              <DeviceRow
                icon={tabletIcon}
                label="Tablet"
                percent={data.tablet.percent}
                data={data.tablet}
                barClass="tablet-fill"
                animatedWidth={tabletWidth}
              />
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem 1rem", color: "rgba(245,247,251,0.4)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem", opacity: 0.3 }}>📱</div>
            <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.4rem", color: "rgba(245,247,251,0.55)" }}>
              Relatório de Dispositivos necessário
            </div>
            <div style={{ fontSize: "0.78rem", lineHeight: 1.6 }}>
              No Google Ads: Relatórios → Segmentação → Dispositivo<br />
              Exporte e importe o CSV para ver dados por dispositivo.
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
