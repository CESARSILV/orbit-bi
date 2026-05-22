-- 1. Criar tabela de campanhas
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    nome TEXT NOT NULL,
    plataforma TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'google' ou 'meta'
    investimento NUMERIC DEFAULT 0 NOT NULL,
    receita NUMERIC DEFAULT 0 NOT NULL,
    roas NUMERIC DEFAULT 0 NOT NULL,
    cpa NUMERIC DEFAULT 0 NOT NULL,
    ctr NUMERIC DEFAULT 0 NOT NULL,
    cpc NUMERIC DEFAULT 0 NOT NULL,
    conversoes INTEGER DEFAULT 0 NOT NULL,
    status TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Criar tabela de métricas históricas
CREATE TABLE IF NOT EXISTS public.historical_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    mes TEXT NOT NULL, -- 'Jan', 'Fev', etc.
    receita NUMERIC DEFAULT 0 NOT NULL,
    investimento NUMERIC DEFAULT 0 NOT NULL,
    roas NUMERIC DEFAULT 0 NOT NULL,
    cpa NUMERIC DEFAULT 0 NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_metrics ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso (Select/Insert/Update/Delete para o usuário autenticado)
CREATE POLICY "Permitir leitura apenas dos próprios dados" ON public.campaigns
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Permitir inserção dos próprios dados" ON public.campaigns
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir atualização dos próprios dados" ON public.campaigns
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir exclusão dos próprios dados" ON public.campaigns
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Políticas para histórico
CREATE POLICY "Permitir leitura do histórico" ON public.historical_metrics
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Permitir escrita do histórico" ON public.historical_metrics
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. Inserir dados padrão de teste para novos usuários (Seed Script - OPCIONAL)
-- Nota: O seed pode ser feito via código JavaScript se o banco estiver vazio.
