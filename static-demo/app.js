const state = {
  platform: "todas",
  period: 30,
  goal: "receita",
  chart: "receita",
  uploadedRows: [],
};

const campaigns = [
  { nome: "Pesquisa | Fundo de Funil | Marca", plataforma: "Google Ads", tipo: "google", investimento: 42800, receita: 381900, roas: 8.92, cpa: 42.1, ctr: 7.8, cpc: 2.4, conversoes: 1017, status: "Escalar com cautela" },
  { nome: "Shopping | Produtos Heróis", plataforma: "Google Ads", tipo: "google", investimento: 76300, receita: 512600, roas: 6.72, cpa: 58.4, ctr: 3.9, cpc: 3.1, conversoes: 1307, status: "Vencedora" },
  { nome: "Meta | Lookalike Compradores 3%", plataforma: "Meta Ads", tipo: "meta", investimento: 58500, receita: 284200, roas: 4.86, cpa: 66.8, ctr: 2.6, cpc: 1.92, conversoes: 875, status: "Oportunidade de escala" },
  { nome: "Meta | Remarketing 14 dias", plataforma: "Meta Ads", tipo: "meta", investimento: 31900, receita: 222700, roas: 6.98, cpa: 37.5, ctr: 4.3, cpc: 1.48, conversoes: 851, status: "Manter pressão" },
  { nome: "YouTube | Prova Social", plataforma: "Google Ads", tipo: "google", investimento: 27400, receita: 69200, roas: 2.53, cpa: 118.6, ctr: 1.1, cpc: 4.8, conversoes: 231, status: "Revisar criativo" },
  { nome: "Meta | Interesse Amplo", plataforma: "Meta Ads", tipo: "meta", investimento: 48800, receita: 109400, roas: 2.24, cpa: 132.2, ctr: 1.4, cpc: 2.76, conversoes: 369, status: "Cortar desperdício" },
];

const timeline = [
  { mes: "Jan", receita: 612000, investimento: 151000, roas: 4.05, cpa: 92 },
  { mes: "Fev", receita: 684000, investimento: 158000, roas: 4.33, cpa: 87 },
  { mes: "Mar", receita: 731000, investimento: 169000, roas: 4.33, cpa: 84 },
  { mes: "Abr", receita: 802000, investimento: 176000, roas: 4.56, cpa: 79 },
  { mes: "Mai", receita: 934000, investimento: 199000, roas: 4.69, cpa: 74 },
  { mes: "Jun", receita: 1058200, investimento: 228000, roas: 4.64, cpa: 76 },
];

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("pt-BR");

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function filteredCampaigns() {
  return campaigns.filter((campaign) => state.platform === "todas" || campaign.tipo === state.platform);
}

function totals() {
  const list = filteredCampaigns();
  const investimento = list.reduce((sum, item) => sum + item.investimento, 0);
  const receita = list.reduce((sum, item) => sum + item.receita, 0);
  const conversoes = list.reduce((sum, item) => sum + item.conversoes, 0);
  const cliques = Math.round(list.reduce((sum, item) => sum + item.investimento / item.cpc, 0));
  const impressoes = Math.round(cliques / (list.reduce((sum, item) => sum + item.ctr, 0) / list.length / 100));
  return {
    investimento,
    receita,
    lucro: receita - investimento,
    roas: receita / investimento,
    cpa: investimento / conversoes,
    ctr: list.reduce((sum, item) => sum + item.ctr, 0) / list.length,
    cpc: investimento / cliques,
    conversoes,
    cliques,
    impressoes,
    alcance: Math.round(impressoes * 0.68),
    roi: ((receita - investimento) / investimento) * 100,
    ticket: receita / conversoes,
  };
}

function animateNumber(node, end, formatter) {
  const start = performance.now();
  const duration = 820;
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    node.textContent = formatter(end * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function renderKpis() {
  const data = totals();
  const kpis = [
    ["ROAS", data.roas, (v) => `${v.toFixed(2).replace(".", ",")}x`, "+12,4%", "up", "Retorno sobre investimento", "#7cf7be"],
    ["CPA", data.cpa, (v) => brl.format(v), "-8,7%", "up", "Custo por aquisição", "#7bb7ff"],
    ["Receita total", data.receita, (v) => brl.format(v), "+18,9%", "up", "Faturamento atribuído", "#ffd481"],
    ["Investimento", data.investimento, (v) => brl.format(v), "+9,6%", "up", "Mídia paga total", "#b99cff"],
    ["Lucro estimado", data.lucro, (v) => brl.format(v), "+22,1%", "up", "Receita menos mídia", "#7cf7be"],
    ["Conversões", data.conversoes, (v) => number.format(Math.round(v)), "+14,2%", "up", "Compras e leads qualificados", "#7bb7ff"],
    ["CTR", data.ctr, (v) => `${v.toFixed(2).replace(".", ",")}%`, "+5,1%", "up", "Taxa de cliques", "#ffd481"],
    ["CPC", data.cpc, (v) => brl.format(v), "-3,3%", "up", "Custo por clique", "#7cf7be"],
    ["ROI", data.roi, (v) => `${v.toFixed(0)}%`, "+16,8%", "up", "Retorno financeiro", "#b99cff"],
    ["Impressões", data.impressoes, (v) => number.format(Math.round(v)), "+28,5%", "up", "Exposição total", "#7bb7ff"],
    ["Alcance", data.alcance, (v) => number.format(Math.round(v)), "+21,7%", "up", "Pessoas alcançadas", "#ffd481"],
    ["Ticket médio", data.ticket, (v) => brl.format(v), "+4,9%", "up", "Receita média", "#7cf7be"],
  ];

  $("#kpiGrid").innerHTML = kpis.map(([label, value, format, delta, direction, meta, accent], index) => `
    <article class="kpi-card" style="--accent:${accent}; animation: rise 420ms ease ${index * 35}ms both">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value" data-value="${value}" data-format="${label}">0</div>
      <div class="kpi-meta"><span class="delta ${direction}">${delta}</span><span>${meta}</span></div>
    </article>
  `).join("");

  $$(".kpi-value").forEach((node, index) => animateNumber(node, kpis[index][1], kpis[index][2]));
}

function renderInsights() {
  const best = [...filteredCampaigns()].sort((a, b) => b.roas - a.roas)[0];
  const worst = [...filteredCampaigns()].sort((a, b) => a.roas - b.roas)[0];
  const data = totals();
  $("#executiveSummary").textContent = `O painel indica ${brl.format(data.receita)} em receita atribuída com ROAS de ${data.roas.toFixed(2).replace(".", ",")}x. A maior alavanca está em redistribuir verba das campanhas com fadiga para os conjuntos com CPA abaixo da média.`;
  $("#insightList").innerHTML = [
    ["Campanha vencedora", `${best.nome} lidera com ROAS de ${best.roas.toFixed(2).replace(".", ",")}x e deve receber escala progressiva.`],
    ["Risco detectado", `${worst.nome} apresenta baixa eficiência e sinais de desperdício de orçamento.`],
    ["Próxima ação", "Realocar 12% da verba para remarketing e busca de alta intenção deve elevar o lucro estimado."],
  ].map(([title, text]) => `<div class="insight-card"><strong>${title}</strong><span>${text}</span></div>`).join("");
}

function renderTable() {
  $("#campaignRows").innerHTML = filteredCampaigns()
    .sort((a, b) => b.roas - a.roas)
    .map((item) => `
      <tr>
        <td><strong>${item.nome}</strong></td>
        <td>${item.plataforma}</td>
        <td>${brl.format(item.investimento)}</td>
        <td>${brl.format(item.receita)}</td>
        <td>${item.roas.toFixed(2).replace(".", ",")}x</td>
        <td>${brl.format(item.cpa)}</td>
        <td><span class="tag">${item.status}</span></td>
      </tr>
    `).join("");
}

function drawLineChart() {
  const canvas = $("#mainChart");
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * ratio;
  canvas.height = 260 * ratio;
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, canvas.clientWidth, 260);

  const padding = 34;
  const width = canvas.clientWidth - padding * 2;
  const height = 200;
  const metric = state.chart;
  const values = timeline.map((item) => item[metric]);
  const max = Math.max(...values) * 1.14;
  const min = metric === "cpa" ? Math.min(...values) * 0.82 : 0;

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = padding + (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(padding + width, y);
    ctx.stroke();
  }

  const points = values.map((value, index) => ({
    x: padding + (width / (values.length - 1)) * index,
    y: padding + height - ((value - min) / (max - min)) * height,
    value,
  }));

  const gradient = ctx.createLinearGradient(0, 0, canvas.clientWidth, 0);
  gradient.addColorStop(0, "#7bb7ff");
  gradient.addColorStop(0.5, "#7cf7be");
  gradient.addColorStop(1, "#ffd481");
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();

  const fill = ctx.createLinearGradient(0, padding, 0, padding + height);
  fill.addColorStop(0, "rgba(124,247,190,0.22)");
  fill.addColorStop(1, "rgba(124,247,190,0)");
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(points[0].x, padding + height);
  points.forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.lineTo(points[points.length - 1].x, padding + height);
  ctx.closePath();
  ctx.fill();

  ctx.font = "12px Inter, sans-serif";
  ctx.fillStyle = "rgba(245,247,251,0.78)";
  points.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#f5f7fb";
    ctx.fill();
    ctx.fillStyle = "rgba(245,247,251,0.72)";
    ctx.fillText(timeline[index].mes, point.x - 10, padding + height + 26);
  });
}

function drawDonutChart() {
  const canvas = $("#donutChart");
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * ratio;
  canvas.height = 240 * ratio;
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, canvas.clientWidth, 240);

  const google = campaigns.filter((item) => item.tipo === "google").reduce((sum, item) => sum + item.investimento, 0);
  const meta = campaigns.filter((item) => item.tipo === "meta").reduce((sum, item) => sum + item.investimento, 0);
  const total = google + meta;
  const centerX = canvas.clientWidth / 2;
  const centerY = 102;
  const radius = 72;
  let start = -Math.PI / 2;
  [
    { label: "Google Ads", value: google, color: "#7bb7ff" },
    { label: "Meta Ads", value: meta, color: "#7cf7be" },
  ].forEach((slice) => {
    const end = start + (slice.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, start, end);
    ctx.lineWidth = 22;
    ctx.strokeStyle = slice.color;
    ctx.stroke();
    start = end;
  });

  ctx.fillStyle = "#f5f7fb";
  ctx.font = "800 24px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(brl.format(total), centerX, centerY + 4);
  ctx.fillStyle = "rgba(245,247,251,0.62)";
  ctx.font = "12px Inter, sans-serif";
  ctx.fillText("investimento total", centerX, centerY + 24);

  ctx.textAlign = "left";
  ctx.fillStyle = "#7bb7ff";
  ctx.fillRect(24, 206, 10, 10);
  ctx.fillStyle = "#c8d2df";
  ctx.fillText(`Google Ads ${Math.round((google / total) * 100)}%`, 42, 215);
  ctx.fillStyle = "#7cf7be";
  ctx.fillRect(174, 206, 10, 10);
  ctx.fillStyle = "#c8d2df";
  ctx.fillText(`Meta Ads ${Math.round((meta / total) * 100)}%`, 192, 215);
}

function renderAll() {
  renderKpis();
  renderInsights();
  renderTable();
  drawLineChart();
  drawDonutChart();
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((item) => item.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return headers.reduce((row, header, index) => {
      row[header] = values[index]?.trim();
      return row;
    }, {});
  });
}

function handleFiles(files) {
  const list = [...files];
  if (!list.length) return;
  $("#fileFeed").innerHTML = "";
  list.forEach((file) => {
    const item = document.createElement("div");
    item.className = "file-item";
    item.innerHTML = `<span>${file.name}</span><span>Analisado</span>`;
    $("#fileFeed").appendChild(item);
    if (file.name.toLowerCase().endsWith(".csv")) {
      file.text().then((text) => {
        state.uploadedRows = parseCsv(text);
        showToast(`CSV interpretado em PT-BR: ${state.uploadedRows.length} linhas estruturadas.`);
      });
    }
  });
  showToast("Arquivos recebidos. A IA normalizou métricas, campanhas, períodos e moedas.");
}

function aiAnswer(question) {
  const q = question.toLowerCase();
  const best = [...filteredCampaigns()].sort((a, b) => b.roas - a.roas)[0];
  const worst = [...filteredCampaigns()].sort((a, b) => a.roas - b.roas)[0];
  const data = totals();
  if (q.includes("melhor") || q.includes("roas")) {
    return `A campanha com melhor ROAS é ${best.nome}, com ${best.roas.toFixed(2).replace(".", ",")}x. Minha recomendação é escalar em incrementos de 15% a 20% e monitorar CPA diariamente.`;
  }
  if (q.includes("cpa") || q.includes("aumentou")) {
    return `O CPA médio está em ${brl.format(data.cpa)}. A pressão vem principalmente de campanhas com baixa intenção e criativos com fadiga. Eu reduziria verba em ${worst.nome} e moveria orçamento para remarketing e busca.`;
  }
  if (q.includes("desperd") || q.includes("cortar")) {
    return `${worst.nome} é o principal ponto de desperdício: ROAS de ${worst.roas.toFixed(2).replace(".", ",")}x e CPA de ${brl.format(worst.cpa)}. Corte inicial sugerido: 25% do orçamento e teste novos criativos antes de reescalar.`;
  }
  if (q.includes("6 meses") || q.includes("compare")) {
    return `Nos últimos 6 meses, a receita evoluiu de ${brl.format(timeline[0].receita)} para ${brl.format(timeline.at(-1).receita)}. O crescimento acumulado é forte, mas o ROAS estabilizou; o próximo ganho deve vir de mix de verba e melhoria criativa.`;
  }
  return `Minha leitura executiva: receita de ${brl.format(data.receita)}, ROAS de ${data.roas.toFixed(2).replace(".", ",")}x e lucro estimado de ${brl.format(data.lucro)}. A melhor decisão agora é proteger campanhas vencedoras e reduzir verba onde há fadiga ou baixa intenção.`;
}

function addMessage(text, type) {
  const node = document.createElement("div");
  node.className = `message ${type}`;
  node.textContent = text;
  $("#chatFeed").appendChild(node);
  $("#chatFeed").scrollTop = $("#chatFeed").scrollHeight;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function exportSpreadsheet() {
  const rows = [
    ["Campanha", "Plataforma", "Investimento", "Receita", "ROAS", "CPA", "CTR", "CPC", "Conversoes", "Status IA"],
    ...filteredCampaigns().map((item) => [item.nome, item.plataforma, item.investimento, item.receita, item.roas, item.cpa, item.ctr, item.cpc, item.conversoes, item.status]),
    [],
    ["Formula executiva", "ROI", "=((D2-C2)/C2)", "Edite os valores e recalcule em Excel/Sheets"],
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, "orbit-bi-exportacao-executiva.csv");
  showToast("Download iniciado. A planilha será salva na pasta Downloads do navegador.");
}

function pdfText(value) {
  const bytes = [0xfe, 0xff];
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code > 0xffff) continue;
    bytes.push((code >> 8) & 255, code & 255);
  }
  return `<${bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("")}>`;
}

function escapePdfName(value) {
  return value.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

function createExecutivePdf() {
  const data = totals();
  const best = [...filteredCampaigns()].sort((a, b) => b.roas - a.roas)[0];
  const worst = [...filteredCampaigns()].sort((a, b) => a.roas - b.roas)[0];
  const lines = [
    { text: "Orbit BI | Relatório Executivo de Mídia Paga", size: 15, y: 790 },
    { text: "Performance mensal com inteligência estratégica", size: 22, y: 755 },
    { text: `Receita atribuída: ${brl.format(data.receita)}`, size: 14, y: 700 },
    { text: `Investimento total: ${brl.format(data.investimento)}`, size: 14, y: 676 },
    { text: `ROAS: ${data.roas.toFixed(2).replace(".", ",")}x`, size: 14, y: 652 },
    { text: `CPA médio: ${brl.format(data.cpa)}`, size: 14, y: 628 },
    { text: `Lucro estimado: ${brl.format(data.lucro)}`, size: 14, y: 604 },
    { text: "Conclusão executiva", size: 17, y: 550 },
    { text: "O mês apresenta crescimento consistente de receita, com eficiência preservada e oportunidades claras de escala.", size: 11, y: 522 },
    { text: `Campanha vencedora: ${best.nome}, com ROAS de ${best.roas.toFixed(2).replace(".", ",")}x.`, size: 11, y: 500 },
    { text: `Risco detectado: ${worst.nome}, com CPA de ${brl.format(worst.cpa)} e baixa eficiência relativa.`, size: 11, y: 478 },
    { text: "Recomendação estratégica", size: 17, y: 428 },
    { text: "Realocar verba de campanhas com baixo ROAS para busca, shopping e remarketing.", size: 11, y: 400 },
    { text: "Manter testes criativos para ampliar público sem deteriorar CPA.", size: 11, y: 378 },
    { text: "Monitorar fadiga criativa, frequência, custo por clique e taxa de conversão diariamente.", size: 11, y: 356 },
    { text: "Próximos passos", size: 17, y: 306 },
    { text: "1. Escalar vencedores em incrementos de 15% a 20%.", size: 11, y: 278 },
    { text: "2. Cortar desperdício em públicos de baixa intenção.", size: 11, y: 256 },
    { text: "3. Gerar nova leitura executiva após sete dias de dados.", size: 11, y: 234 },
  ];
  const content = [
    "q",
    "0.02 0.03 0.06 rg 0 0 595 842 re f",
    "0.07 0.10 0.16 rg 36 575 523 165 re f",
    "0.05 0.08 0.13 rg 36 185 523 255 re f",
    "0.49 0.97 0.75 rg 36 812 120 3 re f",
    ...lines.map((line) => `BT /F1 ${line.size} Tf 54 ${line.y} Td 0.95 0.97 0.99 rg ${pdfText(line.text)} Tj ET`),
    "Q",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function generateReport() {
  const today = new Date().toLocaleDateString("pt-BR").replaceAll("/", "-");
  downloadBlob(createExecutivePdf(), `orbit-bi-relatorio-executivo-${escapePdfName(today)}.pdf`);
  showToast("Download iniciado. O PDF executivo será salvo na pasta Downloads do navegador.");
}

function animateAurora() {
  const canvas = $("#aurora");
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  function resize() {
    canvas.width = window.innerWidth * ratio;
    canvas.height = window.innerHeight * ratio;
    ctx.scale(ratio, ratio);
  }
  resize();
  let t = 0;
  function frame() {
    t += 0.004;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const blobs = [
      [window.innerWidth * (0.2 + Math.sin(t) * 0.04), window.innerHeight * 0.18, "#7bb7ff"],
      [window.innerWidth * 0.82, window.innerHeight * (0.16 + Math.cos(t * 1.4) * 0.05), "#ffd481"],
      [window.innerWidth * (0.62 + Math.cos(t * 0.8) * 0.04), window.innerHeight * 0.88, "#7cf7be"],
    ];
    blobs.forEach(([x, y, color]) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 360);
      gradient.addColorStop(0, `${color}33`);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    });
    requestAnimationFrame(frame);
  }
  window.addEventListener("resize", resize);
  frame();
}

function bindEvents() {
  $("#platformFilter").addEventListener("change", (event) => {
    state.platform = event.target.value;
    renderAll();
  });
  $("#periodFilter").addEventListener("change", (event) => {
    state.period = Number(event.target.value);
    showToast(`Período atualizado: últimos ${state.period === 180 ? "6 meses" : `${state.period} dias`}.`);
    renderAll();
  });
  $("#goalFilter").addEventListener("change", (event) => {
    state.goal = event.target.value;
    showToast(`Objetivo principal alterado para ${event.target.selectedOptions[0].text}.`);
  });
  $$(".segmented button").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".segmented button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.chart = button.dataset.chart;
      drawLineChart();
    });
  });
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".nav-item").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      $(`#${button.dataset.section}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  $("#fileInput").addEventListener("change", (event) => handleFiles(event.target.files));
  $("#btnSelectFiles").addEventListener("click", () => $("#fileInput").click());
  $("#uploadZone").addEventListener("dragover", (event) => {
    event.preventDefault();
    $("#uploadZone").classList.add("dragover");
  });
  $("#uploadZone").addEventListener("dragleave", () => $("#uploadZone").classList.remove("dragover"));
  $("#uploadZone").addEventListener("drop", (event) => {
    event.preventDefault();
    $("#uploadZone").classList.remove("dragover");
    handleFiles(event.dataTransfer.files);
  });
  $("#chatForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const question = $("#chatInput").value.trim();
    if (!question) return;
    addMessage(question, "user");
    $("#chatInput").value = "";
    window.setTimeout(() => addMessage(aiAnswer(question), "ai"), 420);
  });
  $("#btnExport").addEventListener("click", exportSpreadsheet);
  $("#btnReport").addEventListener("click", generateReport);
  $("#btnReportBottom").addEventListener("click", generateReport);
  $("#btnDemo").addEventListener("click", () => {
    campaigns.forEach((item) => {
      const factor = 0.96 + Math.random() * 0.1;
      item.receita = Math.round(item.receita * factor);
      item.roas = item.receita / item.investimento;
    });
    renderAll();
    showToast("Leitura atualizada com novas variações de performance.");
  });
  $("#btnAutomation").addEventListener("click", () => showToast("Monitoramento ativado: CPA, ROAS, fadiga criativa e verba desperdiçada serão acompanhados."));
  window.addEventListener("resize", () => {
    drawLineChart();
    drawDonutChart();
  });
}

const style = document.createElement("style");
style.textContent = "@keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}";
document.head.appendChild(style);

animateAurora();
bindEvents();
renderAll();
