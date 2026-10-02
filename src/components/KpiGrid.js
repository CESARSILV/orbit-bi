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

function KpiCard({ label, value, formatFn, meta, accent, index, adjustmentState, onEdit, onDetails }) {
  const formattedValue = formatFn(value);
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

  const [isMaximized, setIsMaximized] = useState(false);
  const [filterChannel, setFilterChannel] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [size, setSize] = useState({ width: 980, height: 680 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dialogRef = useRef(null);

  // Drag para mover a janela pelo cabeçalho
  const handleDragStart = (e) => {
    if (e.target.closest("button") || e.target.closest("input")) return;
    setIsDragging(true);
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    const handleMouseMove = (moveEvent) => {
      setPosition({
        x: moveEvent.clientX - startX,
        y: moveEvent.clientY - startY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };

    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Drag para redimensionar pelo puxador do canto
  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = dialogRef.current ? dialogRef.current.offsetWidth : size.width;
    const startHeight = dialogRef.current ? dialogRef.current.offsetHeight : size.height;

    const handleMouseMove = (moveEvent) => {
      const newWidth = Math.max(500, Math.min(window.innerWidth * 0.96, startWidth + (moveEvent.clientX - startX)));
      const newHeight = Math.max(460, Math.min(window.innerHeight * 0.94, startHeight + (moveEvent.clientY - startY)));
      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };

    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const data = {
    total: 0,
    meta: 0,
    google: 0,
    playbooksOutras: 0,
    demosRealizadas: 0,
    leadsList: [],
    isTotalAdjusted: false,
    isDemosAdjusted: false,
    hasUnallocatedAdjustment: false,
    effectiveConversoes: 0,
    ...breakdown,
  };

  const leads = Array.isArray(data.leadsList) ? data.leadsList : [];
  const googleCount = leads.filter((l) => l.canal === "google").length;
  const metaCount = leads.filter((l) => l.canal === "meta").length;
  const playbooksCount = leads.filter((l) => l.canal === "playbooks").length;
  const realizadasCount = leads.filter((l) => l.isRealizada).length;

  const filteredLeads = leads.filter((l) => {
    if (filterChannel === "google" && l.canal !== "google") return false;
    if (filterChannel === "meta" && l.canal !== "meta") return false;
    if (filterChannel === "playbooks" && l.canal !== "playbooks") return false;
    if (filterChannel === "realizadas" && !l.isRealizada) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matchName = String(l.nome || "").toLowerCase().includes(term);
      const matchPhone = String(l.telefone || "").includes(term);
      const matchSource = String(l.leadSource || "").toLowerCase().includes(term);
      if (!matchName && !matchPhone && !matchSource) return false;
    }
    return true;
  });

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
        ref={dialogRef}
        id="appointment-breakdown-dialog"
        className={`appointment-breakdown-dialog ${isMaximized ? "is-maximized" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-breakdown-title"
        aria-describedby="appointment-breakdown-description"
        style={isMaximized ? undefined : {
          width: `${size.width}px`,
          height: `${size.height}px`,
          transform: `translate(${position.x}px, ${position.y}px)`,
          maxWidth: "96vw",
          maxHeight: "94vh",
        }}
      >
        <header
          className="appointment-breakdown-header"
          onMouseDown={isMaximized ? undefined : handleDragStart}
          onDoubleClick={() => setIsMaximized(!isMaximized)}
          style={{ cursor: isMaximized ? "default" : isDragging ? "grabbing" : "grab", userSelect: "none" }}
        >
          <div>
            <p className="appointment-breakdown-eyebrow">Agendamentos</p>
            <h2 id="appointment-breakdown-title">Dados por plataforma</h2>
            <p id="appointment-breakdown-description">
              Cada cliente com ID ou telefone válido é contado uma vez por mês de agendamento. Demos entram uma vez por cliente no mês da realização válida.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              className="appointment-breakdown-control-btn"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restaurar tamanho" : "Maximizar tela cheia"}
              aria-label={isMaximized ? "Restaurar tamanho" : "Maximizar tela cheia"}
            >
              <span aria-hidden="true" style={{ fontSize: "1rem" }}>{isMaximized ? "⤡" : "⤢"}</span>
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              className="appointment-breakdown-close"
              onClick={onClose}
              aria-label="Fechar detalhamento de agendamentos"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
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

        {/* ─── Lista Nominal de Clientes & Reuniões ─────────────────────────── */}
        <div style={{ marginTop: "24px", borderTop: "1px solid var(--border-soft)", paddingTop: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Lista Nominal de Reuniões &amp; Clientes
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Rastreabilidade de cada lead com canal de origem e status de realização
              </p>
            </div>
            
            <input
              type="text"
              placeholder="Buscar cliente ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-soft)",
                background: "var(--surface-subtle)",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
                outline: "none",
                minWidth: "200px",
              }}
            />
          </div>

          {/* Abas de filtro por canal */}
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "8px", marginBottom: "12px" }}>
            {[
              { id: "todos", label: "Todos", count: leads.length },
              { id: "google", label: "Google Ads", count: googleCount, color: "var(--warning)" },
              { id: "meta", label: "Meta Ads", count: metaCount, color: "var(--info)" },
              { id: "playbooks", label: "Playbooks", count: playbooksCount, color: "var(--accent-violet, #a855f7)" },
              { id: "realizadas", label: "🎬 Realizadas", count: realizadasCount, color: "var(--success)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterChannel(tab.id)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "99px",
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: filterChannel === tab.id ? "1px solid var(--border-info, #3b82f6)" : "1px solid var(--border-soft)",
                  background: filterChannel === tab.id ? "var(--surface-info, rgba(59,130,246,0.15))" : "var(--surface-subtle)",
                  color: filterChannel === tab.id ? (tab.color || "var(--text-primary)") : "var(--text-secondary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  padding: "1px 6px",
                  borderRadius: "99px",
                  fontSize: "0.7rem",
                  background: filterChannel === tab.id ? "rgba(255,255,255,0.18)" : "var(--border-soft)",
                  fontWeight: 700,
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Tabela de Leads */}
          {filteredLeads.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem", background: "var(--surface-subtle)", borderRadius: "var(--radius)" }}>
              {leads.length === 0
                ? "Nenhum registro nominal disponível para este filtro. Importe o arquivo do DOitSA ou Bitrix24 para visualizar a lista."
                : "Nenhum cliente encontrado com os filtros selecionados."}
            </div>
          ) : (
            <div style={{ maxHeight: isMaximized ? "calc(88vh - 340px)" : `${Math.max(220, size.height - 350)}px`, overflowY: "auto", border: "1px solid var(--border-soft)", borderRadius: "var(--radius)", background: "var(--surface-subtle)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-soft)", background: "var(--surface-subtle)", position: "sticky", top: 0, zIndex: 2 }}>
                    <th style={{ padding: "9px 12px", fontWeight: 700, color: "var(--text-secondary)" }}>Cliente / Empresa</th>
                    <th style={{ padding: "9px 10px", fontWeight: 700, color: "var(--text-secondary)" }}>Origem</th>
                    <th style={{ padding: "9px 10px", fontWeight: 700, color: "var(--text-secondary)" }}>Status</th>
                    <th style={{ padding: "9px 12px", fontWeight: 700, color: "var(--text-secondary)", textAlign: "right" }}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((item, idx) => {
                    const badgeBg = item.canal === "google"
                      ? "rgba(251, 188, 5, 0.15)"
                      : item.canal === "meta"
                        ? "rgba(8, 102, 255, 0.15)"
                        : item.canal === "playbooks"
                          ? "rgba(168, 85, 247, 0.15)"
                          : "rgba(100, 116, 139, 0.15)";
                    const badgeColor = item.canal === "google"
                      ? "var(--warning, #eab308)"
                      : item.canal === "meta"
                        ? "var(--info, #3b82f6)"
                        : item.canal === "playbooks"
                          ? "var(--accent-violet, #a855f7)"
                          : "var(--text-muted)";

                    return (
                      <tr
                        key={item.id || idx}
                        style={{
                          borderBottom: "1px solid var(--border-soft)",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--hover-bg, rgba(255,255,255,0.04))"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "8px 12px" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.nome}</div>
                          {item.telefone && item.telefone !== "—" && (
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{item.telefone}</div>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "99px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            background: badgeBg,
                            color: badgeColor,
                            border: `1px solid ${badgeColor}33`,
                          }}>
                            {item.origemLabel}
                          </span>
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "0.74rem",
                            fontWeight: 600,
                            color: item.isRealizada ? "var(--success)" : "var(--info)",
                          }}>
                            {item.isRealizada ? "🎬 Realizada" : "📅 Agendada"}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-secondary)", fontSize: "0.76rem", whiteSpace: "nowrap" }}>
                          {item.data}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="appointment-breakdown-footnote">
          Meta reúne Facebook, Instagram e WhatsApp. O saldo de Playbooks e outras origens é o total menos Meta e Google. Demos sem data de realização válida não entram no KPI.
        </p>

        {!isMaximized && (
          <div
            className="appointment-breakdown-corner-grip"
            onMouseDown={handleResizeStart}
            title="Arraste para redimensionar a janela"
            aria-label="Arraste para redimensionar a janela"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
              <line x1="12" y1="6" x2="6" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
              <line x1="12" y1="10" x2="10" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
            </svg>
          </div>
        )}
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
      onDetails: openAppointments,
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
      key: "ctr",
      label: "CTR Médio",
      value: totals.ctr || 0,
      formatFn: formatPercentage,
      meta: "Taxa de cliques (Cliques/Impressões)",
      accent: "#ffd481",
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
