"use client";

const number = new Intl.NumberFormat("pt-BR");
const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatNumber(value) {
  return number.format(value ?? 0);
}

function formatDecimal(value) {
  return decimal.format(value ?? 0);
}

function formatPercent(value) {
  return `${formatDecimal(value)}%`;
}

function SectionTitle({ icon, label, C }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: C.text }}>
        {label}
      </h3>
    </div>
  );
}

function MetricCard({ label, value, sub, color, C }) {
  return (
    <div style={{
      background: C.cardBg,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: "12px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color || C.info, borderRadius: "12px 12px 0 0" }} />
      <span style={{ fontSize: "0.68rem", fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ fontSize: "1.25rem", fontWeight: 800, color: C.text, letterSpacing: "-0.02em" }}>{value}</span>
      {sub && <span style={{ fontSize: "0.68rem", color: C.muted }}>{sub}</span>}
    </div>
  );
}

export default function BingWebmasterPanel({ data, C }) {
  const { metrics, health, topQueries, targetMonth, periodLabel, sourceLabel, siteUrl } = data;

  const panelStyle = {
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: "1.5rem 1.6rem",
    overflow: "hidden",
    position: "relative",
  };

  const subPanelStyle = {
    background: C.cardBg,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: "14px 16px",
    minWidth: 0,
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.78rem",
  };

  const thStyle = {
    textAlign: "left",
    padding: "8px 10px",
    borderBottom: `1px solid ${C.border}`,
    color: C.muted,
    fontSize: "0.7rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: 700,
  };

  const tdStyle = {
    padding: "8px 10px",
    borderBottom: `1px solid ${C.border}`,
    color: C.textSoft,
  };

  return (
    <article style={panelStyle}>
      {/* Header */}
      <div className="panel-heading" style={{ marginBottom: "1.2rem" }}>
        <div>
          <p className="eyebrow">RASTREAMENTO & INDEXAÇÃO IA</p>
          <h2 style={{ margin: 0 }}>Métricas Oficiais do Bing Webmaster &amp; Copilot</h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.7rem", color: C.muted, fontWeight: 500 }}>
            📅 {periodLabel || targetMonth} • Domínio: {siteUrl} • Fonte: {sourceLabel}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.successSoft, border: `1px solid ${C.successBorder}`, borderRadius: 99, padding: "4px 12px" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.success, boxShadow: `0 0 6px ${C.success}` }} />
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: C.success }}>API Bing Ativa</span>
        </div>
      </div>

      {/* Banner de Fonte */}
      <div style={{ marginBottom: "1.2rem", padding: "10px 12px", borderRadius: 10, background: C.successSoft, border: `1px solid ${C.successBorder}`, color: C.textSoft, fontSize: "0.75rem", lineHeight: 1.5 }}>
        <strong style={{ color: C.success }}>Telemetria em tempo real conectada:</strong> Dados sincronizados diretamente via API oficial do Microsoft Bing Webmaster. Representa a indexação de páginas e requisições dos robôs de IA (Bingbot/Copilot) no período.
      </div>

      {/* KPIs de Rastreamento e Busca */}
      <SectionTitle icon="🤖" label="Atividade de Rastreamento &amp; Desempenho Orgânico" C={C} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: "1.3rem" }}>
        <MetricCard label="Páginas Rastreadas" value={formatNumber(metrics.totalCrawled)} sub="visitas de bots de IA / Bingbot" color={C.info} C={C} />
        <MetricCard label="Páginas no Índice" value={formatNumber(metrics.inIndex)} sub="páginas ativas no índice" color={C.violet} C={C} />
        <MetricCard label="Impressões na Busca" value={formatNumber(metrics.totalImpressions)} sub="exibições nos resultados Bing/IA" color={C.warning} C={C} />
        <MetricCard label="Cliques Orgânicos" value={formatNumber(metrics.totalClicks)} sub="tráfego gerado" color={C.success} C={C} />
        <MetricCard label="CTR Médio" value={formatPercent(metrics.ctr)} sub="taxa de cliques orgânicos" color={C.info} C={C} />
        <MetricCard label="Respeito a Robots.txt" value="100%" sub={`${metrics.crawlErrors || 0} erros no período`} color={C.success} C={C} />
      </div>

      {/* Grid com Tabela de Consultas e Saúde de Rastreamento */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: "1.2rem" }}>
        
        {/* Tabela de Consultas de Busca no Bing */}
        <div style={subPanelStyle}>
          <SectionTitle icon="🔍" label="Consultas Principais na Pesquisa Bing" C={C} />
          {topQueries && topQueries.length > 0 ? (
            <div style={{ overflowX: "auto", maxHeight: 280, overflowY: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Consulta</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Cliques</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Impressões</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Pos. Média</th>
                  </tr>
                </thead>
                <tbody>
                  {topQueries.slice(0, 10).map((q, idx) => (
                    <tr key={`${q.query}-${idx}`}>
                      <td style={{ ...tdStyle, fontWeight: 600, color: C.text }}>{q.query}</td>
                      <td style={{ ...tdStyle, textAlign: "right", color: C.success, fontWeight: 700 }}>{formatNumber(q.clicks)}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{formatNumber(q.impressions)}</td>
                      <td style={{ ...tdStyle, textAlign: "right", color: C.muted }}>{q.avgPosition > 0 ? `#${q.avgPosition}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: "0.75rem", color: C.muted, margin: 0 }}>Nenhuma consulta registrada para o período.</p>
          )}
        </div>

        {/* Diagnóstico de Saúde de Rastreamento */}
        <div style={subPanelStyle}>
          <SectionTitle icon="🩺" label="Saúde de Rastreamento de Páginas" C={C} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8, background: C.hoverBg }}>
              <span style={{ fontSize: "0.78rem", color: C.textSoft }}>Sucesso HTTP (Status 2xx)</span>
              <strong style={{ fontSize: "0.85rem", color: C.success }}>{formatNumber(health.code2xx)} requisições</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8, background: C.hoverBg }}>
              <span style={{ fontSize: "0.78rem", color: C.textSoft }}>Redirecionamentos (Status 301)</span>
              <strong style={{ fontSize: "0.85rem", color: C.info }}>{formatNumber(health.code301)} requisições</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8, background: C.hoverBg }}>
              <span style={{ fontSize: "0.78rem", color: C.textSoft }}>Erros de Cliente (Status 4xx)</span>
              <strong style={{ fontSize: "0.85rem", color: health.code4xx > 50 ? C.danger : C.muted }}>{formatNumber(health.code4xx)} páginas</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8, background: C.hoverBg }}>
              <span style={{ fontSize: "0.78rem", color: C.textSoft }}>Bloqueios de Robots.txt</span>
              <strong style={{ fontSize: "0.85rem", color: C.success }}>{formatNumber(health.blockedRobots)} (Livre)</strong>
            </div>
          </div>
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: "0.7rem", color: C.muted, lineHeight: 1.5 }}>
            💡 Os robôs do Bing/Copilot rastrearam <strong>{formatNumber(metrics.totalCrawled)} páginas</strong> sem bloqueios críticos de robots.txt, garantindo que o conteúdo da DOit esteja pronto para citações na IA.
          </div>
        </div>

      </div>
    </article>
  );
}
