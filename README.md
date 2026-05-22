# Orbit BI

Plataforma SaaS de Business Intelligence com IA para análise executiva de mídia paga em Google Ads e Meta Ads.

Toda a experiência foi criada em português do Brasil, incluindo dashboards, KPIs, insights, chat de IA, exportações e relatórios.

## O que o app entrega

- Dashboard executivo premium em dark mode
- KPIs animados de mídia paga
- Comparação entre Google Ads e Meta Ads
- Ranking inteligente de campanhas
- Upload de CSV, XLSX, PDFs e imagens
- Chat de IA para análise estratégica em PT-BR
- Exportação de planilha para Downloads
- Geração de PDF executivo para Downloads
- Interface responsiva e pronta para demonstração

## Como abrir

Abra o arquivo `index.html` no navegador.

Para testar como servidor local:

```bash
python3 -m http.server 4173
```

Depois acesse:

```text
http://127.0.0.1:4173/
```

## Estrutura

```text
.
├── index.html
├── styles.css
├── app.js
├── README.md
└── .gitignore
```

## Próximos passos técnicos

- Conectar OpenAI multimodal para OCR e análise real de imagens, PDFs e planilhas
- Adicionar Supabase para autenticação, banco de dados e armazenamento de arquivos
- Criar pipeline de normalização para exports de Google Ads e Meta Ads
- Gerar relatórios PDF com gráficos dinâmicos do dataset real
- Transformar a base estática em app React/Next.js quando o produto evoluir

