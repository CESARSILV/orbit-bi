"use client";

import { useEffect, useState, useRef } from "react";

// Formatter helper functions
// brl: used for large monetary totals (Investimento, Receita) — no decimals
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
// brl2: used for unit costs (CPC, CPL, CAC, CPM) — always 2 decimal places
const brl2 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("pt-BR");

function AnimatedNumber({ value, formatFn }) {
  const [displayValue, setDisplayValue] = useState(0);
  // A-04 FIX: Track current display value in a ref to avoid stale closure
  const displayRef = useRef(0);

  useEffect(() => {
    let startTimestamp = null;
    const duration = 600; // ms
    // Read from ref so we always get the actual current animated value
    const startValue = displayRef.current;
    const endValue = value;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Cubic ease out
      const current = startValue + (endValue - startValue) * eased;
      
      displayRef.current = current;
      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        displayRef.current = endValue;
        setDisplayValue(endValue);
      }
    };

    const animationId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationId);
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
      label: "Leads",
      value: totals.leads || 0,
      formatFn: (v) => number.format(Math.round(v)),
      meta: "Contatos e cadastros capturados",
      accent: "#7bb7ff", // Blue
    },
    {
      label: "Leads Qualificados",
      value: totals.demos || 0,
      formatFn: (v) => number.format(Math.round(v)),
      meta: "Leads qualificados no CRM",
      accent: "#b99cff", // Purple
    },
    {
      label: "Agendados",
      value: totals.conversoes || 0,
      formatFn: (v) => number.format(Math.round(v)),
      meta: "Agendamentos confirmados (via CRM)",
      accent: "#7cf7be", // Green
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
