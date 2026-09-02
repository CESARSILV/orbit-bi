"use client";

const number = new Intl.NumberFormat("pt-BR");
const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fourDecimals = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

const browserLabels = {
  ChromeMobile: "Chrome Mobile",
  MobileSafari: "Safari Mobile",
  GoogleApp: "Google App",
  Unknown: "Desconhecido",
  SamsungInternet: "Samsung Internet",
  InstagramApp: "Instagram App",
};

function formatNumber(value) {
  return number.format(value ?? 0);
}

function formatDecimal(value) {
  return decimal.format(value ?? 0);
}

function formatPercent(value) {
  return `${formatDecimal(value)}%`;
}

function formatUrl(url) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "") || "/";
}

export default function ClarityExportPanel({ data, C }) {
  const { citation, overview, targetMonth, periodLabel, sourceLabel } = data;
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

  return (
    <article style={panelStyle}>
      <div className="panel-heading" style={{ marginBottom: "1.2rem" }}>
        <div>
          <p className="eyebrow">VISIBILIDADE DA IA</p>
          <h2 style={{ margin: 0 }}>Citações & Analytics do Clarity</h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.7rem", color: C.muted, fontWeight: 500 }}>
            📅 {periodLabel || targetMonth} • Fonte: Microsoft Clarity
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${C.warning}18`, border: `1px solid ${C.warning}55`, borderRadius: 99, padding: "4px 12px" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.warning, boxShadow: `0 0 6px ${C.warning}` }} />
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: C.warning }}>Exportado</span>
        </div>
      </div>

      <div style={{ marginBottom: "1.2rem", padding: "10px 12px", borderRadius: 10, background: C.successSoft, border: `1px solid ${C.successBorder}`, color: C.textSoft, fontSize: "0.75rem", lineHeight: 1.5 }}>
        <strong style={{ color: C.success }}>Dados reais importados:</strong> {sourceLabel || "exportação manual do Microsoft Clarity"}. O período abaixo corresponde ao arquivo enviado e não a uma consulta automática em tempo real.
      </div>

      <SectionTitle icon="✦" label="Citações de IA" C={C} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: "1.3rem" }}>
        <MetricCard label="Citações de páginas" value={formatNumber(citation.pageCitations)} sub="no período" color={C.violet} C={C} />
        <MetricCard label="Share of authority" value={formatPercent(citation.shareOfAuthority)} sub="participação nas citações" color={C.info} C={C} />
        <MetricCard label="Tráfego de referência IA" value={`< 1%`} sub={`${formatPercent(citation.aiReferralTraffic)} no export`} color={C.success} C={C} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: "1.3rem" }}>
        <div style={subPanelStyle}>
          <SectionTitle icon="◌" label="Share of authority" C={C} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {citation.authority.map((item, index) => (
              <DistributionRow key={item.label} label={item.label} percentage={item.percentage} count={`${formatNumber(item.citations)} citações`} color={index === 0 ? C.violet : C.info} C={C} />
            ))}
          </div>
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}`, fontSize: "0.68rem", color: C.muted }}>
            O Clarity atribui 21,94% da autoridade ao domínio da DOit e 78,06% aos demais domínios no período exportado.
          </div>
        </div>

        <div style={subPanelStyle}>
          <SectionTitle icon="⌁" label="Por tipo de consulta" C={C} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {citation.queryTypes.map((item, index) => (
              <DistributionRow key={item.label} label={item.label} percentage={item.percentage} count={`${formatNumber(item.citations)} citações`} color={index === 0 ? C.warning : C.success} C={C} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: "1.5rem" }}>
        <DataTablePanel title="Consultas de grounding" icon="⌕" C={C}>
          <table style={tableStyle}>
            <thead><tr><th style={thStyle(C)}>Consulta</th><th style={thStyle(C)}>Citações</th><th style={thStyle(C)}>SoA</th></tr></thead>
            <tbody>
              {citation.groundingQueries.map((item, index) => (
                <tr key={`${item.query}-${index}`}>
                  <td style={tdStyle(C, true)}>{item.query}</td>
                  <td style={tdStyle(C)}>{formatNumber(item.citations)}</td>
                  <td style={tdStyle(C)}>{formatPercent(item.shareOfAuthority)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTablePanel>

        <DataTablePanel title="Minhas páginas citadas" icon="▣" C={C}>
          <table style={tableStyle}>
            <thead><tr><th style={thStyle(C)}>Página</th><th style={thStyle(C)}>Citações</th></tr></thead>
            <tbody>
              {citation.citedPages.map((item, index) => (
                <tr key={`${item.url}-${index}`}>
                  <td style={{ ...tdStyle(C, true), maxWidth: 360 }} title={item.url}>{formatUrl(item.url)}</td>
                  <td style={tdStyle(C)}>{formatNumber(item.citations)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTablePanel>
      </div>

      <SectionTitle icon="◈" label="Visão geral do site" C={C} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: "1.3rem" }}>
        <MetricCard label="Sessões" value={formatNumber(overview.sessions)} sub={`${formatNumber(overview.botSessions)} de bots`} color={C.info} C={C} />
        <MetricCard label="Usuários únicos" value={formatNumber(overview.uniqueUsers)} sub="no período" color={C.violet} C={C} />
        <MetricCard label="Páginas por sessão" value={formatDecimal(overview.pagesPerSession)} sub="média" color={C.success} C={C} />
        <MetricCard label="Profundidade de rolagem" value={formatPercent(overview.averageScrollDepth)} sub="média" color={C.warning} C={C} />
        <MetricCard label="Tempo ativo" value={`${formatNumber(overview.activeTimeSeconds)}s`} sub={`${formatNumber(overview.totalActiveTimeSeconds)}s total`} color={C.success} C={C} />
        <MetricCard label="Novos / retornados" value={`${formatNumber(overview.newUserSessions)} / ${formatNumber(overview.returningUserSessions)}`} sub="sessões" color={C.info} C={C} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16, marginBottom: "1.3rem" }}>
        <ListPanel title="Insights" icon="✧" C={C}>
          {overview.insights.map((item) => <ProgressListRow key={item.label} label={item.label} value={`${formatNumber(item.sessions)} sessões`} percentage={item.percentage} color={C.violet} C={C} />)}
        </ListPanel>
        <ListPanel title="Canais" icon="⌁" C={C}>
          {overview.channels.map((item) => <SimpleListRow key={item.name} label={item.label} detail={item.name} value={formatNumber(item.sessions)} color={C.info} C={C} />)}
        </ListPanel>
        <ListPanel title="Categorias de bots" icon="◉" C={C} note="Categorias gerais do export do Clarity; podem se sobrepor e não representam operadores de IA.">
          {overview.botTypes.map((item) => <SimpleListRow key={item.name} label={item.label} detail={item.name} value={formatNumber(item.sessions)} color={C.warning} C={C} />)}
        </ListPanel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: "1.3rem" }}>
        <ListPanel title="Páginas principais" icon="▣" C={C} scroll>
          {overview.topPages.map((item, index) => <SimpleListRow key={`${item.url}-${index}`} label={formatUrl(item.url)} value={formatNumber(item.sessions)} color={index < 3 ? C.success : C.info} C={C} title={item.url} />)}
        </ListPanel>
        <ListPanel title="Referenciadores" icon="↗" C={C} scroll>
          {overview.referrers.map((item) => <SimpleListRow key={item.name} label={item.name} value={formatNumber(item.sessions)} color={C.violet} C={C} />)}
        </ListPanel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16, marginBottom: "1.3rem" }}>
        <ListPanel title="Navegadores" icon="◌" C={C} scroll>
          {overview.browsers.map((item) => <ProgressListRow key={item.name} label={browserLabels[item.name] || item.name} value={`${formatNumber(item.sessions)} sessões`} percentage={item.percentage} color={C.info} C={C} />)}
        </ListPanel>
        <ListPanel title="Eventos inteligentes" icon="⚡" C={C}>
          {overview.smartEvents.map((item) => <ProgressListRow key={item.label} label={item.label} value={`${formatNumber(item.sessions)} sessões`} percentage={item.percentage} color={C.success} C={C} />)}
        </ListPanel>
        <ListPanel title="Fontes" icon="◈" C={C} scroll>
          {overview.sources.map((item, index) => <SimpleListRow key={`${item.name}-${item.detail}-${index}`} label={item.name} detail={item.detail} value={formatNumber(item.sessions)} color={C.warning} C={C} />)}
        </ListPanel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: "1.3rem" }}>
        <ListPanel title="Desempenho" icon="◒" C={C}>
          <SimpleListRow label="Pontuação" value={`${Math.round(overview.performance.score)}/100`} color={C.success} C={C} />
          <SimpleListRow label="LCP" detail="Pintura com maior conteúdo" value={`${formatDecimal(overview.performance.lcpSeconds)}s`} color={C.warning} C={C} />
          <SimpleListRow label="INP" detail="Interação com a próxima pintura" value={`${formatNumber(overview.performance.inpMs)}ms`} color={C.info} C={C} />
          <SimpleListRow label="CLS" detail="Deslocamento cumulativo" value={fourDecimals.format(overview.performance.cls)} color={C.violet} C={C} />
        </ListPanel>
        <ListPanel title="Google Ads" icon="◉" C={C}>
          {overview.googleAds.map((item) => (
            <div key={item.campaign} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.textSoft, lineHeight: 1.4 }}>{item.campaign}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6, color: C.muted, fontSize: "0.68rem" }}>
                <span>Status: <strong style={{ color: C.success }}>{item.status}</strong></span>
                <span>Sessões: <strong style={{ color: C.text }}>{formatNumber(item.sessions)}</strong></span>
                <span>Intenção: <strong style={{ color: C.warning }}>{item.intent}</strong></span>
              </div>
            </div>
          ))}
        </ListPanel>
        <ListPanel title="Erros de JavaScript" icon="⚠" C={C}>
          <SimpleListRow label="Sessões com erro" value={formatNumber(overview.javascriptErrors.sessionsWithErrors)} color={C.danger} C={C} />
          <SimpleListRow label="Total de erros" value={formatNumber(overview.javascriptErrors.totalErrors)} color={C.danger} C={C} />
          <SimpleListRow label={overview.javascriptErrors.errorName} value={formatPercent(overview.javascriptErrors.percentage)} color={C.warning} C={C} />
        </ListPanel>
      </div>

      <div style={{ marginTop: 16, padding: "12px 14px", background: C.successSoft, border: `1px solid ${C.successBorder}`, borderRadius: 10, fontSize: "0.78rem", color: C.textSoft, lineHeight: 1.5 }}>
        <strong style={{ color: C.success }}>Resumo:</strong> em agosto, o site registrou <strong>{formatNumber(overview.sessions)} sessões</strong>, alcançou <strong>{formatNumber(overview.uniqueUsers)} usuários únicos</strong> e teve <strong>{formatNumber(citation.pageCitations)} citações</strong> nas respostas de IA monitoradas pelo Clarity. O canal de IA registrou {formatNumber(overview.channels.find((item) => item.name === "AIPlatform")?.sessions || 0)} sessões no export.
      </div>

      <style jsx>{`
        @media (max-width: 760px) {
          table { font-size: 0.68rem; }
        }
      `}</style>
    </article>
  );
}

function MetricCard({ label, value, sub, color, C }) {
  return (
    <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `2px solid ${color}`, borderRadius: 12, padding: "14px 16px", minWidth: 0 }}>
      <div style={{ fontSize: "0.66rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "1.3rem", fontWeight: 900, color: C.text, overflowWrap: "anywhere" }}>{value}</div>
      <div style={{ fontSize: "0.66rem", color, fontWeight: 600, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function SectionTitle({ icon, label, C }) {
  return <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>{icon} {label}</div>;
}

function DistributionRow({ label, percentage, count, color, C }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: "0.75rem", marginBottom: 6 }}>
        <span style={{ color: C.textSoft, fontWeight: 600 }}>{label}</span>
        <span style={{ color: C.text, fontWeight: 800 }}>{formatPercent(percentage)} <small style={{ color: C.muted, fontWeight: 600 }}>· {count}</small></span>
      </div>
      <div style={{ height: 8, background: C.barBg, borderRadius: 99, overflow: "hidden" }}><div style={{ width: `${Math.min(percentage, 100)}%`, height: "100%", background: color, borderRadius: 99 }} /></div>
    </div>
  );
}

function DataTablePanel({ title, icon, C, children }) {
  return <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", minWidth: 0, overflow: "hidden" }}><SectionTitle icon={icon} label={title} C={C} /><div style={{ overflowX: "auto", maxHeight: 270, overflowY: "auto" }}>{children}</div></div>;
}

function ListPanel({ title, icon, C, children, note, scroll = false }) {
  return <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", minWidth: 0, overflow: "hidden" }}><SectionTitle icon={icon} label={title} C={C} /><div style={{ maxHeight: scroll ? 280 : "none", overflowY: scroll ? "auto" : "visible", paddingRight: scroll ? 4 : 0 }}>{children}</div>{note && <p style={{ margin: "10px 0 0", paddingTop: 9, borderTop: `1px solid ${C.border}`, color: C.muted, fontSize: "0.65rem", lineHeight: 1.45 }}>{note}</p>}</div>;
}

function ProgressListRow({ label, value, percentage, color, C }) {
  return <div style={{ marginBottom: 10 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: "0.7rem", marginBottom: 5 }}><span style={{ color: C.textSoft, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={label}>{label}</span><span style={{ color: C.muted, whiteSpace: "nowrap" }}>{value} · {formatPercent(percentage)}</span></div><div style={{ height: 6, background: C.barBg, borderRadius: 99, overflow: "hidden" }}><div style={{ width: `${Math.min(percentage, 100)}%`, height: "100%", background: color, borderRadius: 99 }} /></div></div>;
}

function SimpleListRow({ label, detail, value, color, C, title }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: `1px solid ${C.border}`, minWidth: 0 }}><span style={{ width: 7, height: 7, flex: "0 0 7px", borderRadius: "50%", background: color }} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ color: C.textSoft, fontSize: "0.72rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={title || label}>{label}</div>{detail && <div style={{ color: C.muted, fontSize: "0.62rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail}</div>}</div>{value !== undefined && <span style={{ color: C.text, fontSize: "0.72rem", fontWeight: 800, whiteSpace: "nowrap" }}>{value}</span>}</div>;
}

const tableStyle = { width: "100%", borderCollapse: "collapse", minWidth: 280 };
const thStyle = (C) => ({ textAlign: "left", color: C.muted, fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 8px 8px", position: "sticky", top: 0, background: C.cardBg, zIndex: 1 });
const tdStyle = (C, wide = false) => ({ color: C.textSoft, fontSize: "0.68rem", padding: "8px", borderTop: `1px solid ${C.border}`, lineHeight: 1.35, maxWidth: wide ? 360 : undefined, overflowWrap: wide ? "anywhere" : "normal" });
