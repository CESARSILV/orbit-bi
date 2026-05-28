"use client";

import { isSupabaseConfigured } from "@/lib/supabase";
import { useTheme } from "@/lib/ThemeContext";
import {
  DashboardIcon,
  ComparisonIcon,
  CreativesIcon,
  ReportsIcon,
  AutomationsIcon,
  PresentationIcon,
  ThemeDarkIcon,
  ThemeLightIcon,
  UserIcon,
  LogoutIcon
} from "./Icons";

export default function Sidebar({
  activeSection,
  onSectionChange,
  user,
  onSignOut,
  isOpen,
  onToggle,
  isCollapsed,
  onCollapseToggle,
}) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  const navItems = [
    { label: "Visão geral",  section: "visao-geral",  icon: DashboardIcon },
    { label: "Comparações",  section: "comparacao",   icon: ComparisonIcon },
    { label: "Criativos",    section: "criativos",    icon: CreativesIcon },
    { label: "Relatórios",   section: "relatorios",   icon: ReportsIcon },
    { label: "Automações",   section: "automacoes",   icon: AutomationsIcon },
  ];

  const handleNavClick = (section) => {
    onSectionChange(section);
    const element = document.getElementById(section);
    if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
    if (onToggle && isOpen) onToggle();
  };

  return (
    <>
      {/* Overlay mobile */}
      <div className={`sidebar-overlay ${isOpen ? "active" : ""}`} onClick={onToggle} aria-hidden="true" />

      {/* Hamburger mobile */}
      <button
        className="sidebar-hamburger"
        onClick={onToggle}
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={isOpen}
      >
        {isOpen ? "✕" : "☰"}
      </button>

      <aside
        className={`sidebar${isOpen ? " open" : ""}${isCollapsed ? " sidebar--collapsed" : ""}`}
        aria-label="Navegação principal"
      >
        {/* ── Botão de recolher (desktop) ─────────────────────────── */}
        <button
          className="sidebar-collapse-btn"
          onClick={onCollapseToggle}
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
          aria-label={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.30s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* ── Brand ────────────────────────────────────────────────── */}
        <div className="brand">
          <div className="brand-mark">O</div>
          {!isCollapsed && (
            <div className="brand-text">
              <strong>Orbit BI</strong>
              <span>Inteligência de mídia paga</span>
            </div>
          )}
        </div>

        {/* ── Nav ──────────────────────────────────────────────────── */}
        <nav className="nav-list" style={{ marginBottom: "20px" }}>
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.section}
                className={`nav-item ${activeSection === item.section ? "active" : ""}`}
                onClick={() => handleNavClick(item.section)}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="nav-item-icon">
                  <IconComponent />
                </span>
                {!isCollapsed && <span className="nav-item-label">{item.label}</span>}
              </button>
            );
          })}

          {!isCollapsed ? (
            <a
              href="/apresentacao"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-item presentation-link"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: "8px", textDecoration: "none", marginTop: "16px",
                border: "1px dashed var(--line-strong)",
                background: "rgba(123,183,255,0.05)",
                color: "var(--blue)", fontWeight: "600",
              }}
            >
              <span className="nav-item-icon">
                <PresentationIcon />
              </span>
              <span>Apresentação e PDF</span>
            </a>
          ) : (
            <a
              href="/apresentacao"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-item presentation-link"
              title="Apresentação e PDF"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                textDecoration: "none", marginTop: "16px",
                border: "1px dashed var(--line-strong)",
                background: "rgba(123,183,255,0.05)",
                color: "var(--blue)",
              }}
            >
              <span className="nav-item-icon">
                <PresentationIcon />
              </span>
            </a>
          )}
        </nav>

        {/* ── Theme Toggle ─────────────────────────────────────────── */}
        {!isCollapsed ? (
          <div style={{
            marginTop: "auto",
            marginBottom: "14px",
            padding: "10px 12px",
            borderRadius: "12px",
            background: "var(--hover-bg)",
            border: "1px solid var(--border-soft)",
          }}>
            <p style={{
              fontSize: "0.62rem", fontWeight: 700, color: "var(--text-muted)",
              textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 0 8px 0",
            }}>Aparência</p>
            <div style={{
              display: "flex",
              background: "var(--border-soft)",
              borderRadius: "9px", padding: "3px", gap: "2px",
            }}>
              <button
                onClick={() => { if (isLight) toggleTheme(); }}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  gap: "5px", padding: "7px 6px", border: "none", borderRadius: "7px",
                  fontSize: "0.74rem", fontWeight: 700,
                  cursor: isLight ? "pointer" : "default",
                  background: !isLight ? "linear-gradient(135deg,rgba(123,183,255,0.18),rgba(91,156,246,0.12))" : "transparent",
                  color: !isLight ? "var(--blue)" : "var(--text-muted)",
                  boxShadow: !isLight ? "0 1px 6px rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,255,255,0.08)" : "none",
                  transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
                }} title="Modo Escuro">
                <ThemeDarkIcon style={{ marginRight: 4 }} />
                <span>Escuro</span>
              </button>
              <button
                onClick={() => { if (!isLight) toggleTheme(); }}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  gap: "5px", padding: "7px 6px", border: "none", borderRadius: "7px",
                  fontSize: "0.74rem", fontWeight: 700,
                  cursor: !isLight ? "pointer" : "default",
                  background: isLight ? "linear-gradient(135deg,rgba(245,158,11,0.15),rgba(251,191,36,0.10))" : "transparent",
                  color: isLight ? "#b45309" : "var(--text-muted)",
                  boxShadow: isLight ? "0 1px 6px rgba(0,0,0,0.10),inset 0 1px 0 rgba(255,255,255,0.7)" : "none",
                  transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
                }} title="Modo Claro">
                <ThemeLightIcon style={{ marginRight: 4 }} />
                <span>Claro</span>
              </button>
            </div>
          </div>
        ) : (
          /* Collapsed: só botão de tema como ícone */
          <button
            onClick={toggleTheme}
            title={isLight ? "Mudar para modo escuro" : "Mudar para modo claro"}
            style={{
              marginTop: "auto", marginBottom: "12px",
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "100%", padding: "9px", border: "1px solid var(--line)",
              borderRadius: "10px", background: "var(--hover-bg)",
              cursor: "pointer", fontSize: "16px",
              transition: "all 0.22s ease",
            }}
          >
            {isLight ? <ThemeDarkIcon width={16} height={16} /> : <ThemeLightIcon width={16} height={16} />}
          </button>
        )}

        {/* ── Auth ─────────────────────────────────────────────────── */}
        {isSupabaseConfigured && (user || onSignOut) && !isCollapsed && (
          <div style={{
            padding: "12px", borderRadius: "var(--radius)",
            background: "rgba(255,255,255,0.05)", border: "1px solid var(--line)",
            fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "8px",
            marginBottom: "12px",
          }}>
            <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", color: "var(--soft)", display: "flex", alignItems: "center", gap: "6px" }}>
              <UserIcon />
              <span>{user ? user.email : "Modo Visitante"}</span>
            </div>
            {user && (
              <button onClick={onSignOut} style={{
                background: "rgba(255,125,143,0.15)", color: "var(--red)",
                border: "1px solid rgba(255,125,143,0.3)", borderRadius: "var(--radius)",
                padding: "6px", width: "100%", fontSize: "0.76rem",
                fontWeight: "bold", textAlign: "center",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                cursor: "pointer",
              }}>
                <LogoutIcon />
                <span>Desconectar</span>
              </button>
            )}
          </div>
        )}

      </aside>
    </>
  );
}
