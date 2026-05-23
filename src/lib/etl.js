import readXlsxFile from "read-excel-file/browser";

export function sanitizeMojibake(str) {
  if (str === undefined || str === null) return str;
  let s = String(str);
  
  s = s
    .replaceAll("Ão", "ão")
    .replaceAll("Ã£", "ã")
    .replaceAll("Ãº", "ú")
    .replaceAll("Ã§", "ç")
    .replaceAll("Ã³", "ó")
    .replaceAll("Ãµ", "õ")
    .replaceAll("Ã©", "é")
    .replaceAll("Ãª", "ê")
    .replaceAll("Ã¡", "á")
    .replaceAll("Ã¢", "â");

  s = s
    .replace(/inÃc/gi, "iníc")
    .replace(/inãc/gi, "iníc")
    .replace(/mÃdi/gi, "mídi")
    .replace(/mãdi/gi, "mídi")
    .replace(/perÃod/gi, "períod")
    .replace(/perãod/gi, "períod")
    .replace(/tÃtul/gi, "títul")
    .replace(/tãtul/gi, "títul");

  return s;
}

// ----------------------------------------------------
// Formatting & Cleaning Helpers
// ----------------------------------------------------

export function parseFormattedFloat(val) {
  if (val === undefined || val === null || val === "") return 0;
  
  // If it's already a number, return it
  if (typeof val === "number") {
    return isNaN(val) ? 0 : val;
  }

  let cleaned = String(val)
    .replace(/[R$\s%]/g, "") // remove currency, percentage and spaces
    .trim();

  if (cleaned === "" || cleaned === "-") return 0;

  // Handle European/Brazilian number format: e.g. 1.200,50 or 1200,50
  if (cleaned.includes(",") && !cleaned.includes(".")) {
    cleaned = cleaned.replace(",", ".");
  } else if (cleaned.includes(",") && cleaned.includes(".")) {
    // 1.200,50 -> 1200.50
    if (cleaned.indexOf(".") < cleaned.indexOf(",")) {
      cleaned = cleaned.replaceAll(".", "").replace(",", ".");
    } else {
      // 1,200.50 -> 1200.50 (US Format but with commas)
      cleaned = cleaned.replaceAll(",", "");
    }
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function parsePercentage(val) {
  if (val === undefined || val === null || val === "") return 0;
  let parsed = parseFormattedFloat(val);
  // If value was explicitly a percentage in string, sheetJS sometimes gives decimal, sometimes raw.
  // We assume if it's > 1 and was text with '%', or is just raw, we divide by 100
  if (String(val).includes("%")) {
    return parsed / 100;
  }
  // If no percentage sign and we expect a ratio, let's keep it, but if it is e.g. 5.5 (meaning 5.5%), divide by 100
  if (parsed > 1) {
    return parsed / 100;
  }
  return parsed;
}

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const MONTH_MAP_PT = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
  janeiro: 0, fevereiro: 1, marco: 2, março: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
};

export function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;

  const str = String(val).toLowerCase().trim();
  if (str === "" || str === "-") return null;

  // Try parsing ISO date
  let d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d;
  }

  // Handle qua., 1 de abr. de 2026
  // Handle 1 de abr. de 2026
  // Handle 01/04/2026
  // Handle 01-04-2026
  const cleanStr = str.replace(/[.,]/g, "").replace(/\s+/g, " ");
  
  // Check for day/month/year patterns
  if (cleanStr.includes(" de ")) {
    const parts = cleanStr.split(" de "); // [ "1", "abr", "2026" ] or [ "qua 1", "abr", "2026" ]
    if (parts.length >= 3) {
      let dayPart = parts[0].trim();
      const monthPart = parts[1].trim();
      const yearPart = parts[2].trim();

      // Extract day number (e.g. from "qua 1")
      const dayMatch = dayPart.match(/\d+/);
      const day = dayMatch ? parseInt(dayMatch[0], 10) : 1;
      const month = MONTH_MAP_PT[monthPart] !== undefined ? MONTH_MAP_PT[monthPart] : 0;
      const year = parseInt(yearPart, 10) || new Date().getFullYear();

      return new Date(year, month, day);
    }
  }

  // Check 01/04/2026 or 01-04-2026
  const slashParts = cleanStr.split(/[\/\-]/);
  if (slashParts.length === 3) {
    const p0 = parseInt(slashParts[0], 10);
    const p1 = parseInt(slashParts[1], 10);
    const p2 = parseInt(slashParts[2], 10);

    if (p2 > 999) {
      // DD/MM/YYYY or MM/DD/YYYY. We assume DD/MM/YYYY for standard Brazilian reports
      const day = p0;
      const month = p1 - 1; // 0-indexed
      const year = p2;
      return new Date(year, month, day);
    } else if (p0 > 999) {
      // YYYY/MM/DD
      const year = p0;
      const month = p1 - 1;
      const day = p2;
      return new Date(year, month, day);
    }
  }

  return null;
}

// ----------------------------------------------------
// Temporal Intelligence Builder
// ----------------------------------------------------

export function applyTemporalIntelligence(dateVal) {
  const d = parseDate(dateVal);
  if (!d || isNaN(d.getTime())) {
    const fallbackDate = new Date();
    const y = fallbackDate.getFullYear();
    const m = fallbackDate.getMonth() + 1;
    const mPad = String(m).padStart(2, "0");
    return {
      date: `${y}-${mPad}-01`,
      day: 1,
      week: 1,
      month: m,
      month_name: MONTHS_PT[m - 1],
      quarter: `Q${Math.ceil(m / 3)}`,
      year: y,
      year_month: `${y}-${mPad}`,
      reference_month: `${y}-${mPad}`,
      reference_label: `${MONTHS_PT[m - 1]}/${y}`
    };
  }

  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const mPad = String(m).padStart(2, "0");
  const dPad = String(day).padStart(2, "0");

  // Calculate week of the year
  const startOfYear = new Date(y, 0, 1);
  const pastDays = Math.floor((d - startOfYear) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);

  return {
    date: `${y}-${mPad}-${dPad}`,
    day,
    week,
    month: m,
    month_name: MONTHS_PT[m - 1],
    quarter: `Q${Math.ceil(m / 3)}`,
    year: y,
    year_month: `${y}-${mPad}`,
    reference_month: `${y}-${mPad}`,
    reference_label: `${MONTHS_PT[m - 1]}/${y}`
  };
}

// ----------------------------------------------------
// Platform & Dataset Classifiers
// ----------------------------------------------------

export function detectPlatform(fileName, rowKeys, rows = []) {
  const name = fileName.toLowerCase();
  
  if (name.includes("meta") || name.includes("facebook") || name.includes("instagram") || name.includes("fbad")) {
    return "meta";
  }
  if (name.includes("google") || name.includes("gads") || name.includes("adwords") || name.includes("g_ads")) {
    return "google";
  }

  let googleScore = 0;
  let metaScore = 0;

  const googleColumns = [
    "cpc méd.", "cpc med.", "impr.", "taxa de conv.", "custo / conv.",
    "valor de conv. / custo", "all conv. value", "imputação de custo", "imputacao de custo",
    "palavra-chave da rede de pesquisa", "tipo de corresp.", "pesquisa do google",
    "tipo de campanha", "status da campanha"
  ];

  const metaColumns = [
    "veiculação", "veiculacao", "configuração de atribuição", "configuracao de atribuicao",
    "alcance", "valor usado (brl)", "valor usado", "resultados", "cliques (todos)",
    "ctr (todos)", "cpc (todos)", "custo por resultado", "início dos relatórios",
    "inicio dos relatorios", "encerramento dos relatórios", "encerramento dos relatorios"
  ];

  rowKeys.forEach(key => {
    const k = key.toLowerCase().trim();
    if (googleColumns.some(gc => k === gc || k.includes(gc))) googleScore += 2;
    if (metaColumns.some(mc => k === mc || k.includes(mc))) metaScore += 2;
  });

  // Check row content
  if (rows && rows.length > 0) {
    rows.slice(0, 10).forEach(row => {
      for (const [k, val] of Object.entries(row)) {
        const keyLower = k.toLowerCase();
        const valStr = String(val).toLowerCase();
        
        if (keyLower.includes("tipo") && (valStr.includes("pesquisa") || valStr.includes("search") || valStr.includes("display") || valStr.includes("pmax"))) {
          googleScore += 2;
        }
        if (keyLower.includes("status") && (valStr.includes("qualificada") || valStr.includes("eligible"))) {
          googleScore += 2;
        }
        if (keyLower.includes("veiculação") && (valStr.includes("ativo") || valStr.includes("pausado") || valStr.includes("veiculando"))) {
          metaScore += 2;
        }
      }
    });
  }

  return metaScore > googleScore ? "meta" : "google";
}

export function detectDataset(platform, rowKeys) {
  const keys = rowKeys.map(k => k.toLowerCase().trim());

  if (platform === "meta") {
    return "meta_campaign_performance";
  }

  // Google Ads Datasets Detection
  const hasCliques = keys.some(k => k === "cliques" || k === "clicks");
  const hasCusto = keys.some(k => k === "custo" || k === "cost" || k === "spend" || k.includes("valor"));
  const hasImpressoes = keys.some(k => k === "impressões" || k === "impressions" || k === "impr.");
  const hasCampaign = keys.some(k => k === "campanha" || k === "campaign" || k === "nome da campanha" || k === "campaign name");

  const hasDia = keys.some(k => k === "dia" || k === "day" || k === "dia da semana" || k === "day of week");
  const hasHora = keys.some(k => k === "hora" || k === "hour" || k === "hora de início" || k === "hour of day" || k === "hora de inicio");
  const hasData = keys.some(k => k === "data" || k === "date");
  const hasDispositivo = keys.some(k => k === "dispositivo" || k === "device");
  const hasIdade = keys.some(k => k === "faixa de idade" || k === "age" || k === "idade");
  const hasSexo = keys.some(k => k === "sexo" || k === "gender" || k === "gênero");
  const hasKeyword = keys.some(k => k === "palavra-chave da rede de pesquisa" || k === "keyword" || k === "palavra-chave");
  const hasSearchTerm = keys.some(k => k === "pesquisa do google" || k === "search term" || k === "pesquisar" || k === "termo de pesquisa");
  const hasRede = keys.some(k => k === "rede" || k === "network" || k === "rede com parceiros de pesquisa");

  if (hasCampaign && (hasCliques || hasCusto || hasImpressoes)) return "campaign_performance";
  if (hasDia && hasHora && hasCliques) return "weekday_hour_performance";
  if (hasDia && hasCliques) return "weekday_performance";
  if (hasHora && hasCliques) return "hourly_performance";
  if (hasDispositivo && (hasCusto || hasCliques)) return "device_performance";
  if (hasSexo && hasIdade && hasImpressoes) return "demographics_gender_age";
  if (hasIdade && hasImpressoes) return "demographics_age";
  if (hasSexo && hasImpressoes) return "demographics_gender";
  if (hasKeyword && (keys.includes("ctr") || keys.includes("cpc méd.") || hasCliques)) return "search_keywords";
  if (hasSearchTerm && (hasCusto || hasCliques)) return "search_terms";
  if (hasRede && (hasCliques || hasCusto)) return "network_performance";
  if (hasData && (hasCliques || hasCusto || hasImpressoes)) return "daily_time_series";

  // Fallback to time series or general campaigns if has data / campaigns
  if (hasData) return "daily_time_series";
  return "daily_time_series"; // Default general campaigns are treated as time series or parsed campaigns
}

// ----------------------------------------------------
// Semantic Synonyms Mapping
// ----------------------------------------------------

export const SYNONYMS = {
  campaign_name: ["campanha", "campaign", "nome da campanha", "nome_da_campanha", "campanhas", "campaign name", "campaña", "nome", "name", "campaign name ", "campaign name", "campaign_name", "nome_campanha"],
  spend: ["investimento", "investimento (brl)", "custo", "spend", "cost", "valor usado", "quantia gasta", "valor usado (brl)", "valor gasto", "valor gasto (brl)", "amount spent", "amount spent (brl)", "imputação de custo", "gasto", "gastos", "valor_usado", "valor_gasto", "custo_total", "total cost"],
  clicks: ["cliques", "clicks", "click", "cliques (todos)", "cliques (no link)", "link clicks", "cliques no link", "clique", "cliques_no_link", "clicks (all)", "cliques totais", "cliques_totais", "total clicks", "total_clicks"],
  impressions: ["impressões", "impressoes", "impressions", "impr.", "impr", "impressões (todos)", "visualizações", "views"],
  conversions: ["conversoes", "conversões", "conversions", "compras", "purchases", "resultados", "results", "leads", "compras no site", "website purchases", "purchase", "compras (pixel do facebook)", "compras no facebook", "leads (formulário)", "leads (formulario)", "cadastros", "conversões de compras", "leads_total", "conversões totais"],
  ctr: ["ctr", "ctr (todos)", "ctr (all)", "taxa de cliques", "click-through rate", "taxa de clique", "taxa_de_clique", "ctr_total"],
  cpc: ["cpc", "cpc méd.", "cpc médio", "cpc (todos)", "cpc (all)", "cost per click", "cpc_medio", "cpc_med"],
  reach: ["alcance", "reach", "pessoas alcançadas", "alcance total"],
  frequency: ["frequência", "frequencia", "frequency", "freq", "frequência média"],
  revenue: ["receita", "receita (brl)", "revenue", "valor de conversão", "valor de conversão de compras", "conversões (valor)", "valor das conversões", "valor total de conversões", "valor de compra", "valor de compras", "purchase value", "purchase conversion value", "website purchase conversion value", "valor de conversão de todas as conversões", "all conv. value", "valor de conversão de compras no site", "valor de conversão de compras no facebook", "valor de conversão de compras (brl)", "valor de conversão de compras no site (brl)", "compras no site (valor de conversão)", "compras (valor de conversão)", "conversion value", "conversion_value", "valor_conversao", "receita_total", "total revenue"],
  device: ["dispositivo", "device", "equipamento", "tipo de dispositivo", "device category"],
  gender: ["sexo", "gender", "gênero", "genero", "gêneros"],
  age_range: ["faixa de idade", "age", "idade", "faixa etária", "faixa etaria", "age range", "age_range", "faixa_etaria", "grupo_idade"],
  keyword: ["palavra-chave", "keyword", "palavra-chave da rede de pesquisa", "palavras-chave", "palavra chave", "palavras chave", "keyword_name"],
  search_term: ["termo de pesquisa", "search term", "pesquisa do google", "pesquisar", "termo pesquisado", "termo", "search_term", "query", "pesquisa_usuario"],
  network: ["rede", "network", "rede de publicidade", "rede com parceiros de pesquisa", "canal", "network_type"],
  date: ["data", "date", "dia", "day", "início dos relatórios", "inicio dos relatorios", "reporting starts", "reporting start", "data_inicio", "start_date"],
  hour: ["hora", "hour", "hora de início", "hour of day", "hora de inicio", "horário", "horario", "hora_dia"],
  status: ["status", "estado", "situação", "delivery", "veiculação", "veiculacao", "status da campanha", "veiculação da campanha", "status_campanha"]
};

export function getSemanticValue(row, targetField, defaultValue = undefined) {
  const synonyms = SYNONYMS[targetField];
  if (!synonyms) return defaultValue;

  for (const syn of synonyms) {
    // Exact match
    if (row[syn] !== undefined) return row[syn];
    // Case-insensitive match on row keys
    const foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === syn);
    if (foundKey !== undefined && row[foundKey] !== undefined) return row[foundKey];
  }
  return defaultValue;
}

// ----------------------------------------------------
// File Content Parsing (CSV/Excel)
// ----------------------------------------------------

export function splitCsvLine(line, delimiter) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCsv(text) {
  const rawLines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim().length > 0);
  if (rawLines.length < 2) return [];

  // Find the header line index
  let headerLineIndex = 0;
  let bestScore = -1;
  let bestDelimiter = ",";
  const delimiters = [",", ";", "\t"];

  for (let i = 0; i < Math.min(rawLines.length, 10); i++) {
    const line = rawLines[i];
    const lowerLine = line.toLowerCase();
    const hasKeywords = 
      lowerLine.includes("campanha") || 
      lowerLine.includes("campaign") || 
      lowerLine.includes("custo") || 
      lowerLine.includes("spend") || 
      lowerLine.includes("receita") || 
      lowerLine.includes("revenue") ||
      lowerLine.includes("cliques") ||
      lowerLine.includes("clicks") ||
      lowerLine.includes("dia") ||
      lowerLine.includes("dispositivo");

    const delimiterScores = delimiters.map((delimiter) => {
      const columns = splitCsvLine(line, delimiter);
      const filledColumns = columns.filter((col) => col.trim()).length;
      return { delimiter, columns: filledColumns, score: filledColumns + (hasKeywords ? 8 : 0) };
    });
    const bestForLine = delimiterScores.sort((a, b) => b.score - a.score)[0];

    if (bestForLine.score > bestScore && bestForLine.columns > 1) {
      bestScore = bestForLine.score;
      headerLineIndex = i;
      bestDelimiter = bestForLine.delimiter;
    }
  }

  const headerLine = rawLines[headerLineIndex];
  const delimiter = bestDelimiter;

  const headers = splitCsvLine(headerLine, delimiter).map((item) =>
    sanitizeMojibake(item.replace(/^["']|["']$/g, "").trim()).toLowerCase()
  );

  const dataLines = rawLines.slice(headerLineIndex + 1);

  return dataLines.map((line) => {
    const values = splitCsvLine(line, delimiter).map((item) =>
      item.replace(/^["']|["']$/g, "").trim()
    );
    return headers.reduce((row, header, index) => {
      row[header] = values[index];
      return row;
    }, {});
  });
}

export async function parseExcelFile(file) {
  const rawRows = await readXlsxFile(file);

  if (rawRows.length < 2) return [];

  let headerIndex = 0;
  let bestScore = -1;
  rawRows.slice(0, 12).forEach((row, index) => {
    const text = row.join(" ").toLowerCase();
    const filled = row.filter((cell) => String(cell).trim()).length;
    const keywords = ["campanha", "campaign", "custo", "spend", "receita", "revenue", "cliques", "clicks", "data", "dispositivo"]
      .filter((word) => text.includes(word)).length;
    const score = filled + keywords * 4;
    if (score > bestScore) {
      bestScore = score;
      headerIndex = index;
    }
  });

  const headers = rawRows[headerIndex].map((header, index) => {
    const value = sanitizeMojibake(String(header || "").trim()).toLowerCase();
    return value || `coluna_${index + 1}`;
  });

  return rawRows.slice(headerIndex + 1).map((row) =>
    headers.reduce((record, header, index) => {
      record[header] = row[index] ?? "";
      return record;
    }, {})
  );
}

// Helper to determine reference month from file name or rows
export function inferReferenceMonth(fileName, rows) {
  const name = fileName.toLowerCase();
  
  const rangeRegex = /(\d{4})[\.\-_](\d{2})[\.\-_](\d{2})-(\d{4})[\.\-_](\d{2})[\.\-_](\d{2})/;
  const rangeMatch = name.match(rangeRegex);
  if (rangeMatch) {
    return `${rangeMatch[4]}-${rangeMatch[5]}`;
  }

  // Match YYYY-MM-DD or YYYY.MM.DD or YYYY_MM_DD or YYYY-MM
  const dateRegex = /(\d{4})[\.\-_](\d{2})([\.\-_](\d{2}))?/;
  const match = name.match(dateRegex);
  if (match) {
    const year = match[1];
    const month = match[2];
    return `${year}-${month}`;
  }

  // Look for Portuguese month names in filename
  for (const [key, val] of Object.entries(MONTH_MAP_PT)) {
    if (name.includes(key)) {
      const currentYear = new Date().getFullYear();
      const monthPad = String(val + 1).padStart(2, "0");
      return `${currentYear}-${monthPad}`;
    }
  }

  // Look into rows
  for (const row of rows.slice(0, 100)) {
    const dateVal = getSemanticValue(row, "date");
    if (dateVal) {
      const d = parseDate(dateVal);
      if (d && !isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}`;
      }
    }
  }

  // Fallback to current month
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function isTotalOrMetadata(name) {
  if (!name) return true;
  const lowercaseName = String(name).toLowerCase().trim();
  return (
    lowercaseName === "total" ||
    lowercaseName.startsWith("total:") ||
    lowercaseName.startsWith("total ") ||
    lowercaseName === "total geral" ||
    lowercaseName === "resumo" ||
    lowercaseName.startsWith("período:") ||
    lowercaseName.startsWith("period:") ||
    lowercaseName.includes("filtros aplicados") ||
    lowercaseName.includes("relatório gerado") ||
    lowercaseName.includes("gerado em")
  );
}

// ----------------------------------------------------
// Master ETL Processing Function
// ----------------------------------------------------

export async function processUploadFile(file) {
  let rows = [];
  const fileName = file.name;

  if (fileName.toLowerCase().endsWith(".csv")) {
    const text = await file.text();
    rows = parseCsv(text);
  } else if (fileName.toLowerCase().endsWith(".xlsx") || fileName.toLowerCase().endsWith(".xls")) {
    rows = await parseExcelFile(file);
  } else {
    throw new Error("Formato de arquivo não suportado (apenas CSV, XLS e XLSX).");
  }

  if (rows.length === 0) {
    throw new Error("Arquivo vazio ou sem dados legíveis.");
  }

  const rowKeys = Object.keys(rows[0]);
  const lowerFileName = fileName.toLowerCase();
  const platform = detectPlatform(fileName, rowKeys, rows);
  let dataset_type = detectDataset(platform, rowKeys);
  if (lowerFileName.includes("campanha")) {
    dataset_type = platform === "meta" ? "meta_campaign_performance" : "campaign_performance";
  }
  if (lowerFileName.includes("dispositivo")) dataset_type = "device_performance";
  if (lowerFileName.includes("palavras-chave") || lowerFileName.includes("palavra-chave")) dataset_type = "search_keywords";
  if (lowerFileName.includes("pesquisa")) dataset_type = "search_terms";
  if (lowerFileName.includes("rede")) dataset_type = "network_performance";
  if (lowerFileName.includes("sexo") || lowerFileName.includes("idade") || lowerFileName.includes("demogr")) dataset_type = "demographics_gender_age";
  if (lowerFileName.includes("dia_e_hora") || lowerFileName.includes("dia-hora")) dataset_type = "weekday_hour_performance";
  if (lowerFileName.includes("série_temporal") || lowerFileName.includes("serie_temporal")) dataset_type = "daily_time_series";
  const reference_month = inferReferenceMonth(fileName, rows);
  const reference_label = `${MONTHS_PT[parseInt(reference_month.split("-")[1], 10) - 1]}/${reference_month.split("-")[0]}`;

  // Simple string-based content hash for fingerprinting
  const fileStringSample = JSON.stringify(rows.slice(0, 50));
  let file_hash = 0;
  for (let i = 0; i < fileStringSample.length; i++) {
    file_hash = (file_hash << 5) - file_hash + fileStringSample.charCodeAt(i);
    file_hash |= 0;
  }
  file_hash = Math.abs(file_hash).toString(16);

  const normalizedRows = rows
    .filter(row => {
      // Filter out total sum rows and metadata headers
      const campName = getSemanticValue(row, "campaign_name");
      const deviceName = getSemanticValue(row, "device");
      const dayName = getSemanticValue(row, "date");
      const searchName = getSemanticValue(row, "search_term");
      const keywordName = getSemanticValue(row, "keyword");
      const hasAnyMetric =
        parseFormattedFloat(getSemanticValue(row, "spend", 0)) > 0 ||
        parseFormattedFloat(getSemanticValue(row, "clicks", 0)) > 0 ||
        parseFormattedFloat(getSemanticValue(row, "impressions", 0)) > 0 ||
        parseFormattedFloat(getSemanticValue(row, "conversions", 0)) > 0 ||
        parseFormattedFloat(getSemanticValue(row, "revenue", 0)) > 0;
      
      const primaryKey = campName || deviceName || dayName || searchName || keywordName || "";
      return (primaryKey || hasAnyMetric) && !isTotalOrMetadata(primaryKey || "linha com métrica");
    })
    .map((row, idx) => {
      // Map row keys to Universal Schema
      const campName = getSemanticValue(row, "campaign_name");
      const deviceName = getSemanticValue(row, "device");
      const genderName = getSemanticValue(row, "gender");
      const ageName = getSemanticValue(row, "age_range");
      const keyName = getSemanticValue(row, "keyword");
      const termName = getSemanticValue(row, "search_term");
      const netName = getSemanticValue(row, "network");
      
      const dateVal = getSemanticValue(row, "date");
      const hourVal = getSemanticValue(row, "hour");

      // Set fallback if date is missing
      const enrichedDate = applyTemporalIntelligence(dateVal || `${reference_month}-01`);

      // Parsing numeric values safely
      const spend = parseFormattedFloat(getSemanticValue(row, "spend", 0));
      const clicks = Math.round(parseFormattedFloat(getSemanticValue(row, "clicks", 0)));
      const impressions = Math.round(parseFormattedFloat(getSemanticValue(row, "impressions", 0)));
      const conversions = Math.round(parseFormattedFloat(getSemanticValue(row, "conversions", 0)));
      const leads = Math.round(parseFormattedFloat(getSemanticValue(row, "conversions", 0))); // map leads to conversions as fallback
      const reach = Math.round(parseFormattedFloat(getSemanticValue(row, "reach", 0)));
      const frequency = parseFormattedFloat(getSemanticValue(row, "frequency", 0));
      const revenue = parseFormattedFloat(getSemanticValue(row, "revenue", 0));

      // Re-calculate standard metrics safely to avoid trusting raw sheet calculations
      const ctr = impressions > 0 ? clicks / impressions : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
      const cpl = leads > 0 ? spend / leads : 0;
      const cac = conversions > 0 ? spend / conversions : 0;
      const roas = spend > 0 ? revenue / spend : 0;

      return {
        id: `row_${reference_month}_${platform}_${idx}_${Date.now()}`,
        platform,
        dataset_type,
        campaign_name: sanitizeMojibake(campName) || "Campanha Geral",
        device: sanitizeMojibake(deviceName) || null,
        gender: sanitizeMojibake(genderName) || null,
        age_range: sanitizeMojibake(ageName) || null,
        keyword: sanitizeMojibake(keyName) || null,
        search_term: sanitizeMojibake(termName) || null,
        network: sanitizeMojibake(netName) || null,
        
        // Time intelligence attributes
        date: enrichedDate.date,
        day: enrichedDate.day,
        week: enrichedDate.week,
        month: enrichedDate.month,
        month_name: enrichedDate.month_name,
        quarter: enrichedDate.quarter,
        year: enrichedDate.year,
        year_month: enrichedDate.year_month,
        reference_month,
        reference_label,
        hour: hourVal !== undefined ? parseInt(String(hourVal).match(/\d+/)?.[0] || "0", 10) : null,

        // Core Metrics (resilient default is 0 or null)
        spend,
        clicks,
        impressions,
        conversions,
        leads,
        reach: reach || null,
        frequency: frequency || null,
        revenue,

        // Calulated metrics
        ctr,
        cpc,
        cpm,
        cpl,
        cac,
        roas,
        
        status: sanitizeMojibake(getSemanticValue(row, "status")) || "Ativo",
        raw_file_name: fileName,
        file_hash,
        created_at: new Date().toISOString()
      };
    });

  return {
    metadata: {
      platform,
      dataset_type,
      reference_month,
      reference_label,
      raw_file_name: fileName,
      file_hash,
      count: normalizedRows.length
    },
    rows: normalizedRows
  };
}
