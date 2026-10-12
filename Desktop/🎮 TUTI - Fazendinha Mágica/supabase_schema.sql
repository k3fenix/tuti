-- ==============================================================================
-- TUTI - Fazendinha Mágica 🌾✨
-- Script SQL Completo para Supabase (Database Schema, RLS, Triggers & Realtime)
-- Execute este script no SQL Editor do seu Dashboard Supabase.
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABELA: profiles (Perfil do Jogador, Moedas, XP, Nível e Avatar)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL DEFAULT 'Tuti',
  avatar_url TEXT DEFAULT '🧑‍🌾',
  avatar_hat TEXT DEFAULT '🧢',
  avatar_body TEXT DEFAULT '👕',
  avatar_boots TEXT DEFAULT '🥾',
  coins INTEGER NOT NULL DEFAULT 100 CHECK (coins >= 0),
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  total_harvests INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ler todos os perfis" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Usuários podem atualizar seus próprios perfis" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem inserir seu próprio perfil" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- ==============================================================================
-- 3. TABELA: shop_items (Catálogo de Itens da Loja)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.shop_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('clothes', 'boots', 'tools')),
  price INTEGER NOT NULL DEFAULT 0,
  rarity TEXT NOT NULL DEFAULT 'Comum' CHECK (rarity IN ('Comum', 'Raro', 'Lendário')),
  icon TEXT NOT NULL,
  description TEXT,
  stats JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catálogo da loja visível a todos" 
  ON public.shop_items FOR SELECT 
  USING (true);

-- Carga inicial dos itens da loja (Roupas, Calçados e Ferramentas)
INSERT INTO public.shop_items (id, name, category, price, rarity, icon, description) VALUES
  ('c_classic', 'Macacão Clássico', 'clothes', 0, 'Comum', '👕', 'Roupa clássica do pequeno fazendeiro'),
  ('c_strawhat', 'Chapéu de Palha', 'clothes', 30, 'Comum', '👒', 'Protege do sol forte na horta'),
  ('c_cowboy', 'Traje Boiadeiro', 'clothes', 75, 'Raro', '🤠', 'Para quem ama cavalgar pelas colinas'),
  ('c_denim', 'Jardineira Jeans', 'clothes', 60, 'Comum', '👖', 'Resistente contra lama e folhas'),
  ('c_apron', 'Avental Floral', 'clothes', 90, 'Raro', '🌸', 'Lindo avental para cuidar das flores'),
  ('c_crown', 'Coroa da Fazenda', 'clothes', 250, 'Lendário', '👑', 'Feito para os mestres da colheita'),
  ('c_frog', 'Touquinha Sapinho', 'clothes', 80, 'Raro', '🐸', 'Super fofo e impermeável'),
  ('c_bear', 'Capuz Ursinho', 'clothes', 110, 'Raro', '🐻', 'Aconchegante para as noites frias'),
  ('c_chef', 'Chapéu Mestre-Cuca', 'clothes', 95, 'Raro', '👨‍🍳', 'Para cozinhar vegetais frescos'),
  ('c_wizard', 'Mago dos Campos', 'clothes', 300, 'Lendário', '🧙‍♂️', 'Canaliza a energia mágica da terra'),
  ('b_leather', 'Botas de Couro', 'boots', 0, 'Comum', '🥾', 'Botas básicas confortáveis'),
  ('b_yellow_rain', 'Galochas Amarelas', 'boots', 40, 'Comum', '🟨', 'Perfeitas para pular em poças d água'),
  ('b_sneakers', 'Tênis Esportivo', 'boots', 70, 'Raro', '👟', 'Mais agilidade nas fases de plataforma'),
  ('b_red_boots', 'Galochas Vermelhas', 'boots', 55, 'Comum', '👠', 'Estilosas e resistentes à lama'),
  ('b_golden_boots', 'Botas Douradas', 'boots', 200, 'Lendário', '✨', 'Reluzem com o brilho do ouro puro'),
  ('b_roller', 'Patins Silvestres', 'boots', 120, 'Raro', '🛼', 'Deslize com estilo pela fazenda'),
  ('t_hoe', 'Enxadinha de Madeira', 'tools', 0, 'Comum', '⛏️', 'Ferramenta essencial para arar o solo'),
  ('t_can', 'Regador Encantado', 'tools', 80, 'Raro', '🫗', 'Espalha gotas de orvalho cristalino'),
  ('t_basket', 'Cesta de Vime Trançada', 'tools', 65, 'Comum', '🧺', 'Capacidade extra para colheitas fartas'),
  ('t_shears', 'Tesoura de Tosa Macia', 'tools', 90, 'Raro', '✂️', 'Tosa ovelhas sem machucá-las'),
  ('t_bell', 'Sininho de Pasto', 'tools', 110, 'Raro', '🔔', 'Chama todos os bichinhos com doçura'),
  ('t_crystal_hoe', 'Enxada de Diamante', 'tools', 350, 'Lendário', '💎', 'A ferramenta suprema dos fazendeiros')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 4. TABELA: inventory (Itens Comprados e Equipados pelo Jogador)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  equipped BOOLEAN NOT NULL DEFAULT false,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, item_id)
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários acessam seu próprio inventário" 
  ON public.inventory FOR ALL 
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 5. TABELA: farm_plots (Canteiros da Horta 6x6 e Crescimento em Tempo Real)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.farm_plots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plot_index INTEGER NOT NULL CHECK (plot_index >= 0 AND plot_index < 36),
  plant_type TEXT CHECK (plant_type IN ('carrot', 'corn', 'strawberry', 'pumpkin', 'wheat', 'sunflower')),
  planted_at TIMESTAMPTZ,
  watered_at TIMESTAMPTZ,
  fertilized BOOLEAN NOT NULL DEFAULT false,
  stage INTEGER NOT NULL DEFAULT 0 CHECK (stage >= 0 AND stage <= 3),
  UNIQUE (user_id, plot_index)
);

ALTER TABLE public.farm_plots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam seus próprios canteiros" 
  ON public.farm_plots FOR ALL 
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 6. TABELA: animals (Curral, Fome, Sede, Felicidade e Produção Diária)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.animals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('chicken', 'cow', 'sheep', 'horse')),
  name TEXT NOT NULL,
  hunger INTEGER NOT NULL DEFAULT 80 CHECK (hunger >= 0 AND hunger <= 100),
  thirst INTEGER NOT NULL DEFAULT 80 CHECK (thirst >= 0 AND thirst <= 100),
  happiness INTEGER NOT NULL DEFAULT 90 CHECK (happiness >= 0 AND happiness <= 100),
  product_ready BOOLEAN NOT NULL DEFAULT false,
  last_fed TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  last_watered TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  last_petted TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, type)
);

ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam seus próprios animais" 
  ON public.animals FOR ALL 
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 7. TABELA: levels_progress (Progresso nas 5 Fases de Plataforma)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.levels_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level_id INTEGER NOT NULL CHECK (level_id >= 1 AND level_id <= 5),
  unlocked BOOLEAN NOT NULL DEFAULT false,
  stars INTEGER NOT NULL DEFAULT 0 CHECK (stars >= 0 AND stars <= 3),
  best_time INTEGER, -- em segundos
  coins_collected INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, level_id)
);

ALTER TABLE public.levels_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam progresso de fases" 
  ON public.levels_progress FOR ALL 
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 8. TABELA: achievements (Conquistas e Medalhas Desbloqueadas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, code)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários visualizam suas próprias conquistas" 
  ON public.achievements FOR ALL 
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 9. TRIGGER AUTOMÁTICO: Cria Perfil e 36 Canteiros ao cadastrar novo usuário
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Cria Perfil Inicial
  INSERT INTO public.profiles (id, username, coins, xp, level)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'Tuti'), 100, 0, 1);

  -- 2. Cria os 36 Canteiros (Grid 6x6)
  FOR i IN 0..35 LOOP
    INSERT INTO public.farm_plots (user_id, plot_index, stage)
    VALUES (NEW.id, i, 0);
  END LOOP;

  -- 3. Cria os 4 Animais Iniciais
  INSERT INTO public.animals (user_id, type, name) VALUES
    (NEW.id, 'chicken', 'Pipoca'),
    (NEW.id, 'cow', 'Mimosa'),
    (NEW.id, 'sheep', 'Algodão'),
    (NEW.id, 'horse', 'Trovão');

  -- 4. Cria as 5 Fases de Plataforma (Fase 1 liberada)
  INSERT INTO public.levels_progress (user_id, level_id, unlocked) VALUES
    (NEW.id, 1, true),
    (NEW.id, 2, false),
    (NEW.id, 3, false),
    (NEW.id, 4, false),
    (NEW.id, 5, false);

  -- 5. Equipamentos iniciais no inventário
  INSERT INTO public.inventory (user_id, item_id, equipped) VALUES
    (NEW.id, 'c_classic', true),
    (NEW.id, 'b_leather', true),
    (NEW.id, 't_hoe', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparador no Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_setup();

-- ==============================================================================
-- 10. HABILITAR SUPABASE REALTIME (Para cultivo e animais em tempo real)
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.farm_plots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.animals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
