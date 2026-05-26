"use client";

import { useState, useEffect } from "react";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function CampaignTable({ campaigns }) {
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const timerStart = setTimeout(() => setIsUpdating(true), 0);
    const timerEnd = setTimeout(() => setIsUpdating(false), 250);
    return () => {
      clearTimeout(timerStart);
      clearTimeout(timerEnd);
    };
  }, [campaigns]);

  // Sort campaigns by ROAS descending like in original app
  const sortedCampaigns = [...campaigns].sort((a, b) => b.roas - a.roas);

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
              sortedCampaigns.map((item) => (
                <tr key={`${item.tipo}_${item.nome}`}>
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
    </article>
  );
}
