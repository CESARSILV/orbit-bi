"use client";

import { useEffect, useState, useMemo } from "react";
import { useTheme } from "@/lib/ThemeContext";

const num = new Intl.NumberFormat("pt-BR");
const pct = (v) => v.toFixed(2).replace(".", ",") + "%";

// Cores dos operadores
const BOT_COLORS = {
  Meta: "#0668E1",
  Huawei: "#CF0A2C",
  OpenAI: "#10a37f",
  Google: "#4285F4",
  Apple: "#555555",
  Anthropic: "#d97706",
  Parallel: "#6b7280",
  Microsoft: "#0078D4",
  Unknown: "#9ca3af",
};

// Ícones dos operadores
const BOT_ICONS = {
  Meta: "🟦",
  Huawei: "🔴",
  OpenAI: "🤖",
  Google: "🟢",
  Apple: "🍎",
  Anthropic: "🟠",
  Parallel: "⚪",
  Microsoft: "🔵",
  Unknown: "❓",
};

// Labels PT-BR para atividades
const ACTIVITY_LABELS = {
  "AI Crawler": "Rastreador IA",
  "AI Search": "Busca IA",
  "AI Assistant": "Assistente IA",
};

// Meses em PT-BR
const MONTH_NAMES = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
};

function formatMonth(ym) {
  if (!ym) return "";
  const [year, month] = ym.split("-");
  return `${MONTH_NAMES[month] || month}/${year}`;
}

export default function AIVisibilityChart({ startDate, endDate }) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Buscar dados do mês selecionado
  useEffect(() => {
    let active = true;

    async function fetchClarity() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/clarity-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startDate, endDate }),
        });

        if (!res.ok) throw new Error("Falha ao buscar dados do Clarity");

        const json = await res.json();
        if (active) setData(json);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchClarity();
    return () => { active = false; };
  }, [startDate, endDate]);

  // Cores do tema
  const C = useMemo(() => ({
    text: isLight ? "#0f172a" : "rgba(245,247,251,0.92)",
    textSoft: isLight ? "#334155" : "rgba(245,247,251,0.72)",
    muted: isLight ? "#64748b" : "rgba(245,247,251,0.45)",
    bg: isLight ? "rgba(255,255,255,0.92)" : "var(--panel)",
    border: isLight ? "rgba(15,23,42,0.10)" : "var(--line)",
    barBg: isLight ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.06)",
    cardBg: isLight ? "rgba(248,250,252,0.95)" : "rgba(255,255,255,0.03)",
  }), [isLight]);

  // Loading
  if (loading) {
    return (
      <article style={{
        background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: "1.5rem", minHeight: 320,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center", color: C.muted }}>
          <div style={{ fontSize: 32, marginBottom: 12, animation: "pulse 1.5s infinite" }}>🤖</div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>Carregando dados de IA...</div>
        </div>
      </article>
    );
  }

  // Erro
  if (error) {
    return (
      <article style={{
        background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: "1.5rem", minHeight: 320,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center", color: C.muted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>Erro ao carregar dados</div>
          <div style={{ fontSize: "0.75rem", marginTop: 4 }}>{error}</div>
        </div>
      </article>
    );
  }

  // Sem dados para o mês selecionado
  if (!data || data.noData) {
    const availableLabel = (data?.availableMonths || []).map(formatMonth).join(", ");
    return (
      <article style={{
        background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: "1.5rem", minHeight: 320,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center", color: C.muted, maxWidth: 360 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 8 }}>
            Dados de IA não disponíveis para {formatMonth(data?.targetMonth)}
          </div>
          {availableLabel && (
            <div style={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
              Meses com dados: <strong>{availableLabel}</strong>
            </div>
          )}
        </div>
      </article>
    );
  }

  const { botOperators, botActivities, totalRequests, shareOfTotalTraffic, uniquePagesRequested, violations, contentType, topPages, targetMonth } = data;

  return (
    <article style={{
      background: C.bg, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: "1.5rem 1.6rem", overflow: "hidden", position: "relative",
    }}>
      {/* Header */}
      <div className="panel-heading" style={{ marginBottom: "1.2rem" }}>
        <div>
          <p className="eyebrow">VISIBILIDADE DA IA</p>
          <h2 style={{ margin: 0 }}>Indicações & Citações de IA</h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.7rem", color: C.muted, fontWeight: 500 }}>
            📅 {formatMonth(targetMonth)}
          </p>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(16,163,127,0.1)",
          border: "1px solid rgba(16,163,127,0.25)",
          borderRadius: 99, padding: "4px 12px",
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10a37f", boxShadow: "0 0 6px #10a37f" }} />
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#10a37f" }}>Microsoft Clarity</span>
        </div>
      </div>

      {/* KPI Cards — 4 colunas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: "1.4rem" }}>
        <KpiCard label="Requisições de IA" value={num.format(totalRequests)} sub={`${botOperators.length} operadores`} color="#10a37f" C={C} />
        <KpiCard label="% do Tráfego Total" value={pct(shareOfTotalTraffic)} sub="tráfego de bots IA" color="#0668E1" C={C} />
        <KpiCard label="Páginas Únicas" value={pct(uniquePagesRequested)} sub="das páginas rastreadas" color="#8b5cf6" C={C} />
        <KpiCard label="Violações" value={pct(violations)} sub="sem violações" color={violations > 0 ? "#ef4444" : "#10b981"} C={C} />
      </div>

      {/* Duas colunas: Operadores + Atividade */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: "1.4rem" }}>
        {/* Operadores */}
        <div>
          <SectionTitle icon="🤖" label="Operador de Bot" C={C} />
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {botOperators.map((op) => {
              const color = BOT_COLORS[op.name] || BOT_COLORS.Unknown;
              const icon = BOT_ICONS[op.name] || BOT_ICONS.Unknown;
              return (
                <BarRow key={op.name} icon={icon} label={op.name} percentage={op.percentage} value={num.format(op.sessions)} color={color} C={C} />
              );
            })}
          </div>
        </div>

        {/* Atividade */}
        <div>
          <SectionTitle icon="⚡" label="Atividade do Bot" C={C} />
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {botActivities.map((act, i) => {
              const colors = ["#8b5cf6", "#3b82f6", "#10b981"];
              const label = ACTIVITY_LABELS[act.name] || act.name;
              return (
                <BarRow key={act.name} label={label} percentage={act.percentage} value={num.format(act.sessions)} color={colors[i % colors.length]} C={C} />
              );
            })}
          </div>

          {/* Tipo de conteúdo */}
          {contentType && contentType.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <SectionTitle icon="📄" label="Tipo de Conteúdo" C={C} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {contentType.map((ct, i) => {
                  const colors = ["#e91e8c", "#f59e0b", "#6b7280"];
                  return (
                    <BarRow key={ct.name} label={ct.name} percentage={ct.percentage} value={num.format(ct.count)} color={colors[i % colors.length]} C={C} />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Solicitações de Caminho (top pages) */}
      {topPages && topPages.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <SectionTitle icon="🔗" label="Solicitações de Caminho" C={C} />
          <div style={{
            display: "grid", gridTemplateColumns: "1fr auto auto",
            gap: "6px 16px", fontSize: "0.75rem", color: C.textSoft,
          }}>
            <span style={{ fontWeight: 700, color: C.muted, fontSize: "0.68rem", textTransform: "uppercase" }}>Caminho</span>
            <span style={{ fontWeight: 700, color: C.muted, fontSize: "0.68rem", textTransform: "uppercase", textAlign: "right" }}>%</span>
            <span style={{ fontWeight: 700, color: C.muted, fontSize: "0.68rem", textTransform: "uppercase", textAlign: "right" }}>Requests</span>
            {topPages.map((p) => (
              <>
                <span key={p.url} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.url}>
                  {p.url.replace("https://www.doit.com.br", "")}
                </span>
                <span style={{ textAlign: "right", fontWeight: 600 }}>{pct(p.percentage)}</span>
                <span style={{ textAlign: "right" }}>{p.requests}</span>
              </>
            ))}
          </div>
        </div>
      )}

      {/* Insight */}
      <div style={{
        marginTop: 16, padding: "12px 14px",
        background: "rgba(16,163,127,0.06)",
        border: "1px solid rgba(16,163,127,0.20)",
        borderRadius: 10, fontSize: "0.78rem",
        color: C.textSoft, lineHeight: 1.5,
      }}>
        <strong style={{ color: "#10a37f" }}>💡 Insight:</strong> Em {formatMonth(targetMonth)}, seu site recebeu{" "}
        <strong>{num.format(totalRequests)} requisições de IA</strong> de{" "}
        <strong>{botOperators.length} plataformas</strong> distintas, representando{" "}
        <strong>{pct(shareOfTotalTraffic)}</strong> do tráfego total.{" "}
        O principal operador é <strong style={{ color: BOT_COLORS[botOperators[0]?.name] || "#10a37f" }}>
          {botOperators[0]?.name}
        </strong> ({pct(botOperators[0]?.percentage)}).
      </div>
    </article>
  );
}

// ======================== Sub-componentes ========================

function KpiCard({ label, value, sub, color, C }) {
  return (
    <div style={{
      background: C.cardBg, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: "14px 16px",
      borderTop: `2px solid ${color}`,
    }}>
      <div style={{ fontSize: "0.66rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: "1.3rem", fontWeight: 900, color: C.text }}>
        {value}
      </div>
      <div style={{ fontSize: "0.66rem", color, fontWeight: 600, marginTop: 4 }}>
        {sub}
      </div>
    </div>
  );
}

function SectionTitle({ icon, label, C }) {
  return (
    <div style={{
      fontSize: "0.72rem", fontWeight: 700, color: C.muted,
      textTransform: "uppercase", letterSpacing: "0.07em",
      marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}`,
    }}>
      {icon} {label}
    </div>
  );
}

function BarRow({ icon, label, percentage, value, color, C }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {icon && <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{icon}</span>}
      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: C.textSoft, minWidth: 80 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 6, background: C.barBg, borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          width: `${percentage}%`, height: "100%",
          background: color, borderRadius: 99,
          boxShadow: `0 0 6px ${color}44`,
          transition: "width 0.8s ease",
        }} />
      </div>
      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: C.textSoft, minWidth: 48, textAlign: "right" }}>
        {pct(percentage)}
      </span>
      <span style={{ fontSize: "0.72rem", color: C.muted, minWidth: 30, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}
