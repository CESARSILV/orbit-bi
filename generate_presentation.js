const fs = require('fs');
const path = require('path');

// UTF-16 helper to encode Portuguese accent characters properly in raw PDF
const pdfText = (value) => {
  const bytes = [0xfe, 0xff];
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code > 0xffff) continue;
    bytes.push((code >> 8) & 255, code & 255);
  }
  return `<${bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("")}>`;
};

// Raw PDF generator command buffer
class PdfWriter {
  constructor() {
    this.commands = [];
  }
  
  bg() {
    // Slate dark background for premium visual identity
    this.commands.push("0.02 0.03 0.06 rg 0 0 595 842 re f");
  }

  accentBorder() {
    // Top neon accent border
    this.commands.push("0.48 0.72 1.0 rg 36 810 523 5 re f");
  }
  
  rect(x, y, w, h, r = 0.07, g = 0.10, b = 0.16) {
    // Card background
    this.commands.push(`${r} ${g} ${b} rg ${x} ${y} ${w} ${h} re f`);
  }

  line(x1, y1, x2, y2, r = 0.48, g = 0.72, b = 1.0, width = 1) {
    this.commands.push(`q ${r} ${g} ${b} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S Q`);
  }

  text(str, size, x, y, r = 0.95, g = 0.97, b = 0.99, bold = false) {
    const font = bold ? "/F2" : "/F1";
    this.commands.push(`BT ${font} ${size} Tf ${x} ${y} Td ${r} ${g} ${b} rg ${pdfText(str)} Tj ET`);
  }
  
  getStream() {
    return this.commands.join("\n");
  }
}

// Generate Page 1: Cover
const p1 = new PdfWriter();
p1.bg();
p1.accentBorder();
p1.rect(54, 250, 487, 240, 0.05, 0.08, 0.13); // Card
p1.text("ORBIT BI", 38, 72, 600, 0.48, 0.72, 1.0, true);
p1.text("Plataforma Premium de Analytics e Co-Piloto de IA", 16, 72, 565, 0.26, 0.73, 0.51, false);
p1.text("DOSSIÊ EXECUTIVO DE APRESENTAÇÃO", 10, 72, 450, 0.60, 0.65, 0.72, true);
p1.text("Visão Geral das Funcionalidades e Escala de Mídia", 14, 72, 420, 0.95, 0.97, 0.99, true);
p1.text("Este documento descreve detalhadamente o conjunto de recursos, integracoes", 10, 72, 380, 0.80, 0.83, 0.88, false);
p1.text("e visualizacoes de alto impacto embarcados no Orbit BI para tomada de decisao.", 10, 72, 362, 0.80, 0.83, 0.88, false);
p1.line(72, 335, 510, 335, 0.26, 0.73, 0.51, 1);
p1.text("Status: Produção (v1.5)  |  Tecnologia: Next.js + Supabase + Gemini API", 9, 72, 305, 0.60, 0.65, 0.72, false);
p1.text("MAIO DE 2026  •  ORBIT ANALYTICS", 9, 230, 100, 0.40, 0.45, 0.52, true);

// Generate Page 2: Importador e Parser
const p2 = new PdfWriter();
p2.bg();
p2.accentBorder();
p2.text("01. CONSOLIDAÇÃO & PARSER DE DADOS", 16, 54, 750, 0.48, 0.72, 1.0, true);
p2.line(54, 735, 541, 735, 0.48, 0.72, 1.0, 1);

// Row 1: Detecção Automática
p2.rect(54, 570, 487, 130, 0.05, 0.08, 0.13);
p2.text("DETECÇÃO AUTOMÁTICA DE CANAL (GOOGLE ADS vs META ADS)", 11, 72, 670, 0.26, 0.73, 0.51, true);
p2.text("O sistema analisa os arquivos CSV enviados identificando automaticamente a plataforma de origem.", 9.5, 72, 642, 0.90, 0.92, 0.95, false);
p2.text("• Nome do arquivo: Busca por termos como 'google', 'meta', 'facebook', 'instagram', 'gads'.", 9, 72, 622, 0.80, 0.83, 0.88, false);
p2.text("• Chaves de coluna: Pontuação baseada em colunas exclusivas (ex: 'cpc méd.' para Google; 'alcance' para Meta).", 9, 72, 604, 0.80, 0.83, 0.88, false);
p2.text("• Conteúdo: Examina primeiras linhas por termos como 'Pesquisa/PMax' (Google) ou status de veiculação (Meta).", 9, 72, 586, 0.80, 0.83, 0.88, false);

// Row 2: Mapeamento PT-BR
p2.rect(54, 420, 487, 130, 0.05, 0.08, 0.13);
p2.text("MAPEAMENTO DINÂMICO DE SINÔNIMOS EM PORTUGUÊS (PT-BR)", 11, 72, 520, 0.26, 0.73, 0.51, true);
p2.text("Suporte nativo aos formatos de exportação padrão em português do Brasil e inglês.", 9.5, 72, 492, 0.90, 0.92, 0.95, false);
p2.text("• Mapeia sinônimos como 'Custo', 'Valor gasto', 'Investimento' e 'Spend' para a métrica interna global.", 9, 72, 472, 0.80, 0.83, 0.88, false);
p2.text("• Mapeia 'Conversões', 'Compras', 'Resultados' e 'Leads' unificando a leitura de CPA.", 9, 72, 454, 0.80, 0.83, 0.88, false);
p2.text("• Mapeia 'Valor de conversão', 'Receita' e 'Revenue' para calcular automaticamente o ROAS final.", 9, 72, 436, 0.80, 0.83, 0.88, false);

// Row 3: Parser Universal e Limpeza
p2.rect(54, 270, 487, 130, 0.05, 0.08, 0.13);
p2.text("PARSER FLOAT UNIVERSAL & HIGIENIZAÇÃO DE LINHAS", 11, 72, 370, 0.26, 0.73, 0.51, true);
p2.text("Algoritmo robusto de ingestão que impede quebras e dados corrompidos.", 9.5, 72, 342, 0.90, 0.92, 0.95, false);
p2.text("• Tratamento Numérico: Converte automaticamente formatos brasileiros (1.234,56) e americanos (1,234.56).", 9, 72, 322, 0.80, 0.83, 0.88, false);
p2.text("• Remoção de Totais: Ignora linhas de resumo ('Total', 'Total Geral', 'Resumo') para não duplicar métricas.", 9, 72, 304, 0.80, 0.83, 0.88, false);
p2.text("• Inteligência de Quebra: Detecta planilhas de segmentação (Dispositivos, Dia/Hora) e as separa das campanhas.", 9, 72, 286, 0.80, 0.83, 0.88, false);

p2.text("Página 2  |  Orbit BI Apresentação", 9, 54, 50, 0.40, 0.45, 0.52, false);

// Generate Page 3: Widgets de Segmentação
const p3 = new PdfWriter();
p3.bg();
p3.accentBorder();
p3.text("02. PAINÉIS DE SEGMENTAÇÃO AVANÇADA (DASHBOARD)", 16, 54, 750, 0.48, 0.72, 1.0, true);
p3.line(54, 735, 541, 735, 0.48, 0.72, 1.0, 1);

// Row 1: Dispositivos
p3.rect(54, 570, 487, 130, 0.05, 0.08, 0.13);
p3.text("ANÁLISE DE DISPOSITIVOS (MOBILE vs DESKTOP)", 11, 72, 670, 0.26, 0.73, 0.51, true);
p3.text("Monitoramento visual da proporção de investimento e conversões entre Celular e Computador.", 9.5, 72, 642, 0.90, 0.92, 0.95, false);
p3.text("• Barras de Progresso Dinâmicas: Transições fluidas representam a fatia percentual de cada canal.", 9, 72, 622, 0.80, 0.83, 0.88, false);
p3.text("• Métricas Dedicadas: Exibição individual de Investimento total, Volume de Conversões e CPA por dispositivo.", 9, 72, 604, 0.80, 0.83, 0.88, false);
p3.text("• Inteligência Local: Exibe estado neutro se vazio e renderiza imediatamente após o upload do CSV.", 9, 72, 586, 0.80, 0.83, 0.88, false);

// Row 2: Heatmap
p3.rect(54, 420, 487, 130, 0.05, 0.08, 0.13);
p3.text("DENSIDADE CRONOLÓGICA (HEATMAP DIA E HORA - 7x6)", 11, 72, 520, 0.26, 0.73, 0.51, true);
p3.text("Grade de calor inteligente representando o volume de vendas por dia da semana e faixa horária.", 9.5, 72, 492, 0.90, 0.92, 0.95, false);
p3.text("• Escala de Intensidade: Coloração automatizada baseada na densidade proporcional de conversões.", 9, 72, 472, 0.80, 0.83, 0.88, false);
p3.text("• Tooltips Dinâmicos: Exibe o volume exato e recomendações da IA ao passar o mouse sobre as células.", 9, 72, 454, 0.80, 0.83, 0.88, false);
p3.text("• Sugestões de Lance: Alertas automáticos para cortar lances de madrugada ou intensificar no horário nobre.", 9, 72, 436, 0.80, 0.83, 0.88, false);

// Row 3: Mapa Regional
p3.rect(54, 270, 487, 130, 0.05, 0.08, 0.13);
p3.text("DISTRIBUIÇÃO GEOGRÁFICA INTERATIVA (MAPA DO BRASIL SVG)", 11, 72, 370, 0.26, 0.73, 0.51, true);
p3.text("Mapa vetorial estilizado que divide a performance do investimento pelas cinco macro-regiões do país.", 9.5, 72, 342, 0.90, 0.92, 0.95, false);
p3.text("• Efeitos de Brilho Neon: Destaque visual interativo nas bordas da região selecionada pelo mouse.", 9, 72, 322, 0.80, 0.83, 0.88, false);
p3.text("• Painel de Métricas Regionalizado: Atualização em tempo real de Conversões, CPA, Investimento e ROI regional.", 9, 72, 304, 0.80, 0.83, 0.88, false);
p3.text("• Insights Geográficos: Recomendações em texto de escala ou otimização para Norte, Nordeste, Sul, Sudeste, CO.", 9, 72, 286, 0.80, 0.83, 0.88, false);

p3.text("Página 3  |  Orbit BI Apresentação", 9, 54, 50, 0.40, 0.45, 0.52, false);

// Generate Page 4: Co-Piloto de IA e Exportação
const p4 = new PdfWriter();
p4.bg();
p4.accentBorder();
p4.text("03. CO-PILOTO DE IA & RELATÓRIOS EXECUTIVOS", 16, 54, 750, 0.48, 0.72, 1.0, true);
p4.line(54, 735, 541, 735, 0.48, 0.72, 1.0, 1);

// Row 1: Chat Assistant
p4.rect(54, 570, 487, 130, 0.05, 0.08, 0.13);
p4.text("ASSISTENTE DE CHAT INTELIGENTE (INTEGRAÇÃO GEMINI API)", 11, 72, 670, 0.26, 0.73, 0.51, true);
p4.text("Canal de conversação em linguagem natural integrado com a IA do Google Gemini (2.5 Flash).", 9.5, 72, 642, 0.90, 0.92, 0.95, false);
p4.text("• Diagnósticos em Contexto: A IA lê as campanhas ativas e gera insights focados em ROAS, CPA e gargalos.", 9, 72, 622, 0.80, 0.83, 0.88, false);
p4.text("• Suporte a Anexos: Permite enviar imagens de anúncios e arquivos txt complementares de relatórios.", 9, 72, 604, 0.80, 0.83, 0.88, false);
p4.text("• Modo Simulação: Executa respostas estruturadas e precisas caso a API Key não esteja cadastrada.", 9, 72, 586, 0.80, 0.83, 0.88, false);

// Row 2: PDF Premium
p4.rect(54, 420, 487, 130, 0.05, 0.08, 0.13);
p4.text("GERADOR DE RELATÓRIO EXECUTIVO EM PDF PREMIUM", 11, 72, 520, 0.26, 0.73, 0.51, true);
p4.text("Compilação automática dos dados do dashboard em formato PDF de alta fidelidade visual.", 9.5, 72, 492, 0.90, 0.92, 0.95, false);
p4.text("• Storytelling Estratégico: Conclusões automáticas de IA narrando os pontos fortes e riscos de mídia.", 9, 72, 472, 0.80, 0.83, 0.88, false);
p4.text("• Diagramação em Gráficos: Criação de gráficos vetoriais nativos de share de orçamento (Google vs Meta).", 9, 72, 454, 0.80, 0.83, 0.88, false);
p4.text("• Plano de Ação: Lista automatizada de próximos passos recomendados para implementar imediatamente.", 9, 72, 436, 0.80, 0.83, 0.88, false);

// Row 3: Planilha Executiva
p4.rect(54, 270, 487, 130, 0.05, 0.08, 0.13);
p4.text("EXPORTAÇÃO DE PLANILHA EXECUTIVA (CSV HÍBRIDO)", 11, 72, 370, 0.26, 0.73, 0.51, true);
p4.text("Exportação de planilhas higienizadas prontas para importação no Excel ou Google Sheets.", 9.5, 72, 342, 0.90, 0.92, 0.95, false);
p4.text("• Fórmulas Dinâmicas: Linhas de fórmula nativa Excel prontas para cálculo automático de ROI e ROAS.", 9, 72, 322, 0.80, 0.83, 0.88, false);
p4.text("• Estrutura Organizada: Limpeza de acentos incompatíveis e formatação com delimitador ponto e vírgula.", 9, 72, 304, 0.80, 0.83, 0.88, false);
p4.text("• Auditoria de IA: Exporta junto o veredito e status de escala de cada campanha.", 9, 72, 286, 0.80, 0.83, 0.88, false);

p4.text("Página 4  |  Orbit BI Apresentação", 9, 54, 50, 0.40, 0.45, 0.52, false);

// Generate Page 5: Arquitetura e Segurança
const p5 = new PdfWriter();
p5.bg();
p5.accentBorder();
p5.text("04. ARQUITETURA, PERSISTÊNCIA & SEGURANÇA", 16, 54, 750, 0.48, 0.72, 1.0, true);
p5.line(54, 735, 541, 735, 0.48, 0.72, 1.0, 1);

// Row 1: Supabase e Storage
p5.rect(54, 570, 487, 130, 0.05, 0.08, 0.13);
p5.text("BANCO DE DADOS POSTGRESQL E STORAGE (SUPABASE)", 11, 72, 670, 0.26, 0.73, 0.51, true);
p5.text("Infraestrutura em nuvem integrada para garantir persistência e segurança de dados confidenciais.", 9.5, 72, 642, 0.90, 0.92, 0.95, false);
p5.text("• Persistência em Nuvem: Gravação automática de campanhas, dados históricos e configurações do usuário.", 9, 72, 622, 0.80, 0.83, 0.88, false);
p5.text("• Storage de Arquivos: Upload seguro de planilhas CSV e imagens originais na pasta individual de cada usuário.", 9, 72, 604, 0.80, 0.83, 0.88, false);
p5.text("• Isolamento Row-Level Security (RLS): Garante que cada empresa visualize apenas os seus próprios dados.", 9, 72, 586, 0.80, 0.83, 0.88, false);

// Row 2: Simulação Local
p5.rect(54, 420, 487, 130, 0.05, 0.08, 0.13);
p5.text("MOTOR HÍBRIDO DE SIMULAÇÃO LOCAL (ZERO LOCK-IN)", 11, 72, 520, 0.26, 0.73, 0.51, true);
p5.text("Funcionamento independente garantido mesmo sem configurações de chaves de banco de dados.", 9.5, 72, 492, 0.90, 0.92, 0.95, false);
p5.text("• Fallback Automático: Se o Supabase não estiver configurado, a aplicação opera em modo de demonstração.", 9, 72, 472, 0.80, 0.83, 0.88, false);
p5.text("• Ingestão em Memória React: Todos os CSVs de campanhas ou segmentação são interpretados no navegador.", 9, 72, 454, 0.80, 0.83, 0.88, false);
p5.text("• Geração de IDs Dinâmicos: Evita colisões de dados e permite testar todo o ecossistema localmente.", 9, 72, 436, 0.80, 0.83, 0.88, false);

// Row 3: UI/UX e Design System
p5.rect(54, 270, 487, 130, 0.05, 0.08, 0.13);
p5.text("DESIGN SYSTEM PREMIUM E FLUIDEZ VISUAL", 11, 72, 370, 0.26, 0.73, 0.51, true);
p5.text("Visual refinado e contemporâneo projetado para prender a atenção do board executivo.", 9.5, 72, 342, 0.90, 0.92, 0.95, false);
p5.text("• Glassmorphism: Componentes translúcidos com bordas brilhantes e desfoque de fundo sobre aurora animada.", 9, 72, 322, 0.80, 0.83, 0.88, false);
p5.text("• Interface Responsiva: Grade adaptável para perfeita visualização em computadores, tablets e smartphones.", 9, 72, 304, 0.80, 0.83, 0.88, false);
p5.text("• Micro-interações: Efeitos hover inteligentes, transições CSS suaves e feedback de Toast instantâneo.", 9, 72, 286, 0.80, 0.83, 0.88, false);

p5.text("Página 5  |  Orbit BI Apresentação", 9, 54, 50, 0.40, 0.45, 0.52, false);

// Assemble PDF document structure
const generatePdfFile = (outputPath) => {
  const s1 = p1.getStream();
  const s2 = p2.getStream();
  const s3 = p3.getStream();
  const s4 = p4.getStream();
  const s5 = p5.getStream();

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R 6 0 R 7 0 R] /Count 5 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 8 0 R /F2 9 0 R >> >> /Contents 10 0 R >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 8 0 R /F2 9 0 R >> >> /Contents 11 0 R >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 8 0 R /F2 9 0 R >> >> /Contents 12 0 R >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 8 0 R /F2 9 0 R >> >> /Contents 13 0 R >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 8 0 R /F2 9 0 R >> >> /Contents 14 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${s1.length} >>\nstream\n${s1}\nendstream`,
    `<< /Length ${s2.length} >>\nstream\n${s2}\nendstream`,
    `<< /Length ${s3.length} >>\nstream\n${s3}\nendstream`,
    `<< /Length ${s4.length} >>\nstream\n${s4}\nendstream`,
    `<< /Length ${s5.length} >>\nstream\n${s5}\nendstream`
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

  fs.writeFileSync(outputPath, pdf, 'binary');
  console.log(`PDF successfully generated at: ${outputPath}`);
};

const destPath = path.join(__dirname, 'Apresentacao_Orbit_BI.pdf');
generatePdfFile(destPath);
