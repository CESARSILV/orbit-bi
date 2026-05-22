"use client";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function CampaignTable({ campaigns }) {
  // Sort campaigns by ROAS descending like in original app
  const sortedCampaigns = [...campaigns].sort((a, b) => b.roas - a.roas);

  return (
    <article className="table-panel" id="criativos">
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
            {sortedCampaigns.map((item, index) => (
              <tr key={index}>
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
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
