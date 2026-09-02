"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Formatter helper functions
// brl: used for large monetary totals (Investimento, Receita) — no decimals
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
// brl2: used for unit costs (CPC, CPL, CAC, CPM) — always 2 decimal places
const brl2 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("pt-BR");

const formatCount = (value) => number.format(Math.max(0, Math.round(Number(value) || 0)));

function KpiCard({ label, value, formatFn, meta, accent, index, interactive = false, onActivate, isExpanded }) {
  const formattedValue = formatFn(value);

  const handleKeyDown = (event) => {
    if (!interactive || !onActivate) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  };

  return (
    <article
      className={`kpi-card kpi-card--enter${interactive ? " kpi-card--interactive" : ""}`}
      aria-label={`${label}: ${formattedValue}. ${meta}${interactive ? " Clique para ver o detalhamento." : ""}`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-haspopup={interactive ? "dialog" : undefined}
      aria-expanded={interactive ? isExpanded : undefined}
      aria-controls={interactive ? "appointment-breakdown-dialog" : undefined}
      onClick={interactive ? onActivate : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
      style={{
        "--accent": accent,
        "--enter-delay": `${Math.min(index, 5) * 35}ms`,
      }}
    >
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" aria-hidden="true">{formattedValue}</div>
      <div className="kpi-meta" aria-hidden="true">
        <span>{meta}</span>
        {interactive && <span className="kpi-interactive-hint">Ver detalhes</span>}
      </div>
    </article>
  );
}

function AppointmentBreakdownModal({ breakdown, onClose }) {
  const closeButtonRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const previousOverflowRef = useRef("");

  useEffect(() => {
    previousActiveElementRef.current = document.activeElement;
    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimeout = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimeout);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflowRef.current;
      previousActiveElementRef.current?.focus?.();
    };
  }, [onClose]);

  const data = {
    total: 0,
    meta: 0,
    google: 0,
    playbooks: 0,
    outras: 0,
    semOrigem: 0,
    demosRealizadas: 0,
    registrosEncontrados: 0,
    registrosComOrigem: 0,
    registrosInferidos: 0,
    hasWarning: false,
    ...breakdown,
  };

  const stats = [
    { key: "meta", label: "Meta", value: data.meta, modifier: "meta" },
    { key: "google", label: "Google", value: data.google, modifier: "google" },
    { key: "playbooks", label: "Playbooks", value: data.playbooks, modifier: "playbooks" },
    { key: "outras", label: "Outras origens", value: data.outras, modifier: "outras" },
    { key: "sem-origem", label: "Sem origem", value: data.semOrigem, modifier: "sem-origem" },
    { key: "demos", label: "Demos realizadas", value: data.demosRealizadas, modifier: "demos" },
  ];

  return (
    <div
      className="appointment-breakdown-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        id="appointment-breakdown-dialog"
        className="appointment-breakdown-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-breakdown-title"
        aria-describedby="appointment-breakdown-description"
      >
        <header className="appointment-breakdown-header">
          <div>
            <p className="appointment-breakdown-eyebrow">Agendamentos</p>
            <h2 id="appointment-breakdown-title">Dados por plataforma</h2>
            <p id="appointment-breakdown-description">
              Registros reais do DOitSA distribuídos pela origem de aquisição no período e nos filtros selecionados.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="appointment-breakdown-close"
            onClick={onClose}
            aria-label="Fechar detalhamento de agendamentos"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="appointment-breakdown-total">
          <span>Total exibido no card</span>
          <strong>{formatCount(data.total)}</strong>
          <small>O total permanece vinculado ao KPI consolidado do dashboard.</small>
        </div>

        <div className="appointment-breakdown-grid" role="list" aria-label="Agendamentos por origem">
          {stats.map((stat) => (
            <div className={`appointment-breakdown-stat appointment-breakdown-stat--${stat.modifier}`} role="listitem" key={stat.key}>
              <span>{stat.label}</span>
              <strong>{formatCount(stat.value)}</strong>
            </div>
          ))}
        </div>

        {data.hasWarning && (
          <div className="appointment-breakdown-warning" role="status">
            <strong>Atenção à atribuição</strong>
            <span>
              O card consolida {formatCount(data.total)} agendamento(s). Foram localizados {formatCount(data.registrosEncontrados)} registro(s) DOitSA neste filtro, dos quais {formatCount(data.registrosComOrigem)} têm atribuição identificada por origem ou UTM. {data.registrosInferidos > 0 ? `${formatCount(data.registrosInferidos)} foram classificados por um campo auxiliar. ` : ""}Registros sem evidência de plataforma aparecem em “Sem origem” e podem exigir reimportação.
            </span>
          </div>
        )}

        <p className="appointment-breakdown-footnote">
          Meta reúne Facebook, Instagram e WhatsApp. “Outras origens” preserva valores informados pelo comercial que não correspondem às categorias principais.
        </p>
      </section>
    </div>
  );
}

export default function KpiGrid({ totals, appointmentBreakdown }) {
  const [isAppointmentsOpen, setIsAppointmentsOpen] = useState(false);
  const closeAppointments = useCallback(() => setIsAppointmentsOpen(false), []);
  const openAppointments = useCallback(() => setIsAppointmentsOpen(true), []);

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
      interactive: true,
      onActivate: openAppointments,
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
      label: "CPA Médio",
      value: totals.cac || 0,
      // O denominador de totals.cac é o total de agendamentos CRM.
      formatFn: (v) => v > 0 ? brl2.format(v) : "R$ —",
      meta: "Custo por agendamento",
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
    <>
      <section className="kpi-grid" id="kpiGrid" aria-label="Principais indicadores de mídia paga">
        {kpis.map((kpi, index) => (
          <KpiCard
            key={kpi.label}
            {...kpi}
            index={index}
            isExpanded={kpi.interactive ? isAppointmentsOpen : undefined}
          />
        ))}
      </section>

      {isAppointmentsOpen && (
        <AppointmentBreakdownModal
          breakdown={appointmentBreakdown}
          onClose={closeAppointments}
        />
      )}
    </>
  );
}
