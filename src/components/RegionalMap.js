"use client";

import { useState, useEffect } from "react";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function RegionalMap({ geoData }) {
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const timerStart = setTimeout(() => setIsUpdating(true), 0);
    const timerEnd = setTimeout(() => setIsUpdating(false), 250);
    return () => {
      clearTimeout(timerStart);
      clearTimeout(timerEnd);
    };
  }, [geoData]);

  const isDataAvailable = !!geoData;
  const data = geoData || [
    { region: "Sudeste", value: 0, invest: 0, conv: 0, cpa: 0 },
    { region: "Sul", value: 0, invest: 0, conv: 0, cpa: 0 },
    { region: "Nordeste", value: 0, invest: 0, conv: 0, cpa: 0 },
    { region: "Centro-Oeste", value: 0, invest: 0, conv: 0, cpa: 0 },
    { region: "Norte", value: 0, invest: 0, conv: 0, cpa: 0 }
  ];

  const [activeRegionName, setActiveRegionName] = useState("Sudeste");
  const activeRegion = data.find(d => d.region === activeRegionName) || data[0];

  // Find region in our data array
  const handleMouseEnter = (regionName) => {
    setActiveRegionName(regionName);
  };

  // Helper to determine region color intensity based on value/conversions
  const getRegionOpacity = (regionName) => {
    if (!isDataAvailable) return 0.08;
    const found = data.find(d => d.region === regionName);
    if (!found) return 0.08;
    const val = found.value;
    return 0.15 + (val / 55) * 0.85;
  };

  return (
    <article className={`glass-card map-card ${isUpdating ? "is-updating" : ""}`}>
      <div className="card-header">
        <div>
          <p className="eyebrow">Distribuição Demográfica</p>
          <h3>Engajamento por Região</h3>
        </div>
        <span className={isDataAvailable ? "badge-suporte" : "badge-suporte-empty"}>
          {isDataAvailable ? "Geográfico (IA)" : "Sem Dados"}
        </span>
      </div>

      <div className="map-content-layout">
        {/* SVG Brazil Map */}
        <div className="map-svg-container">
          <svg viewBox="0 0 400 400" className="brazil-svg">
            <g id="regions">
              {/* NORTE */}
              <path
                d="M 40,140 L 90,60 L 210,80 L 230,150 L 180,180 L 120,200 L 80,180 Z"
                className={`map-region-path Norte ${activeRegion.region === "Norte" ? "active" : ""}`}
                style={{ fill: `rgba(90, 160, 255, ${getRegionOpacity("Norte")})` }}
                onMouseEnter={() => handleMouseEnter("Norte")}
              />
              {/* NORDESTE */}
              <path
                d="M 210,80 L 290,90 L 330,130 L 330,180 L 280,210 L 250,170 L 230,150 Z"
                className={`map-region-path Nordeste ${activeRegion.region === "Nordeste" ? "active" : ""}`}
                style={{ fill: `rgba(90, 160, 255, ${getRegionOpacity("Nordeste")})` }}
                onMouseEnter={() => handleMouseEnter("Nordeste")}
              />
              {/* CENTRO-OESTE */}
              <path
                d="M 120,200 L 180,180 L 230,150 L 250,170 L 240,240 L 190,280 L 140,270 Z"
                className={`map-region-path Centro-Oeste ${activeRegion.region === "Centro-Oeste" ? "active" : ""}`}
                style={{ fill: `rgba(90, 160, 255, ${getRegionOpacity("Centro-Oeste")})` }}
                onMouseEnter={() => handleMouseEnter("Centro-Oeste")}
              />
              {/* SUDESTE */}
              <path
                d="M 240,240 L 280,210 L 310,230 L 300,280 L 250,290 L 220,270 Z"
                className={`map-region-path Sudeste ${activeRegion.region === "Sudeste" ? "active" : ""}`}
                style={{ fill: `rgba(90, 160, 255, ${getRegionOpacity("Sudeste")})` }}
                onMouseEnter={() => handleMouseEnter("Sudeste")}
              />
              {/* SUL */}
              <path
                d="M 190,280 L 220,270 L 250,290 L 230,360 L 180,340 Z"
                className={`map-region-path Sul ${activeRegion.region === "Sul" ? "active" : ""}`}
                style={{ fill: `rgba(90, 160, 255, ${getRegionOpacity("Sul")})` }}
                onMouseEnter={() => handleMouseEnter("Sul")}
              />
            </g>
          </svg>
          <div className="map-hint">Passe o mouse nas regiões para inspecionar</div>
        </div>

        {/* Region stats panel */}
        <div className="map-stats-panel">
          <div className="active-region-header">
            <h4>Região {activeRegion.region}</h4>
            <span className="region-share">{activeRegion.value}% das conversões</span>
          </div>

          <div className="region-stats-grid">
            <div className="region-stat-item">
              <span className="region-stat-lbl">Investimento</span>
              <strong className="region-stat-val">{brl.format(activeRegion.invest)}</strong>
            </div>

            <div className="region-stat-item">
              <span className="region-stat-lbl">Conversões</span>
              <strong className="region-stat-val">{activeRegion.conv}</strong>
            </div>

            <div className="region-stat-item">
              <span className="region-stat-lbl">CPA Regional</span>
              <strong className="region-stat-val">{brl.format(activeRegion.cpa)}</strong>
            </div>

            <div className="region-stat-item">
              <span className="region-stat-lbl">ROI Estimado</span>
              <strong className="region-stat-val" style={{ color: "var(--green)" }}>
                {activeRegion.invest > 0 ? `${(((activeRegion.conv * 180 - activeRegion.invest) / activeRegion.invest) * 100).toFixed(0)}%` : "0%"}
              </strong>
            </div>
          </div>

          <div className="region-recommendation-box">
            <h5>💡 Insights Regionais</h5>
            <p>
              {!isDataAvailable && "Aguardando carregamento de planilha de dados demográficos/geográficos para gerar insights."}
              {isDataAvailable && activeRegion.region === "Sudeste" && "Região líder com menor CPA. Recomendável focar 50%+ da verba de conversão aqui."}
              {isDataAvailable && activeRegion.region === "Sul" && "Excelente retorno por investimento. Oportunidade de aumentar os lances de público."}
              {isDataAvailable && activeRegion.region === "Nordeste" && "CPA equilibrado. Bom volume de leads. Aumentar frequência de anúncios locais."}
              {isDataAvailable && activeRegion.region === "Centro-Oeste" && "Público seleto e ticket médio alto. Excelente para campanhas de produtos Premium."}
              {isDataAvailable && activeRegion.region === "Norte" && "CPA mais alto da média nacional. Otimizar criativos para atração regionalizada."}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
