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
  cpa: "Este valor manual passa a valer no total do recorte; as linhas continuam com o CPA recalculado a partir de investimento e demos realizadas do marketing.",
};

function valueForInput(kpi, value) {
  const displayValue = kpi.key === "ctr" ? (Number(value) || 0) * 100 : Number(value) || 0;
  if (KPI_OVERRIDE_DEFINITIONS[kpi.key]?.input === "count") {
    return String(Math.round(displayValue));
  }

  return String(Number(displayValue.toFixed(6))).replace(".", ",");
}

function KpiCard({ label, value, formatFn, meta, accent, index, adjustmentState, onEdit, customValue }) {
  const formattedValue = formatFn ? formatFn(value) : value;
  const statusLabel = adjustmentState === "manual"
    ? "Ajustado manualmente"
    : adjustmentState === "blocked"
      ? "Ajuste bloqueado"
      : adjustmentState === "pending"
        ? "Ajuste pendente"
        : adjustmentState === "recalculated"
          ? "Recalculado"
          : null;
  const badgeLabel = adjustmentState === "manual"
    ? "Conferido"
    : adjustmentState === "blocked"
      ? "Bloqueado"
      : adjustmentState === "pending"
        ? "Pendente"
        : "Recalculado";

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
            {badgeLabel}
          </span>
        )}
      </div>
      {customValue ? (
        <div className="kpi-value kpi-value--custom">{customValue}</div>
      ) : (
        <div className="kpi-value">{formattedValue}</div>
      )}
      <div className="kpi-meta">
        <span>{meta}</span>
      </div>
      <div className="kpi-card-actions">
        {onEdit && (
          <button
            type="button"
            className="kpi-card-edit-button"
            onClick={onEdit}
            aria-label={`Ajustar ${label}`}
          >
            <span aria-hidden="true">✎</span> Ajustar
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
  const [valueInput, setValueInput] = useState(() => valueForInput(
    kpi,
    override ? override.value : effectiveValue
  ));
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
              O valor conferido é consolidado neste recorte e passa a compor os meses, totais, gráficos, tabelas e relatórios aplicáveis. Os fatos importados continuam preservados.
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
          {override && (
            <div>
              <span>Valor registrado</span>
              <strong>{kpi.formatFn(override.value)}</strong>
            </div>
          )}
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

        {override?.applicationStatus === "blocked" && (
          <p className="kpi-adjustment-error" role="status">
            Este valor está registrado, mas foi bloqueado por sobreposição ou incompatibilidade com um ajuste mais específico. O valor efetivo continua vindo das linhas consolidadas.
          </p>
        )}
        {override?.applicationStatus === "pending" && (
          <p className="kpi-adjustment-impact" role="status">
            Este valor está registrado, mas não há linhas elegíveis para aplicá-lo neste recorte.
          </p>
        )}

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
  const [selectedKpiKey, setSelectedKpiKey] = useState(null);
  const closeAdjustment = useCallback(() => setSelectedKpiKey(null), []);

  const leads = Array.isArray(appointmentBreakdown?.leadsList) ? appointmentBreakdown.leadsList : [];
  const googleRealizadasDemos = leads.filter((l) => l.canal === "google" && l.isRealizada).length;
  const metaRealizadasDemos = leads.filter((l) => l.canal === "meta" && l.isRealizada).length;

  const googleDemosCount = appointmentBreakdown?.demosGoogle !== undefined
    ? appointmentBreakdown.demosGoogle
    : (totals.demosGoogle !== undefined ? totals.demosGoogle : googleRealizadasDemos);

  const metaDemosCount = appointmentBreakdown?.demosMeta !== undefined
    ? appointmentBreakdown.demosMeta
    : (totals.demosMeta !== undefined ? totals.demosMeta : metaRealizadasDemos);

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
      key: "leads",
      label: "Leads",
      value: totals.leads || 0,
      formatFn: formatCount,
      meta: "Formulários captados via Meta Ads e Google Ads",
      accent: "#7bb7ff",
    },
    {
      key: "qualificados",
      label: "Leads Qualificados",
      value: totals.qualificados || 0,
      formatFn: formatCount,
      meta: "Clientes únicos em etapa qualificada no CRM (Bitrix24)",
      accent: "#b99cff",
    },
    {
      key: "conversoes",
      label: "Agendamentos",
      value: totals.conversoes || 0,
      formatFn: formatCount,
      meta: "Agendamentos confirmados no DOitSA (por cliente/mês)",
      accent: "#7cf7be",
    },
    {
      key: "demos",
      label: "Demos Realizadas",
      value: totals.demos || 0,
      formatFn: formatCount,
      meta: "Reuniões efetivamente realizadas — fonte: DOitSA",
      accent: "#ffd481",
    },
    {
      key: "demos_canais",
      label: "Demos Google | Demos Meta",
      value: { google: googleDemosCount, meta: metaDemosCount },
      formatFn: () => `${googleDemosCount} Google | ${metaDemosCount} Meta`,
      meta: "Reuniões efetivamente realizadas por canal",
      accent: "#7cf7be",
      onEdit: null,
      customValue: (
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap", margin: "2px 0 4px" }}>
          <div style={{ display: "inline-flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#60a5fa", letterSpacing: "0.04em", textTransform: "uppercase" }}>Google</span>
            <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{googleDemosCount}</span>
          </div>
          <span style={{ color: "var(--border-soft)", fontWeight: 300, fontSize: "1.2rem", userSelect: "none" }}>|</span>
          <div style={{ display: "inline-flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#34d399", letterSpacing: "0.04em", textTransform: "uppercase" }}>Meta</span>
            <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{metaDemosCount}</span>
          </div>
        </div>
      ),
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
      label: "CPA Médio (Demo)",
      value: totals.cpa ?? totals.cac ?? 0,
      formatFn: (value) => brl2.format(value || 0),
      meta: "Custo por demo de marketing (Google + Meta)",
      accent: "#ffd481",
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
          const override = overrides[kpi.key];
          const adjustmentState = override?.applicationStatus === "blocked"
            ? "blocked"
            : override?.applicationStatus === "pending"
              ? "pending"
              : override
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
              onEdit={kpi.onEdit !== undefined ? kpi.onEdit : () => setSelectedKpiKey(kpi.key)}
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
    </>
  );
}
