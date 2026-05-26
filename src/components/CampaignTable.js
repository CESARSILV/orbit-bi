"use client";

import { useState, useEffect } from "react";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const INITIAL_VISIBLE = 5;

export default function CampaignTable({ campaigns }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const timerStart = setTimeout(() => setIsUpdating(true), 0);
    const timerEnd = setTimeout(() => setIsUpdating(false), 250);
    return () => {
      clearTimeout(timerStart);
      clearTimeout(timerEnd);
    };
  }, [campaigns]);

  // Sort campaigns by spend descending (maior investimento primeiro)
  const sortedCampaigns = [...campaigns].sort((a, b) => b.investimento - a.investimento);
  const visibleCampaigns = expanded ? sortedCampaigns : sortedCampaigns.slice(0, INITIAL_VISIBLE);
  const hiddenCount = sortedCampaigns.length - INITIAL_VISIBLE;

  return (
    <article className={`table-panel ${isUpdating ? "is-updating" : ""}`} id="criativos">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Campanhas</p>
          <h2>Ranking de performance</h2>
        </div>
        <span className="live-pill">Tempo real</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Campanha</th>
              <th>Plataforma</th>
              <th>Investimento</th>
              <th>Receita</th>
              <th>ROAS</th>
              <th>CPA</th>
              <th>Status IA</th>
            </tr>
          </thead>
          <tbody>
            {sortedCampaigns.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "rgba(245, 247, 251, 0.42)", fontStyle: "italic" }}>
                  Nenhuma campanha cadastrada. Faça upload de um arquivo CSV de campanhas para começar.
                </td>
              </tr>
            ) : (
              visibleCampaigns.map((item, idx) => (
                <tr
                  key={`${item.tipo}_${item.nome}_${idx}`}
                  style={{
                    animation: expanded && idx >= INITIAL_VISIBLE ? "fadeInRow 0.25s ease forwards" : "none",
                    opacity: expanded && idx >= INITIAL_VISIBLE ? 0 : 1,
                    animationDelay: expanded && idx >= INITIAL_VISIBLE ? `${(idx - INITIAL_VISIBLE) * 40}ms` : "0ms",
                  }}
                >
                  <td>
                    <strong>{item.nome}</strong>
                  </td>
                  <td>{item.plataforma}</td>
                  <td>{brl.format(item.investimento)}</td>
                  <td>{brl.format(item.receita)}</td>
                  <td>{item.roas.toFixed(2).replace(".", ",")}x</td>
                  <td>{brl.format(item.cpa)}</td>
                  <td>
                    <span className="tag">{item.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Botão Ver mais / Ver menos */}
      {sortedCampaigns.length > INITIAL_VISIBLE && (
        <button
          onClick={() => setExpanded(prev => !prev)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            width: "100%",
            background: "rgba(255,255,255,0.03)",
            border: "none",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            color: "rgba(245, 247, 251, 0.55)",
            fontSize: "0.8rem",
            fontWeight: 600,
            padding: "0.75rem 1.25rem",
            cursor: "pointer",
            transition: "all 0.2s ease",
            letterSpacing: "0.02em",
            justifyContent: "center",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(245,247,251,0.85)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "rgba(245,247,251,0.55)"; }}
        >
          <span
            style={{
              display: "inline-block",
              transition: "transform 0.25s ease",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              fontSize: "0.75rem",
            }}
          >
            ▾
          </span>
          {expanded
            ? `Mostrar menos`
            : `Ver mais ${hiddenCount} campanha${hiddenCount !== 1 ? "s" : ""}`}
        </button>
      )}

      <style>{`
        @keyframes fadeInRow {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </article>
  );
}
