"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  KPI_OVERRIDE_DEFINITIONS,
  parseKpiOverrideNumber,
  validateKpiOverrideValue,
} from "@/lib/kpi-overrides";

// Formatter helper functions
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brl2 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("pt-BR");

const formatCount = (value) => number.format(Math.max(0, Math.round(Number(value) || 0)));
const formatPercentage = (value) => `${((Number(value) || 0) * 100).toFixed(2).replace(".", ",")}%`;

const IMPACT_MESSAGES = {
  investimento: "O valor é consolidado e distribuído proporcionalmente no recorte; CPC, CPM, CPL e CPA são recalculados em gráficos, tabelas e total.",
  cliques: "O valor é consolidado e distribuído proporcionalmente no recorte; CTR e CPC são recalculados em gráficos, tabelas e total.",
  impressoes: "O valor é consolidado e distribuído proporcionalmente no recorte; CTR e CPM são recalculados em gráficos, tabelas e total.",
  leads: "O valor é consolidado e distribuído proporcionalmente no recorte; CPL é recalculado em gráficos, tabelas e total.",
  conversoes: "O valor é consolidado e distribuído proporcionalmente no recorte; CPA e o detalhamento por origem são recalculados.",
  qualificados: "O valor é consolidado e distribuído proporcionalmente no recorte, refletindo em gráficos, tabelas e total.",
  demos: "O valor é consolidado e distribuído proporcionalmente no recorte, refletindo em gráficos, tabelas e total.",
  alcance: "O valor é consolidado e distribuído proporcionalmente no recorte, refletindo em gráficos, tabelas e total.",
  ctr: "Este valor manual passa a valer no total do recorte; as linhas continuam com o CTR recalculado a partir de cliques e impressões.",
  cpc: "Este valor manual passa a valer no total do recorte; as linhas continuam com o CPC recalculado a partir de investimento e cliques.",
  cpm: "Este valor manual passa a valer no total do recorte; as linhas continuam com o CPM recalculado a partir de investimento e impressões.",
  cpl: "Este valor manual passa a valer no total do recorte; as linhas continuam com o CPL recalculado a partir de investimento e leads.",
  cpa: "Este valor manual passa a valer no total do recorte; as linhas continuam com o CPA recalculado a partir de investimento e agendamentos.",
};

function valueForInput(kpi, value) {
  const displayValue = kpi.key === "ctr" ? (Number(value) || 0) * 100 : Number(value) || 0;
  if (KPI_OVERRIDE_DEFINITIONS[kpi.key]?.input === "count") {
    return String(Math.round(displayValue));
  }

  return String(Number(displayValue.toFixed(6))).replace(".", ",");
}

function KpiCard({ label, value, formatFn, meta, accent, index, adjustmentState, onEdit, onDetails }) {
  const formattedValue = formatFn(value);
  const statusLabel = adjustmentState === "manual"
    ? "Ajustado manualmente"
    : adjustmentState === "recalculated"
      ? "Recalculado"
      : null;

  return (
    <article
      className="kpi-card kpi-card--enter"
      aria-label={`${label}: ${formattedValue}. ${meta}${statusLabel ? ` ${statusLabel}.` : ""}`}
      style={{
        "--accent": accent,
        "--enter-delay": `${Math.min(index, 5) * 35}ms`,
      }}
    >
      <div className="kpi-card-heading">
        <div className="kpi-label">{label}</div>
        {statusLabel && (
          <span className={`kpi-adjustment-badge kpi-adjustment-badge--${adjustmentState}`}>
            {adjustmentState === "manual" ? "Conferido" : "Recalculado"}
          </span>
        )}
      </div>
      <div className="kpi-value">{formattedValue}</div>
      <div className="kpi-meta">
        <span>{meta}</span>
      </div>
      <div className="kpi-card-actions">
        <button
          type="button"
          className="kpi-card-edit-button"
          onClick={onEdit}
          aria-label={`Ajustar ${label}`}
        >
          <span aria-hidden="true">✎</span> Ajustar
        </button>
        {onDetails && (
          <button
            type="button"
            className="kpi-card-details-button"
            onClick={onDetails}
            aria-label={`Ver detalhamento de ${label}`}
          >
            Ver detalhes
          </button>
        )}
      </div>
    </article>
  );
}

function KpiAdjustmentModal({
  kpi,
  baseValue,
  automaticValue,
  effectiveValue,
  override,
  onSave,
  onRestore,
  onClose,
  persistenceNotice,
}) {
  const inputRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const previousOverflowRef = useRef("");
  const [valueInput, setValueInput] = useState(() => valueForInput(kpi, effectiveValue));
  const [reason, setReason] = useState(override?.reason || "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    previousActiveElementRef.current = document.activeElement;
    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimeout = window.setTimeout(() => inputRef.current?.focus(), 0);
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimeout);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflowRef.current;
      previousActiveElementRef.current?.focus?.();
    };
  }, [isSaving, onClose]);

  const inputDefinition = KPI_OVERRIDE_DEFINITIONS[kpi.key];
  const displayUnit = inputDefinition?.input === "percentage" ? "%" : "";
  const hasAutomaticDifference = Math.abs((Number(automaticValue) || 0) - (Number(baseValue) || 0)) > 0.000001;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const typedValue = parseKpiOverrideNumber(valueInput);
    const storedValue = kpi.key === "ctr" ? typedValue / 100 : typedValue;
    const validation = validateKpiOverrideValue(kpi.key, storedValue);

    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const result = await onSave({ metric: kpi.key, value: validation.value, reason });
      if (!result?.success) throw new Error(result?.error || "Não foi possível salvar o ajuste.");
      onClose();
    } catch (saveError) {
      setError(saveError.message || "Não foi possível salvar o ajuste.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async () => {
    setIsSaving(true);
    setError("");
    try {
      const result = await onRestore(kpi.key);
      if (!result?.success) throw new Error(result?.error || "Não foi possível restaurar o cálculo automático.");
      onClose();
    } catch (restoreError) {
      setError(restoreError.message || "Não foi possível restaurar o cálculo automático.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="kpi-adjustment-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <section
        className="kpi-adjustment-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kpi-adjustment-title"
        aria-describedby="kpi-adjustment-description"
      >
        <header className="kpi-adjustment-header">
          <div>
            <p className="kpi-adjustment-eyebrow">Conferência manual</p>
            <h2 id="kpi-adjustment-title">Ajustar {kpi.label}</h2>
            <p id="kpi-adjustment-description">
              O ajuste altera somente o total consolidado deste recorte. Os fatos importados continuam preservados.
            </p>
          </div>
          <button
            type="button"
            className="kpi-adjustment-close"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Fechar ajuste manual"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="kpi-adjustment-values" aria-label="Comparação de valores">
          <div>
            <span>Valor importado</span>
            <strong>{kpi.formatFn(baseValue)}</strong>
          </div>
          {hasAutomaticDifference && (
            <div>
              <span>Automático após outros ajustes</span>
              <strong>{kpi.formatFn(automaticValue)}</strong>
            </div>
          )}
          <div className="kpi-adjustment-current">
            <span>Valor efetivo atual</span>
            <strong>{kpi.formatFn(effectiveValue)}</strong>
          </div>
        </div>

        <form className="kpi-adjustment-form" onSubmit={handleSubmit}>
          <label htmlFor="kpi-adjustment-value">
            Valor revisado {displayUnit ? "(%)" : ""}
          </label>
          <div className="kpi-adjustment-input-wrap">
            <input
              ref={inputRef}
              id="kpi-adjustment-value"
              type="text"
              inputMode={inputDefinition?.input === "count" ? "numeric" : "decimal"}
              value={valueInput}
              onChange={(event) => setValueInput(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "kpi-adjustment-error" : "kpi-adjustment-impact"}
              disabled={isSaving}
              autoComplete="off"
            />
            {displayUnit && <span aria-hidden="true">{displayUnit}</span>}
          </div>

          <label htmlFor="kpi-adjustment-reason">Motivo da conferência <span>(opcional)</span></label>
          <textarea
            id="kpi-adjustment-reason"
            rows="3"
            maxLength="400"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: total validado no CRM comercial."
            disabled={isSaving}
          />

          <p id="kpi-adjustment-impact" className="kpi-adjustment-impact">
            <strong>Impacto:</strong> {IMPACT_MESSAGES[kpi.key]}
          </p>
          <p className="kpi-adjustment-persistence">{persistenceNotice}</p>
          {error && <p id="kpi-adjustment-error" className="kpi-adjustment-error" role="alert">{error}</p>}

          <div className="kpi-adjustment-actions">
            {override && (
              <button
                type="button"
                className="kpi-adjustment-restore"
                onClick={handleRestore}
                disabled={isSaving}
              >
                Restaurar automático
              </button>
            )}
            <button type="button" className="kpi-adjustment-cancel" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
            <button type="submit" className="kpi-adjustment-save" disabled={isSaving}>
              {isSaving ? "Salvando…" : "Salvar ajuste"}
            </button>
          </div>
        </form>
      </section>
    </div>
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
    playbooksOutras: 0,
    demosRealizadas: 0,
    isTotalAdjusted: false,
    isDemosAdjusted: false,
    hasUnallocatedAdjustment: false,
    effectiveConversoes: 0,
    ...breakdown,
  };

  const stats = [
    { key: "meta", label: "Meta", value: data.meta, modifier: "meta" },
    { key: "google", label: "Google", value: data.google, modifier: "google" },
    { key: "playbooks-outros", label: "Playbooks e outras origens", value: data.playbooksOutras, modifier: "playbooks" },
    {
      key: "demos",
      label: data.isDemosAdjusted ? "Demos realizadas (ajustadas)" : "Demos realizadas",
      value: data.demosRealizadas,
      modifier: "demos",
    },
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
              Cada cliente com ID ou telefone válido é contado uma vez por mês de agendamento. Demos entram uma vez por cliente no mês da realização válida.
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
          <small>
            {data.isTotalAdjusted
              ? "Valor conferido e consolidado para este recorte."
              : "Consolidado por cliente e mês de agendamento."}
          </small>
        </div>

        {(data.isTotalAdjusted || data.isDemosAdjusted) && !data.hasUnallocatedAdjustment && (
          <div className="appointment-breakdown-warning">
            <strong>Conferência manual consolidada</strong>
            <span>O valor conferido foi distribuído proporcionalmente entre as origens que já tinham registros, então a soma por plataforma fecha com o total.</span>
          </div>
        )}
        {data.hasUnallocatedAdjustment && (
          <div className="appointment-breakdown-warning">
            <strong>Ajuste sem base para distribuição</strong>
            <span>
              O valor conferido ({formatCount(data.effectiveConversoes)}) não pôde ser distribuído por origem porque não há registros de agendamento neste recorte. A soma por plataforma abaixo reflete os dados disponíveis; importe o período para consolidar a divisão.
            </span>
          </div>
        )}

        <div className="appointment-breakdown-grid" role="list" aria-label="Agendamentos por plataforma">
          {stats.map((stat) => (
            <div className={`appointment-breakdown-stat appointment-breakdown-stat--${stat.modifier}`} role="listitem" key={stat.key}>
              <span>{stat.label}</span>
              <strong>{formatCount(stat.value)}</strong>
            </div>
          ))}
        </div>

        <p className="appointment-breakdown-footnote">
          Meta reúne Facebook, Instagram e WhatsApp. O saldo de Playbooks e outras origens é o total menos Meta e Google. Demos sem data de realização válida não entram no KPI.
        </p>
      </section>
    </div>
  );
}

export default function KpiGrid({
  totals,
  baseTotals = totals,
  automaticTotals = totals,
  overrides = {},
  recalculatedMetricKeys = [],
  appointmentBreakdown,
  onSaveOverride,
  onRestoreOverride,
  persistenceNotice = "O ajuste é salvo neste navegador para este recorte e não altera os arquivos importados.",
}) {
  const [isAppointmentsOpen, setIsAppointmentsOpen] = useState(false);
  const [selectedKpiKey, setSelectedKpiKey] = useState(null);
  const closeAppointments = useCallback(() => setIsAppointmentsOpen(false), []);
  const openAppointments = useCallback(() => setIsAppointmentsOpen(true), []);
  const closeAdjustment = useCallback(() => setSelectedKpiKey(null), []);

  const kpis = [
    {
      key: "investimento",
      label: "Investimento Total",
      value: totals.investimento || 0,
      formatFn: (value) => brl.format(value || 0),
      meta: "Mídia paga total consolidada",
      accent: "#b99cff",
    },
    {
      key: "cliques",
      label: "Cliques Totais",
      value: totals.cliques || 0,
      formatFn: formatCount,
      meta: "Cliques em anúncios",
      accent: "#ffd481",
    },
    {
      key: "impressoes",
      label: "Impressões Totais",
      value: totals.impressoes || 0,
      formatFn: formatCount,
      meta: "Exibições de anúncios",
      accent: "#7bb7ff",
    },
    {
      key: "leads",
      label: "Leads",
      value: totals.leads || 0,
      formatFn: formatCount,
      meta: "Contatos e cadastros capturados",
      accent: "#7bb7ff",
    },
    {
      key: "qualificados",
      label: "Leads Qualificados",
      value: totals.qualificados || 0,
      formatFn: formatCount,
      meta: "Clientes únicos no primeiro agendamento",
      accent: "#b99cff",
    },
    {
      key: "conversoes",
      label: "Agendamentos",
      value: totals.conversoes || 0,
      formatFn: formatCount,
      meta: "Clientes únicos por mês com agendamento",
      accent: "#7cf7be",
      onDetails: openAppointments,
    },
    {
      key: "demos",
      label: "Demos Realizadas",
      value: totals.demos || 0,
      formatFn: formatCount,
      meta: "Uma demo por cliente e mês de realização",
      accent: "#ffd481",
    },
    {
      key: "ctr",
      label: "CTR Médio",
      value: totals.ctr || 0,
      formatFn: formatPercentage,
      meta: "Taxa de cliques (Cliques/Impressões)",
      accent: "#ffd481",
    },
    {
      key: "cpc",
      label: "CPC Médio",
      value: totals.cpc || 0,
      formatFn: (value) => brl2.format(value || 0),
      meta: "Custo por clique médio",
      accent: "#7cf7be",
    },
    {
      key: "cpm",
      label: "CPM Médio",
      value: totals.cpm || 0,
      formatFn: (value) => brl2.format(value || 0),
      meta: "Custo por mil impressões",
      accent: "#b99cff",
    },
    {
      key: "cpl",
      label: "CPL Médio",
      value: totals.cpl || 0,
      formatFn: (value) => brl2.format(value || 0),
      meta: "Custo por Lead capturado",
      accent: "#7bb7ff",
    },
    {
      key: "cpa",
      label: "CPA Médio",
      value: totals.cpa ?? totals.cac ?? 0,
      formatFn: (value) => brl2.format(value || 0),
      meta: "Custo por agendamento",
      accent: "#ffd481",
    },
    {
      key: "alcance",
      label: "Alcance",
      value: totals.alcance || 0,
      formatFn: formatCount,
      meta: "Pessoas únicas impactadas",
      accent: "#b99cff",
    },
  ];

  const selectedKpi = kpis.find((kpi) => kpi.key === selectedKpiKey) || null;
  const handleSave = useCallback(async (payload) => {
    if (!onSaveOverride) return { success: false, error: "A edição manual não está disponível agora." };
    return onSaveOverride(payload);
  }, [onSaveOverride]);
  const handleRestore = useCallback(async (metric) => {
    if (!onRestoreOverride) return { success: false, error: "A restauração automática não está disponível agora." };
    return onRestoreOverride(metric);
  }, [onRestoreOverride]);

  return (
    <>
      <section className="kpi-grid" id="kpiGrid" aria-label="Principais indicadores de mídia paga">
        {kpis.map((kpi, index) => {
          const adjustmentState = overrides[kpi.key]
            ? "manual"
            : recalculatedMetricKeys.includes(kpi.key)
              ? "recalculated"
              : null;
          return (
            <KpiCard
              key={kpi.key}
              {...kpi}
              index={index}
              adjustmentState={adjustmentState}
              onEdit={() => setSelectedKpiKey(kpi.key)}
            />
          );
        })}
      </section>

      {selectedKpi && (
        <KpiAdjustmentModal
          kpi={selectedKpi}
          baseValue={baseTotals[selectedKpi.key] ?? 0}
          automaticValue={automaticTotals[selectedKpi.key] ?? 0}
          effectiveValue={selectedKpi.value}
          override={overrides[selectedKpi.key]}
          onSave={handleSave}
          onRestore={handleRestore}
          onClose={closeAdjustment}
          persistenceNotice={persistenceNotice}
        />
      )}

      {isAppointmentsOpen && (
        <AppointmentBreakdownModal
          breakdown={appointmentBreakdown}
          onClose={closeAppointments}
        />
      )}
    </>
  );
}
