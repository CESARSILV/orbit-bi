"use client";

import { useEffect, useState } from "react";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function DeviceChart({ deviceData }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const isDataAvailable = !!deviceData;
  const data = deviceData || {
    mobile: { percent: 0, invest: 0, conv: 0, cpa: 0 },
    desktop: { percent: 0, invest: 0, conv: 0, cpa: 0 }
  };

  const mobileWidth = animate ? `${data.mobile.percent}%` : "0%";
  const desktopWidth = animate ? `${data.desktop.percent}%` : "0%";

  return (
    <article className="glass-card device-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Desempenho de Dispositivos</p>
          <h3>Mobile vs Desktop</h3>
        </div>
        <span className={isDataAvailable ? "badge-suporte" : "badge-suporte-empty"}>
          {isDataAvailable ? "Planilha Atualizada" : "Sem Dados"}
        </span>
      </div>

      <div className="device-distribution">
        {/* Mobile Section */}
        <div className="device-item mobile-item">
          <div className="device-icon-wrapper">
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="device-svg">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
              <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
          </div>
          <div className="device-info">
            <div className="device-label-row">
              <span className="device-name">Celular (Mobile)</span>
              <span className="device-percentage">{data.mobile.percent.toFixed(0)}%</span>
            </div>
            <div className="device-bar-container">
              <div className="device-bar-fill mobile-fill" style={{ width: mobileWidth }}></div>
            </div>
            <div className="device-metrics-grid">
              <div>
                <span className="metric-lbl">Investimento</span>
                <span className="metric-val">{brl.format(data.mobile.invest)}</span>
              </div>
              <div>
                <span className="metric-lbl">Conversões</span>
                <span className="metric-val">{data.mobile.conv}</span>
              </div>
              <div>
                <span className="metric-lbl">CPA</span>
                <span className="metric-val">{brl.format(data.mobile.cpa)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Section */}
        <div className="device-item desktop-item">
          <div className="device-icon-wrapper">
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="device-svg">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <div className="device-info">
            <div className="device-label-row">
              <span className="device-name">Computador (Desktop)</span>
              <span className="device-percentage">{data.desktop.percent.toFixed(0)}%</span>
            </div>
            <div className="device-bar-container">
              <div className="device-bar-fill desktop-fill" style={{ width: desktopWidth }}></div>
            </div>
            <div className="device-metrics-grid">
              <div>
                <span className="metric-lbl">Investimento</span>
                <span className="metric-val">{brl.format(data.desktop.invest)}</span>
              </div>
              <div>
                <span className="metric-lbl">Conversões</span>
                <span className="metric-val">{data.desktop.conv}</span>
              </div>
              <div>
                <span className="metric-lbl">CPA</span>
                <span className="metric-val">{brl.format(data.desktop.cpa)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
