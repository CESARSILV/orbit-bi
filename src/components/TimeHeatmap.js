"use client";

import { useState } from "react";

const HOURS_LABELS = ["0h-4h", "4h-8h", "8h-12h", "12h-16h", "16h-20h", "20h-24h"];
const DAYS_FULL = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];

export default function TimeHeatmap({ timeData }) {
  const [hoveredCell, setHoveredCell] = useState(null);

  const isDataAvailable = !!timeData;
  const data = timeData || [
    { day: "Seg", hours: [0, 0, 0, 0, 0, 0] },
    { day: "Ter", hours: [0, 0, 0, 0, 0, 0] },
    { day: "Qua", hours: [0, 0, 0, 0, 0, 0] },
    { day: "Qui", hours: [0, 0, 0, 0, 0, 0] },
    { day: "Sex", hours: [0, 0, 0, 0, 0, 0] },
    { day: "Sáb", hours: [0, 0, 0, 0, 0, 0] },
    { day: "Dom", hours: [0, 0, 0, 0, 0, 0] }
  ];

  // Find max value for color scaling
  const maxVal = Math.max(...data.flatMap(d => d.hours), 1);

  // Generate a recommendation based on cell coordinates
  const getRecommendation = (dayIdx, hourIdx, value) => {
    const isMadrugada = hourIdx === 0 || hourIdx === 1;
    const isHorarioComercial = hourIdx === 2 || hourIdx === 3 || hourIdx === 4;
    const isFimDeSemana = dayIdx >= 5;

    if (value > maxVal * 0.75) {
      return "🏆 Desempenho Excepcional. Escalar verba para maximizar vendas!";
    }
    if (isMadrugada && value < maxVal * 0.25) {
      return "⚠️ CPA elevado. Recomendável reduzir lances na madrugada.";
    }
    if (isHorarioComercial && value > maxVal * 0.5) {
      return "🚀 Horário nobre. Manter anúncios sempre ativos.";
    }
    if (isFimDeSemana && value < maxVal * 0.3) {
      return "💡 Menor tráfego no final de semana. Ajustar CPA desejado.";
    }
    return "📈 Fluxo estável. Ajustes finos de lance recomendados.";
  };

  return (
    <article className="glass-card heatmap-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Análise Cronológica</p>
          <h3>Densidade por Dia e Hora</h3>
        </div>
        <span className={isDataAvailable ? "badge-suporte" : "badge-suporte-empty"}>
          {isDataAvailable ? "Calendário IA" : "Sem Dados"}
        </span>
      </div>

      <div className="heatmap-container">
        <div className="heatmap-hours-header">
          <div className="day-label-placeholder"></div>
          {HOURS_LABELS.map((lbl, idx) => (
            <span key={idx} className="hour-header-lbl">{lbl}</span>
          ))}
        </div>

        <div className="heatmap-rows">
          {data.map((dayRow, dayIdx) => (
            <div key={dayIdx} className="heatmap-row">
              <span className="day-row-lbl">{dayRow.day}</span>
              <div className="heatmap-cells">
                {dayRow.hours.map((val, hourIdx) => {
                  const intensity = val / maxVal;
                  const cellStyle = {
                    backgroundColor: isDataAvailable
                      ? `rgba(66, 185, 131, ${0.1 + intensity * 0.9})`
                      : "rgba(255, 255, 255, 0.03)",
                    boxShadow: isDataAvailable && intensity > 0.8 ? "0 0 10px rgba(66, 185, 131, 0.4)" : "none",
                    border: isDataAvailable ? "none" : "1px solid rgba(255, 255, 255, 0.05)"
                  };

                  return (
                    <div
                       key={hourIdx}
                       className="heatmap-cell"
                       style={cellStyle}
                       onMouseEnter={(e) => {
                         if (!isDataAvailable) return;
                         const rect = e.currentTarget.getBoundingClientRect();
                         setHoveredCell({
                           day: DAYS_FULL[dayIdx],
                           hour: HOURS_LABELS[hourIdx],
                           value: val,
                           recommendation: getRecommendation(dayIdx, hourIdx, val),
                           x: rect.left + rect.width / 2,
                           y: rect.top - 10
                         });
                       }}
                       onMouseLeave={() => setHoveredCell(null)}
                    ></div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="heatmap-legend">
          <span>Menos conversões</span>
          <div className="legend-gradient"></div>
          <span>Mais conversões</span>
        </div>
      </div>

      {hoveredCell && (
        <div 
          className="heatmap-tooltip"
          style={{
            position: "fixed",
            left: hoveredCell.x,
            top: hoveredCell.y,
            transform: "translate(-50%, -100%)",
            zIndex: 9999,
          }}
        >
          <div className="tooltip-inner">
            <span className="tooltip-title">{hoveredCell.day} - {hoveredCell.hour}</span>
            <div className="tooltip-stat">
              <strong>{hoveredCell.value}</strong> <span>conversões</span>
            </div>
            <p className="tooltip-recommendation">{hoveredCell.recommendation}</p>
          </div>
          <div className="tooltip-arrow"></div>
        </div>
      )}
    </article>
  );
}
