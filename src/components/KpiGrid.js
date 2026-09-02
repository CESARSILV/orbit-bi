"use client";

// Formatter helper functions
// brl: used for large monetary totals (Investimento, Receita) — no decimals
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
// brl2: used for unit costs (CPC, CPL, CAC, CPM) — always 2 decimal places
const brl2 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("pt-BR");

function KpiCard({ label, value, formatFn, meta, accent, index }) {
  const formattedValue = formatFn(value);

  return (
    <article
      className="kpi-card kpi-card--enter"
      aria-label={`${label}: ${formattedValue}. ${meta}`}
      style={{
        "--accent": accent,
        "--enter-delay": `${Math.min(index, 5) * 35}ms`,
      }}
    >
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" aria-hidden="true">{formattedValue}</div>
      <div className="kpi-meta" aria-hidden="true">
        <span>{meta}</span>
      </div>
    </article>
  );
}

export default function KpiGrid({ totals }) {
  const kpis = [
    {
      label: "Investimento Total",
      value: totals.investimento || 0,
      formatFn: (v) => brl.format(v),
      meta: "Mídia paga total consolidada",
      accent: "#b99cff", // Purple
    },
    {
      label: "Cliques Totais",
      value: totals.cliques || 0,
      formatFn: (v) => number.format(Math.round(v)),
      meta: "Cliques em anúncios",
      accent: "#ffd481", // Amber
    },
    {
      label: "Impressões Totais",
      value: totals.impressoes || 0,
      formatFn: (v) => number.format(Math.round(v)),
      meta: "Exibições de anúncios",
      accent: "#7bb7ff", // Blue
    },
    {
      label: "Leads",
      value: totals.leads || 0,
      formatFn: (v) => number.format(Math.round(v)),
      meta: "Contatos e cadastros capturados",
      accent: "#7bb7ff", // Blue
    },
    {
      label: "Leads Qualificados",
      value: totals.qualificados || 0,
      formatFn: (v) => number.format(Math.round(v)),
      meta: "Clientes únicos no primeiro agendamento",
      accent: "#b99cff", // Purple
    },
    {
      label: "Agendamentos",
      value: totals.conversoes || 0,
      formatFn: (v) => number.format(Math.round(v)),
      meta: "Inclui remarcações registradas",
      accent: "#7cf7be", // Green
    },
    {
      label: "Demos Realizadas",
      value: totals.demos || 0,
      formatFn: (v) => number.format(Math.round(v)),
      meta: "Demos confirmadas como realizadas",
      accent: "#ffd481", // Amber
    },
    {
      label: "CTR Médio",
      value: (totals.ctr || 0) * 100,
      formatFn: (v) => `${v.toFixed(2).replace(".", ",")}%`,
      meta: "Taxa de cliques (Clicks/Impr)",
      accent: "#ffd481",
    },
    {
      label: "CPC Médio",
      value: totals.cpc || 0,
      // Use brl2 (2 decimal places) so R$0,37 doesn't show as R$0
      formatFn: (v) => v > 0 ? brl2.format(v) : "R$ —",
      meta: "Custo por clique médio",
      accent: "#7cf7be",
    },
    {
      label: "CPM Médio",
      value: totals.cpm || 0,
      formatFn: (v) => v > 0 ? brl2.format(v) : "R$ —",
      meta: "Custo por mil impressões",
      accent: "#b99cff",
    },
    {
      label: "CPL Médio",
      value: totals.cpl || 0,
      formatFn: (v) => v > 0 ? brl2.format(v) : "R$ —",
      meta: "Custo por Lead capturado",
      accent: "#7bb7ff",
    },

    {
      label: "CAC Médio",
      value: totals.cac || 0,
      // Use brl2 (2 decimal places) so R$0,53 doesn't show as R$1
      formatFn: (v) => v > 0 ? brl2.format(v) : "R$ —",
      meta: "Custo de aquisição por cliente",
      accent: "#ffd481",
    },
    {
      label: "Alcance",
      value: totals.alcance || 0,
      formatFn: (v) => number.format(Math.round(v)),
      meta: "Pessoas únicas impactadas",
      accent: "#b99cff", // Purple
    },
  ];

  return (
    <section className="kpi-grid" id="kpiGrid" aria-label="Principais indicadores de mídia paga">
      {kpis.map((kpi, index) => (
        <KpiCard key={kpi.label} {...kpi} index={index} />
      ))}
    </section>
  );
}
