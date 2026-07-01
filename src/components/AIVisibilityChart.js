"use client";

import { useEffect, useState, useMemo } from "react";
import { useTheme } from "@/lib/ThemeContext";

const num = new Intl.NumberFormat("pt-BR");

// Ícones dos operadores de IA
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

// Tipos de atividade
const ACTIVITY_LABELS = {
  "AI Crawler": "Rastreador IA",
  "AI Search": "Busca IA",
  "AI Assistant": "Assistente IA",
};

export default function AIVisibilityChart({ startDate, endDate }) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Buscar dados da API do Clarity
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

  // Estado de loading
  if (loading) {
    return (
      <article style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: "1.5rem",
        minHeight: 320,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{ textAlign: "center", color: C.muted }}>
          <div style={{ fontSize: 32, marginBottom: 12, animation: "pulse 1.5s infinite" }}>🤖</div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>Carregando dados de IA...</div>
        </div>
      </article>
    );
  }

  // Erro
  if (error || !data) {
    return (
      <article style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: "1.5rem",
        minHeight: 320,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{ textAlign: "center", color: C.muted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>Erro ao carregar dados do Clarity</div>
          <div style={{ fontSize: "0.75rem", marginTop: 4 }}>{error}</div>
        </div>
      </article>
    );
  }

  const { botOperators, botActivities, totalBotSessions, totalSessions } = data;
  const botPercentage = totalSessions > 0 ? ((totalBotSessions / totalSessions) * 100).toFixed(1) : "0";

  return (
    <article style={{
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: "1.5rem 1.6rem",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Header */}
      <div className="panel-heading" style={{ marginBottom: "1.2rem" }}>
        <div>
          <p className="eyebrow">VISIBILIDADE DA IA</p>
          <h2 style={{ margin: 0 }}>Indicações & Citações de IA</h2>
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

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: "1.4rem" }}>
        <div style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderRadius: 12, padding: "14px 16px",
          borderTop: "2px solid #10a37f",
        }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            Sessões de Bots IA
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: C.text }}>
            {num.format(totalBotSessions)}
          </div>
          <div style={{ fontSize: "0.68rem", color: "#10a37f", fontWeight: 600, marginTop: 4 }}>
            {botPercentage}% do tráfego total
          </div>
        </div>

        <div style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderRadius: 12, padding: "14px 16px",
          borderTop: "2px solid #0668E1",
        }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            Operadores Detectados
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: C.text }}>
            {botOperators.length}
          </div>
          <div style={{ fontSize: "0.68rem", color: "#0668E1", fontWeight: 600, marginTop: 4 }}>
            Plataformas de IA distintas
          </div>
        </div>

        <div style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderRadius: 12, padding: "14px 16px",
          borderTop: "2px solid #f59e0b",
        }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            Sessões Totais
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: C.text }}>
            {num.format(totalSessions)}
          </div>
          <div style={{ fontSize: "0.68rem", color: "#f59e0b", fontWeight: 600, marginTop: 4 }}>
            Humanos + IA combinados
          </div>
        </div>
      </div>

      {/* Two columns: Bot Operators + Bot Activities */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        
        {/* Operadores de Bot */}
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
            🤖 Operadores de IA
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {botOperators.map((op, i) => {
              const color = BOT_COLORS[op.name] || BOT_COLORS.Unknown;
              const icon = BOT_ICONS[op.name] || BOT_ICONS.Unknown;
              return (
                <div key={op.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{icon}</span>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: C.textSoft, minWidth: 80 }}>
                    {op.name}
                  </span>
                  <div style={{ flex: 1, height: 6, background: C.barBg, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      width: `${op.percentage}%`,
                      height: "100%",
                      background: color,
                      borderRadius: 99,
                      boxShadow: `0 0 6px ${color}44`,
                      transition: "width 0.8s ease",
                    }} />
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: C.textSoft, minWidth: 42, textAlign: "right" }}>
                    {op.percentage.toFixed(1).replace(".", ",")}%
                  </span>
                  <span style={{ fontSize: "0.72rem", color: C.muted, minWidth: 30, textAlign: "right" }}>
                    {num.format(op.sessions)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Atividade de Bot */}
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
            ⚡ Tipo de Atividade
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {botActivities.map((act, i) => {
              const colors = ["#8b5cf6", "#3b82f6", "#10b981"];
              const color = colors[i % colors.length];
              const label = ACTIVITY_LABELS[act.name] || act.name;
              return (
                <div key={act.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: C.textSoft, minWidth: 110 }}>
                    {label}
                  </span>
                  <div style={{ flex: 1, height: 6, background: C.barBg, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      width: `${act.percentage}%`,
                      height: "100%",
                      background: color,
                      borderRadius: 99,
                      boxShadow: `0 0 6px ${color}44`,
                      transition: "width 0.8s ease",
                    }} />
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: C.textSoft, minWidth: 42, textAlign: "right" }}>
                    {act.percentage.toFixed(1).replace(".", ",")}%
                  </span>
                  <span style={{ fontSize: "0.72rem", color: C.muted, minWidth: 30, textAlign: "right" }}>
                    {num.format(act.sessions)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Insight */}
          <div style={{
            marginTop: 20,
            padding: "12px 14px",
            background: "rgba(16,163,127,0.06)",
            border: "1px solid rgba(16,163,127,0.20)",
            borderRadius: 10,
            fontSize: "0.78rem",
            color: C.textSoft,
            lineHeight: 1.5,
          }}>
            <strong style={{ color: "#10a37f" }}>💡 Insight:</strong> Seu site está sendo citado e rastreado por{" "}
            <strong>{botOperators.length} plataformas de IA</strong> distintas, com destaque para{" "}
            <strong style={{ color: BOT_COLORS[botOperators[0]?.name] || "#10a37f" }}>{botOperators[0]?.name}</strong>{" "}
            ({botOperators[0]?.percentage.toFixed(1).replace(".", ",")}% das visitas de IA).
          </div>
        </div>
      </div>
    </article>
  );
}
