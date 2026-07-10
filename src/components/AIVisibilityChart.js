"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useTheme } from "@/lib/ThemeContext";

const num = new Intl.NumberFormat("pt-BR");
const pct = (v) => v.toFixed(2).replace(".", ",") + "%";

const BOT_COLORS = {
  Meta: "#0668E1", Huawei: "#CF0A2C", OpenAI: "#10a37f",
  Google: "#4285F4", Apple: "#555555", Anthropic: "#d97706",
  Parallel: "#6b7280", Microsoft: "#0078D4", Unknown: "#9ca3af",
};

const BOT_ICONS = {
  Meta: "🟦", Huawei: "🔴", OpenAI: "🤖", Google: "🟢",
  Apple: "🍎", Anthropic: "🟠", Parallel: "⚪", Microsoft: "🔵", Unknown: "❓",
};

const BOT_DESCRIPTIONS = {
  Meta: "Rastreia páginas para indexação no Facebook e Instagram (AI features).",
  Huawei: "Bot de IA da Huawei para pesquisa e serviços móveis.",
  OpenAI: "Rastreia conteúdo para treinamento e busca do ChatGPT.",
  Google: "Bot de IA do Google para Gemini e AI Overviews.",
  Apple: "Rastreia conteúdo para Siri e Apple Intelligence.",
  Anthropic: "Bot do Claude AI para pesquisa e respostas.",
  Parallel: "Serviço paralelo de rastreamento de IA.",
  Microsoft: "Bot do Copilot/Bing AI para respostas e busca.",
};

const ACTIVITY_LABELS = { "AI Crawler": "Rastreador IA", "AI Search": "Busca IA", "AI Assistant": "Assistente IA" };
const ACTIVITY_DESC = {
  "AI Crawler": "Bots rastreando páginas para indexar conteúdo em modelos de IA.",
  "AI Search": "Buscas feitas por assistentes de IA citando seu conteúdo.",
  "AI Assistant": "Assistentes respondendo com base no seu site.",
};

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
  const [hoveredOp, setHoveredOp] = useState(null);
  const [selectedOp, setSelectedOp] = useState(null);
  const [hoveredAct, setHoveredAct] = useState(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchClarity() {
      setLoading(true);
      setError(null);
      setAnimate(false);
      try {
        const res = await fetch("/api/clarity-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startDate, endDate }),
        });
        if (!res.ok) throw new Error("Falha ao buscar dados");
        const json = await res.json();
        if (active) {
          setData(json);
          setSelectedOp(null);
          setTimeout(() => setAnimate(true), 50);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchClarity();
    return () => { active = false; };
  }, [startDate, endDate]);

  const C = useMemo(() => ({
    text: isLight ? "#0f172a" : "rgba(245,247,251,0.92)",
    textSoft: isLight ? "#334155" : "rgba(245,247,251,0.72)",
    muted: isLight ? "#64748b" : "rgba(245,247,251,0.45)",
    bg: isLight ? "rgba(255,255,255,0.92)" : "var(--panel)",
    border: isLight ? "rgba(15,23,42,0.10)" : "var(--line)",
    barBg: isLight ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.06)",
    cardBg: isLight ? "rgba(248,250,252,0.95)" : "rgba(255,255,255,0.03)",
    hoverBg: isLight ? "rgba(15,23,42,0.04)" : "rgba(255,255,255,0.04)",
    tooltipBg: isLight ? "#1e293b" : "#f8fafc",
    tooltipText: isLight ? "#f8fafc" : "#0f172a",
  }), [isLight]);

  if (loading) {
    return (
      <article style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: "1.5rem", minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: C.muted }}>
          <div style={{ fontSize: 32, marginBottom: 12, animation: "pulse 1.5s infinite" }}>🤖</div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>Carregando dados de IA...</div>
        </div>
      </article>
    );
  }

  if (error) {
    return (
      <article style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: "1.5rem", minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: C.muted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>Erro ao carregar dados</div>
          <div style={{ fontSize: "0.75rem", marginTop: 4 }}>{error}</div>
        </div>
      </article>
    );
  }

  if (!data || data.noData) {
    const availableLabel = (data?.availableMonths || []).map(formatMonth).join(", ");
    return (
      <article style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: "1.5rem", minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: C.muted, maxWidth: 360 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 8 }}>
            Dados de IA não disponíveis para {formatMonth(data?.targetMonth)}
          </div>
          {availableLabel && (
            <div style={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
              Meses disponíveis: <strong>{availableLabel}</strong>
            </div>
          )}
        </div>
      </article>
    );
  }

  const { botOperators, botActivities, totalRequests, shareOfTotalTraffic, uniquePagesRequested, violations, contentType, topPages, targetMonth } = data;

  return (
    <article style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: "1.5rem 1.6rem", overflow: "hidden", position: "relative" }}>
      {/* Header */}
      <div className="panel-heading" style={{ marginBottom: "1.2rem" }}>
        <div>
          <p className="eyebrow">VISIBILIDADE DA IA</p>
          <h2 style={{ margin: 0 }}>Indicações & Citações de IA</h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.7rem", color: C.muted, fontWeight: 500 }}>
            📅 {formatMonth(targetMonth)} • Fonte: Microsoft Clarity
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(16,163,127,0.1)", border: "1px solid rgba(16,163,127,0.25)", borderRadius: 99, padding: "4px 12px" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10a37f", boxShadow: "0 0 6px #10a37f" }} />
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#10a37f" }}>Clarity</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: "1.4rem" }}>
        <KpiCard label="Requisições de IA" value={num.format(totalRequests)} sub={`${botOperators.length} operadores`} color="#10a37f" C={C} tooltip="Total de requisições feitas por bots de inteligência artificial ao seu site neste período." />
        <KpiCard label="% do Tráfego Total" value={pct(shareOfTotalTraffic)} sub="vindo de bots IA" color="#0668E1" C={C} tooltip="Percentual do tráfego total do site que veio de bots de IA (rastreadores, buscas, assistentes)." />
        <KpiCard label="Páginas Únicas" value={pct(uniquePagesRequested)} sub="das páginas rastreadas" color="#8b5cf6" C={C} tooltip="Percentual de páginas HTML únicas do seu site que foram acessadas por bots de IA." />
        <KpiCard label="Violações" value={pct(violations)} sub="sem violações" color={violations > 0 ? "#ef4444" : "#10b981"} C={C} tooltip="Violações de robots.txt ou regras de acesso. 0% significa que todos os bots respeitaram as regras." />
      </div>

      {/* Duas colunas: Operadores + Atividade */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: "1.4rem" }}>
        {/* Operadores */}
        <div>
          <SectionTitle icon="🤖" label="Operador de Bot" C={C} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {botOperators.map((op) => {
              const color = BOT_COLORS[op.name] || BOT_COLORS.Unknown;
              const icon = BOT_ICONS[op.name] || BOT_ICONS.Unknown;
              const isHovered = hoveredOp === op.name;
              const isSelected = selectedOp === op.name;
              const dimmed = (hoveredOp || selectedOp) && !isHovered && !isSelected;
              return (
                <div
                  key={op.name}
                  onMouseEnter={() => setHoveredOp(op.name)}
                  onMouseLeave={() => setHoveredOp(null)}
                  onClick={() => setSelectedOp(selectedOp === op.name ? null : op.name)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "6px 8px", borderRadius: 8,
                    background: (isHovered || isSelected) ? C.hoverBg : "transparent",
                    opacity: dimmed ? 0.4 : 1,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    border: isSelected ? `1px solid ${color}33` : "1px solid transparent",
                  }}
                >
                  <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{icon}</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: C.textSoft, minWidth: 72 }}>{op.name}</span>
                  <div style={{ flex: 1, height: 7, background: C.barBg, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      width: animate ? `${op.percentage}%` : "0%",
                      height: "100%", background: color, borderRadius: 99,
                      boxShadow: isHovered ? `0 0 10px ${color}66` : `0 0 4px ${color}33`,
                      transition: "width 1s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s",
                    }} />
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: C.textSoft, minWidth: 48, textAlign: "right" }}>
                    {pct(op.percentage)}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: C.muted, minWidth: 32, textAlign: "right" }}>
                    {num.format(op.sessions)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Detalhe do operador selecionado */}
          {selectedOp && (
            <div style={{
              marginTop: 12, padding: "10px 14px",
              background: `${BOT_COLORS[selectedOp] || "#666"}11`,
              border: `1px solid ${BOT_COLORS[selectedOp] || "#666"}33`,
              borderRadius: 10, fontSize: "0.76rem", color: C.textSoft, lineHeight: 1.5,
              animation: "fadeIn 0.2s ease",
            }}>
              <strong style={{ color: BOT_COLORS[selectedOp] }}>{BOT_ICONS[selectedOp]} {selectedOp}</strong>
              <p style={{ margin: "4px 0 0" }}>{BOT_DESCRIPTIONS[selectedOp] || "Operador de bot de inteligência artificial."}</p>
            </div>
          )}
        </div>

        {/* Atividade */}
        <div>
          <SectionTitle icon="⚡" label="Atividade do Bot" C={C} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {botActivities.map((act, i) => {
              const colors = ["#8b5cf6", "#3b82f6", "#10b981"];
              const color = colors[i % colors.length];
              const label = ACTIVITY_LABELS[act.name] || act.name;
              const isHovered = hoveredAct === act.name;
              return (
                <div
                  key={act.name}
                  onMouseEnter={() => setHoveredAct(act.name)}
                  onMouseLeave={() => setHoveredAct(null)}
                  style={{
                    position: "relative",
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "6px 8px", borderRadius: 8,
                    background: isHovered ? C.hoverBg : "transparent",
                    cursor: "default", transition: "all 0.2s ease",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: C.textSoft, minWidth: 100 }}>{label}</span>
                  <div style={{ flex: 1, height: 7, background: C.barBg, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      width: animate ? `${act.percentage}%` : "0%",
                      height: "100%", background: color, borderRadius: 99,
                      boxShadow: isHovered ? `0 0 10px ${color}66` : `0 0 4px ${color}33`,
                      transition: "width 1s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s",
                    }} />
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: C.textSoft, minWidth: 48, textAlign: "right" }}>
                    {pct(act.percentage)}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: C.muted, minWidth: 32, textAlign: "right" }}>
                    {num.format(act.sessions)}
                  </span>
                  {/* Tooltip */}
                  {isHovered && (
                    <div style={{
                      position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                      background: C.tooltipBg, color: C.tooltipText,
                      padding: "8px 12px", borderRadius: 8, fontSize: "0.72rem",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 20,
                      whiteSpace: "nowrap", pointerEvents: "none",
                      animation: "fadeIn 0.15s ease",
                    }}>
                      {ACTIVITY_DESC[act.name] || act.name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tipo de conteúdo */}
          {contentType && contentType.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <SectionTitle icon="📄" label="Tipo de Conteúdo" C={C} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {contentType.map((ct, i) => {
                  const colors = ["#e91e8c", "#f59e0b", "#3b82f6", "#6b7280"];
                  return (
                    <div key={ct.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: C.textSoft, minWidth: 50 }}>{ct.name}</span>
                      <div style={{ flex: 1, height: 6, background: C.barBg, borderRadius: 99, overflow: "hidden" }}>
                        <div style={{
                          width: animate ? `${ct.percentage}%` : "0%",
                          height: "100%", background: colors[i % colors.length], borderRadius: 99,
                          transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
                        }} />
                      </div>
                      <span style={{ fontSize: "0.73rem", fontWeight: 700, color: C.textSoft, minWidth: 48, textAlign: "right" }}>
                        {pct(ct.percentage)}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: C.muted, minWidth: 26, textAlign: "right" }}>
                        {num.format(ct.count)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Insight */}
      <div style={{
        marginTop: 16, padding: "12px 14px",
        background: "rgba(16,163,127,0.06)", border: "1px solid rgba(16,163,127,0.20)",
        borderRadius: 10, fontSize: "0.78rem", color: C.textSoft, lineHeight: 1.5,
      }}>
        <strong style={{ color: "#10a37f" }}>💡 Insight:</strong> Em {formatMonth(targetMonth)}, seu site recebeu{" "}
        <strong>{num.format(totalRequests)} requisições de IA</strong> de{" "}
        <strong>{botOperators.length} plataformas</strong> distintas ({pct(shareOfTotalTraffic)} do tráfego total).{" "}
        Principal operador: <strong style={{ color: BOT_COLORS[botOperators[0]?.name] }}>{botOperators[0]?.name}</strong> ({pct(botOperators[0]?.percentage)}).{" "}
        A atividade dominante é <strong>{ACTIVITY_LABELS[botActivities[0]?.name]}</strong> com {pct(botActivities[0]?.percentage)} das interações.
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </article>
  );
}

// ======================== Sub-componentes ========================

function KpiCard({ label, value, sub, color, C, tooltip }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        background: C.cardBg, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "14px 16px",
        borderTop: `2px solid ${color}`,
        cursor: "default",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered ? `0 4px 16px ${color}22` : "none",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      <div style={{ fontSize: "0.66rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: "1.3rem", fontWeight: 900, color: C.text }}>{value}</div>
      <div style={{ fontSize: "0.66rem", color, fontWeight: 600, marginTop: 4 }}>{sub}</div>
      {/* Tooltip */}
      {hovered && tooltip && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          background: C.tooltipBg, color: C.tooltipText,
          padding: "8px 12px", borderRadius: 8, fontSize: "0.7rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)", zIndex: 30,
          width: 200, lineHeight: 1.4, pointerEvents: "none",
          animation: "fadeIn 0.15s ease",
        }}>
          {tooltip}
        </div>
      )}
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

