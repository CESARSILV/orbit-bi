"use client";

import { useEffect, useState } from "react";

// Formatter helper functions
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("pt-BR");

function AnimatedNumber({ value, formatFn }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const duration = 600; // ms
    const startValue = displayValue;
    const endValue = value;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Cubic ease out
      const current = startValue + (endValue - startValue) * eased;
      
      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };

    const animationId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{formatFn(displayValue)}</>;
}

function KpiCard({ label, value, formatFn, meta, accent, index }) {
  return (
    <article
      className="kpi-card"
      style={{
        "--accent": accent,
        animation: `rise 420ms ease ${index * 30}ms both`,
      }}
    >
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        <AnimatedNumber value={value} formatFn={formatFn} />
      </div>
      <div className="kpi-meta">
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
      label: "Conversões",
      value: totals.conversoes || 0,
      formatFn: (v) => number.format(Math.round(v)),
      meta: "Total de ações de conversão",
      accent: "#7cf7be", // Green
    },
    {
      label: "Leads",
      value: totals.leads || 0,
      formatFn: (v) => number.format(Math.round(v)),
      meta: "Contatos e cadastros capturados",
      accent: "#7bb7ff", // Blue
    },
    {
      label: "CTR Médio",
      value: (totals.ctr || 0) * 100, // CTR ratio to percent
      formatFn: (v) => `${v.toFixed(2).replace(".", ",")}%`,
      meta: "Taxa de cliques (Clicks/Impr)",
      accent: "#ffd481", // Amber
    },
    {
      label: "CPC Médio",
      value: totals.cpc || 0,
      formatFn: (v) => brl.format(v),
      meta: "Custo por clique médio",
      accent: "#7cf7be", // Green
    },
    {
      label: "CPM Médio",
      value: totals.cpm || 0,
      formatFn: (v) => brl.format(v),
      meta: "Custo por mil impressões",
      accent: "#b99cff", // Purple
    },
    {
      label: "CPL Médio",
      value: totals.cpl || 0,
      formatFn: (v) => brl.format(v),
      meta: "Custo por Lead capturado",
      accent: "#7bb7ff", // Blue
    },
    {
      label: "ROAS Médio",
      value: totals.roas || 0,
      formatFn: (v) => `${v.toFixed(2).replace(".", ",")}x`,
      meta: "Retorno do investimento em anúncio",
      accent: "#7cf7be", // Green
    },
    {
      label: "CAC Médio",
      value: totals.cac || 0,
      formatFn: (v) => brl.format(v),
      meta: "Custo de aquisição por cliente",
      accent: "#ffd481", // Amber
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
