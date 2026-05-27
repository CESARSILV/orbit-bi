"use client";

import { isSupabaseConfigured } from "@/lib/supabase";
import { useTheme } from "@/lib/ThemeContext";

export default function Sidebar({ activeSection, onSectionChange, user, onSignOut, isOpen, onToggle }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  const navItems = [
    { label: "Visão geral",  section: "visao-geral" },
    { label: "Comparações",  section: "comparacao" },
    { label: "Criativos",    section: "criativos" },
    { label: "Relatórios",   section: "relatorios" },
    { label: "Automações",   section: "automacoes" },
  ];

  const handleNavClick = (section) => {
    onSectionChange(section);
    const element = document.getElementById(section);
    if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
    if (onToggle && isOpen) onToggle();
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? "active" : ""}`} onClick={onToggle} aria-hidden="true" />

      <button className="sidebar-hamburger" onClick={onToggle} aria-label={isOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={isOpen}>
        {isOpen ? "✕" : "☰"}
      </button>

      <aside className={`sidebar${isOpen ? " open" : ""}`} aria-label="Navegação principal">

        <div className="brand">
          <div className="brand-mark">O</div>
          <div>
            <strong>Orbit BI</strong>
            <span>Inteligência de mídia paga</span>
          </div>
        </div>

        <nav className="nav-list" style={{ marginBottom: "20px" }}>
          {navItems.map((item) => (
            <button
              key={item.section}
              className={`nav-item ${activeSection === item.section ? "active" : ""}`}
              onClick={() => handleNavClick(item.section)}
            >
              {item.label}
            </button>
          ))}
          <a
            href="/apresentacao"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-item"
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              textDecoration: "none", marginTop: "16px",
              border: "1px dashed var(--line-strong)",
              background: "rgba(123,183,255,0.05)",
              color: "var(--blue)", justifyContent: "center", fontWeight: "600",
            }}
          >
            Apresentação e PDF
          </a>
        </nav>

        {/* ── THEME TOGGLE ─────────────────────────────────────── */}
        <div style={{
          marginTop: "auto",
          marginBottom: "14px",
          padding: "10px 12px",
          borderRadius: "12px",
          background: isLight ? "rgba(15,23,42,0.04)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${isLight ? "rgba(15,23,42,0.10)" : "rgba(255,255,255,0.08)"}`,
        }}>
          <p style={{
            fontSize: "0.62rem", fontWeight: 700, color: "var(--muted)",
            textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 0 8px 0",
          }}>Aparência</p>

          <div style={{
            display: "flex",
            background: isLight ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.06)",
            borderRadius: "9px", padding: "3px", gap: "2px",
          }}>
            <button
              onClick={() => { if (isLight) toggleTheme(); }}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                gap: "5px", padding: "7px 6px", border: "none", borderRadius: "7px",
                fontSize: "0.74rem", fontWeight: 700,
                cursor: isLight ? "pointer" : "default",
                background: !isLight
                  ? "linear-gradient(135deg,rgba(123,183,255,0.18),rgba(91,156,246,0.12))"
                  : "transparent",
                color: !isLight ? "var(--blue)" : "var(--muted)",
                boxShadow: !isLight ? "0 1px 6px rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,255,255,0.08)" : "none",
                transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
              }}
              title="Modo Escuro"
            >
              <span style={{ fontSize: "12px" }}>🌙</span>
              <span>Escuro</span>
            </button>

            <button
              onClick={() => { if (!isLight) toggleTheme(); }}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                gap: "5px", padding: "7px 6px", border: "none", borderRadius: "7px",
                fontSize: "0.74rem", fontWeight: 700,
                cursor: !isLight ? "pointer" : "default",
                background: isLight
                  ? "linear-gradient(135deg,rgba(245,158,11,0.15),rgba(251,191,36,0.10))"
                  : "transparent",
                color: isLight ? "#b45309" : "var(--muted)",
                boxShadow: isLight ? "0 1px 6px rgba(0,0,0,0.10),inset 0 1px 0 rgba(255,255,255,0.7)" : "none",
                transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
              }}
              title="Modo Claro"
            >
              <span style={{ fontSize: "12px" }}>☀️</span>
              <span>Claro</span>
            </button>
          </div>
        </div>

        {/* Auth */}
        {isSupabaseConfigured && (user || onSignOut) && (
          <div className="user-profile-badge" style={{
            padding: "12px", borderRadius: "var(--radius)",
            background: "rgba(255,255,255,0.05)", border: "1px solid var(--line)",
            fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "8px",
            marginBottom: "12px",
          }}>
            <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", color: "var(--soft)" }}>
              👤 {user ? user.email : "Modo Visitante"}
            </div>
            {user && (
              <button onClick={onSignOut} style={{
                background: "rgba(255,125,143,0.15)", color: "var(--red)",
                border: "1px solid rgba(255,125,143,0.3)", borderRadius: "var(--radius)",
                padding: "6px", width: "100%", fontSize: "0.76rem",
                fontWeight: "bold", textAlign: "center",
              }}>Desconectar</button>
            )}
          </div>
        )}

        <div className="sidebar-card">
          <span className="status-dot" />
          <p>IA multimodal pronta para analisar imagens e PDFs no chat, além de estruturar CSV, XLS e XLSX de Google Ads e Meta Ads.</p>
        </div>

      </aside>
    </>
  );
}
