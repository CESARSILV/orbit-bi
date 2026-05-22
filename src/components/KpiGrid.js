"use client";

import { useEffect, useState } from "react";

// Formatter helper functions
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("pt-BR");

function AnimatedNumber({ value, formatFn }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const duration = 800; // ms
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
  }, [value]);

  return <>{formatFn(displayValue)}</>;
}

function KpiCard({ label, value, formatFn, delta, direction, meta, accent, index, showDelta }) {
  return (
    <article
      className="kpi-card"
      style={{
        "--accent": accent,
        animation: `rise 420ms ease ${index * 35}ms both`,
      }}
    >
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        <AnimatedNumber value={value} formatFn={formatFn} />
      </div>
      <div className="kpi-meta">
        {showDelta && <span className={`delta ${direction}`}>{delta}</span>}
        <span>{meta}</span>
      </div>
    </article>
  );
}

export default function KpiGrid({ totals }) {
  const kpis = [
    {
      label: "ROAS",
      value: totals.roas || 0,
      formatFn: (v) => `${v.toFixed(2).replace(".", ",")}x`,
      delta: "+12,4%",
      direction: "up",
      meta: "Retorno sobre investimento",
      accent: "#7cf7be",
    },
    {
      label: "CPA",
      value: totals.cpa || 0,
      formatFn: (v) => brl.format(v),
      delta: "-8,7%",
      direction: "up", // In marketing context, down in CPA is good, labeled "up" for color coding in CSS classes
      meta: "Custo por aquisição",
      accent: "#7bb7ff",
    },
    {
      label: "Receita total",
      value: totals.receita || 0,
      formatFn: (v) => brl.format(v),
      delta: "+18,9%",
      direction: "up",
      meta: "Faturamento atribuído",
      accent: "#ffd481",
    },
    {
      label: "Investimento",
      value: totals.investimento || 0,
      formatFn: (v) => brl.format(v),
      delta: "+9,6%",
      direction: "up",
      meta: "Mídia paga total",
      accent: "#b99cff",
    },
    {
      label: "Lucro estimado",
      value: totals.lucro || 0,
      formatFn: (v) => brl.format(v),
      delta: "+22,1%",
      direction: "up",
      meta: "Receita menos mídia",
      accent: "#7cf7be",
    },
    {
      label: "Conversões",
      value: totals.conversoes || 0,
      formatFn: (v) => number.format(Math.round(v)),
      delta: "+14,2%",
      direction: "up",
      meta: "Compras e leads",
      accent: "#7bb7ff",
    },
    {
      label: "CTR",
      value: totals.ctr || 0,
      formatFn: (v) => `${v.toFixed(2).replace(".", ",")}%`,
      delta: "+5,1%",
      direction: "up",
      meta: "Taxa de cliques",
      accent: "#ffd481",
    },
    {
      label: "CPC",
      value: totals.cpc || 0,
      formatFn: (v) => brl.format(v),
      delta: "-3,3%",
      direction: "up",
      meta: "Custo por clique",
      accent: "#7cf7be",
    },
    {
      label: "ROI",
      value: totals.roi || 0,
      formatFn: (v) => `${v.toFixed(0)}%`,
      delta: "+16,8%",
      direction: "up",
      meta: "Retorno financeiro",
      accent: "#b99cff",
    },
    {
      label: "Impressões",
      value: totals.impressoes || 0,
      formatFn: (v) => number.format(Math.round(v)),
      delta: "+28,5%",
      direction: "up",
      meta: "Exposição total",
      accent: "#7bb7ff",
    },
    {
      label: "Alcance",
      value: totals.alcance || 0,
      formatFn: (v) => number.format(Math.round(v)),
      delta: "+21,7%",
      direction: "up",
      meta: "Pessoas alcançadas",
      accent: "#ffd481",
    },
    {
      label: "Ticket médio",
      value: totals.ticket || 0,
      formatFn: (v) => brl.format(v),
      delta: "+4,9%",
      direction: "up",
      meta: "Receita média",
      accent: "#7cf7be",
    },
  ];

  const showDeltas = totals.investimento > 0 || totals.receita > 0;

  return (
    <section className="kpi-grid" id="kpiGrid" aria-label="Principais indicadores">
      {kpis.map((kpi, index) => (
        <KpiCard key={kpi.label} {...kpi} index={index} showDelta={showDeltas} />
      ))}
    </section>
  );
}
