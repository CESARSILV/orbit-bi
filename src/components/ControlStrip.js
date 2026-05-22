"use client";

export default function ControlStrip({
  platform,
  onPlatformChange,
  period,
  onPeriodChange,
  goal,
  onGoalChange,
  onExport,
}) {
  return (
    <section className="control-strip" aria-label="Filtros do painel">
      <label>
        Plataforma
        <select
          id="platformFilter"
          value={platform}
          onChange={(e) => onPlatformChange(e.target.value)}
        >
          <option value="todas">Todas</option>
          <option value="google">Google Ads</option>
          <option value="meta">Meta Ads</option>
        </select>
      </label>
      <label>
        Período
        <select
          id="periodFilter"
          value={period}
          onChange={(e) => onPeriodChange(Number(e.target.value))}
        >
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
          <option value={180}>Últimos 6 meses</option>
        </select>
      </label>
      <label>
        Objetivo
        <select
          id="goalFilter"
          value={goal}
          onChange={(e) => onGoalChange(e.target.value)}
        >
          <option value="receita">Receita</option>
          <option value="leads">Leads</option>
          <option value="vendas">Vendas</option>
        </select>
      </label>
      <button
        className="icon-btn"
        id="btnExport"
        title="Exportar planilha profissional"
        onClick={onExport}
      >
        ⇩
      </button>
    </section>
  );
}
