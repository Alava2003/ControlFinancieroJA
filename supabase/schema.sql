-- ============================================================
-- Control Financiero JA - Schema SQL
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.accounts (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('banco', 'efectivo')),
  balance       NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: accounts
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounts: select own" ON public.accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "accounts: insert own" ON public.accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "accounts: update own" ON public.accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "accounts: delete own" ON public.accounts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABLA: transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id    UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('ingreso', 'gasto', 'transferencia')),
  amount        NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  category      TEXT,
  description   TEXT,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Para transferencias: cuenta destino
  to_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions: select own" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "transactions: insert own" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions: update own" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "transactions: delete own" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABLA: loans (Préstamos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.loans (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debtor_name       TEXT NOT NULL,
  amount            NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date              DATE NOT NULL DEFAULT CURRENT_DATE,
  status            TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'pagado')),
  origin_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  description       TEXT,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: loans
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loans: select own" ON public.loans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "loans: insert own" ON public.loans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "loans: update own" ON public.loans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "loans: delete own" ON public.loans
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- FUNCIÓN: Crear cuentas por defecto al registrar usuario
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.accounts (user_id, name, type, balance)
  VALUES
    (NEW.id, 'Banco Guayaquil', 'banco', 0.00),
    (NEW.id, 'Banco Pichincha', 'banco', 0.00),
    (NEW.id, 'Efectivo',        'efectivo', 0.00);
  RETURN NEW;
END;
$$;

-- Trigger: ejecutar al crear usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
