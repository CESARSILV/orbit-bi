# DOit BI

SaaS premium de Business Intelligence com IA para análise executiva de performance em Google Ads e Meta Ads.

Toda a experiência do produto foi pensada para português do Brasil: interface, filtros, KPIs, mensagens, insights, chat, relatórios e exportações.

## Recursos principais

- Painel executivo em Next.js com visual premium em modo escuro.
- Envio de CSV, XLS e XLSX com ETL local para exportações de Google Ads e Meta Ads.
- Anexos de PDF e imagens para análise pelo chat de IA.
- Banco local em `localStorage` com deduplicação de arquivos.
- Supabase opcional para autenticação e sincronização de campanhas.
- Chat com IA usando OpenAI e Gemini em modo automático.
- Fallback local quando nenhuma chave de IA estiver configurada.
- Filtros por plataforma, mês, campanha, dispositivo, gênero, idade, rede, palavra-chave e termo pesquisado.
- KPIs de investimento, cliques, impressões, conversões, leads, CTR, CPC, CPM, CPL, ROAS, CAC e alcance.
- Gráficos de evolução, distribuição por plataforma, dispositivo, horário, região, palavras-chave e termos de busca.
- Exportação CSV consolidada para a pasta de downloads.
- Geração de PDF executivo para a pasta Downloads.
- Rota `/apresentacao` com slides executivos imprimíveis.

## Como rodar

```bash
npm install
npm run dev
```

Abra:

```text
http://localhost:3000
```

Se a porta `3000` estiver ocupada, o Next.js mostrará outra porta disponível.

## Configuração de IA

Copie `.env.local.example` para `.env.local` e configure pelo menos uma chave:

```bash
OPENAI_API_KEY=sua-chave-openai
GEMINI_API_KEY=sua-chave-gemini
AI_PROVIDER=auto
```

`AI_PROVIDER=auto` tenta OpenAI primeiro quando `OPENAI_API_KEY` existe e usa Gemini como fallback. Também é possível forçar:

```bash
AI_PROVIDER=openai
AI_PROVIDER=gemini
```

Modelos padrão:

```bash
OPENAI_MODEL=gpt-4.1-mini
GEMINI_MODEL=gemini-2.5-flash
```

## Supabase opcional

Para ativar autenticação e sincronização:

```bash
NEXT_PUBLIC_SUPABASE_URL=sua-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
```

Execute o conteúdo de `supabase-schema.sql` no SQL Editor do Supabase.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Estrutura

```text
src/app/page.js              # Painel principal
src/app/api/chat/route.js    # Chat IA com OpenAI/Gemini
src/app/api/report/route.js  # Relatório executivo por IA
src/lib/ai-providers.js      # Camada única de provedores de IA
src/lib/etl.js               # Parser CSV/XLS/XLSX e normalização
src/lib/db.js                # Banco local, deduplicação e Supabase sync
src/components/              # Componentes visuais do dashboard
static-demo/                 # Primeira versão estática preservada
```

## Observação

O app funciona sem chaves externas em modo demonstrativo. Para IA real, configure OpenAI ou Gemini no `.env.local`.
