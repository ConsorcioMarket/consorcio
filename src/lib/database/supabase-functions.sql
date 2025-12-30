-- ============================================
-- CONSÓRCIO MARKET - SUPABASE FUNCTIONS & TRIGGERS
-- ============================================
--
-- Run this SQL in Supabase Dashboard > SQL Editor
-- This file contains: triggers, storage buckets, financial functions, check constraints
--
-- Related files:
-- - rls-policies.sql: Row Level Security policies
-- - schema.prisma: Database schema (managed by Prisma)
--
-- ============================================

-- ============================================
-- SECTION 1: CHECK CONSTRAINTS
-- Data integrity for financial values
-- ============================================

DO $$
BEGIN
  -- Constraint: credit_amount must be > 0
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_credit_amount_positive'
  ) THEN
    ALTER TABLE public.cotas
    ADD CONSTRAINT chk_credit_amount_positive
    CHECK (credit_amount > 0);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  -- Constraint: outstanding_balance must be <= credit_amount
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_balance_lte_credit'
  ) THEN
    ALTER TABLE public.cotas
    ADD CONSTRAINT chk_balance_lte_credit
    CHECK (outstanding_balance <= credit_amount);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  -- Constraint: entry_amount must be >= 0
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_entry_amount_positive'
  ) THEN
    ALTER TABLE public.cotas
    ADD CONSTRAINT chk_entry_amount_positive
    CHECK (entry_amount >= 0);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  -- Constraint: n_installments must be > 0
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_n_installments_positive'
  ) THEN
    ALTER TABLE public.cotas
    ADD CONSTRAINT chk_n_installments_positive
    CHECK (n_installments > 0);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  -- Constraint: installment_value must be > 0
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_installment_value_positive'
  ) THEN
    ALTER TABLE public.cotas
    ADD CONSTRAINT chk_installment_value_positive
    CHECK (installment_value > 0);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  -- Constraint: entry_percentage must be between 0 and 100
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_entry_percentage_range'
  ) THEN
    ALTER TABLE public.cotas
    ADD CONSTRAINT chk_entry_percentage_range
    CHECK (entry_percentage >= 0 AND entry_percentage <= 100);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- SECTION 2: FINANCIAL FUNCTIONS
-- Calculate monthly rate (RATE function like Excel)
-- ============================================

-- Uses Newton-Raphson iteration to solve for interest rate
-- Formula: PV = PMT * [(1 - (1+r)^-n) / r]
-- Where: PV = outstanding_balance, PMT = installment_value, n = n_installments

CREATE OR REPLACE FUNCTION public.calculate_monthly_rate(
  p_outstanding_balance NUMERIC,
  p_installment_value NUMERIC,
  p_n_installments INTEGER,
  p_max_iterations INTEGER DEFAULT 100,
  p_tolerance NUMERIC DEFAULT 0.0000001
)
RETURNS NUMERIC AS $$
DECLARE
  v_rate NUMERIC := 0.01;  -- Initial guess: 1%
  v_pv NUMERIC;
  v_fpv NUMERIC;
  v_dfpv NUMERIC;
  v_new_rate NUMERIC;
  v_iteration INTEGER := 0;
BEGIN
  -- Handle edge cases
  IF p_outstanding_balance <= 0 OR p_installment_value <= 0 OR p_n_installments <= 0 THEN
    RETURN NULL;
  END IF;

  -- If installment * periods equals balance exactly, rate is 0
  IF p_installment_value * p_n_installments = p_outstanding_balance THEN
    RETURN 0;
  END IF;

  -- Newton-Raphson iteration
  WHILE v_iteration < p_max_iterations LOOP
    IF v_rate <= 0 THEN
      v_rate := 0.001;  -- Avoid division by zero or negative rates
    END IF;

    -- Calculate present value at current rate guess
    v_pv := p_installment_value * (1 - POWER(1 + v_rate, -p_n_installments)) / v_rate;

    -- f(r) = outstanding_balance - calculated_pv
    v_fpv := p_outstanding_balance - v_pv;

    -- f'(r) = derivative of f with respect to r
    v_dfpv := p_installment_value * (
      (POWER(1 + v_rate, -p_n_installments) - 1) / (v_rate * v_rate) +
      p_n_installments * POWER(1 + v_rate, -p_n_installments - 1) / v_rate
    );

    -- Newton-Raphson step
    IF ABS(v_dfpv) < p_tolerance THEN
      EXIT;  -- Avoid division by very small number
    END IF;

    v_new_rate := v_rate + v_fpv / v_dfpv;

    -- Check for convergence
    IF ABS(v_new_rate - v_rate) < p_tolerance THEN
      RETURN ROUND(v_new_rate * 100, 6);  -- Return as percentage
    END IF;

    v_rate := v_new_rate;
    v_iteration := v_iteration + 1;

    -- Keep rate in reasonable bounds
    IF v_rate > 1 THEN
      v_rate := 0.5;  -- Reset if diverging
    ELSIF v_rate < -0.99 THEN
      v_rate := 0.001;
    END IF;
  END LOOP;

  -- Return best estimate if max iterations reached
  RETURN ROUND(v_rate * 100, 6);  -- Return as percentage
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- SECTION 3: AUTO-CALCULATE TRIGGERS
-- Automatically calculate entry_percentage and monthly_rate
-- ============================================

-- Auto-calculate entry_percentage
CREATE OR REPLACE FUNCTION public.auto_calculate_entry_percentage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.credit_amount > 0 AND NEW.entry_amount IS NOT NULL THEN
    NEW.entry_percentage := ROUND((NEW.entry_amount / NEW.credit_amount) * 100, 2);
  ELSE
    NEW.entry_percentage := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_entry_percentage ON public.cotas;
CREATE TRIGGER calculate_entry_percentage
  BEFORE INSERT OR UPDATE OF credit_amount, entry_amount ON public.cotas
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_calculate_entry_percentage();

-- Auto-calculate monthly_rate
CREATE OR REPLACE FUNCTION public.auto_calculate_monthly_rate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.outstanding_balance > 0 AND NEW.installment_value > 0 AND NEW.n_installments > 0 THEN
    NEW.monthly_rate := public.calculate_monthly_rate(
      NEW.outstanding_balance,
      NEW.installment_value,
      NEW.n_installments
    );
  ELSE
    NEW.monthly_rate := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_monthly_rate ON public.cotas;
CREATE TRIGGER calculate_monthly_rate
  BEFORE INSERT OR UPDATE OF outstanding_balance, installment_value, n_installments ON public.cotas
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_calculate_monthly_rate();

-- ============================================
-- SECTION 4: BUSINESS LOGIC TRIGGERS
-- ============================================

-- 4.1 Prevent self-purchase (users can't buy their own cotas)
CREATE OR REPLACE FUNCTION public.check_not_own_cota()
RETURNS TRIGGER AS $$
DECLARE
  cota_seller_id TEXT;
BEGIN
  SELECT seller_id INTO cota_seller_id
  FROM public.cotas
  WHERE id = NEW.cota_id;

  IF NEW.buyer_pf_id = cota_seller_id THEN
    RAISE EXCEPTION 'Você não pode comprar sua própria cota (You cannot buy your own cota)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_self_purchase ON public.proposals;
CREATE TRIGGER prevent_self_purchase
  BEFORE INSERT ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.check_not_own_cota();

-- 4.2 Validate rejection reason is required when rejecting
CREATE OR REPLACE FUNCTION public.validate_rejection_reason()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'REJECTED' AND (NEW.rejection_reason IS NULL OR NEW.rejection_reason = '') THEN
    RAISE EXCEPTION 'Motivo da rejeição é obrigatório (Rejection reason is required)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_proposal_rejection ON public.proposals;
CREATE TRIGGER validate_proposal_rejection
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  WHEN (NEW.status = 'REJECTED')
  EXECUTE FUNCTION public.validate_rejection_reason();

-- 4.3 Validate proposal status transitions
CREATE OR REPLACE FUNCTION public.validate_proposal_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_valid_transitions TEXT[][];
  v_allowed TEXT[];
  v_is_valid BOOLEAN := FALSE;
  i INTEGER;
BEGIN
  -- Define valid transitions: [from_status, allowed_to_statuses...]
  v_valid_transitions := ARRAY[
    ARRAY['UNDER_REVIEW', 'PRE_APPROVED,REJECTED'],
    ARRAY['PRE_APPROVED', 'APPROVED,REJECTED,UNDER_REVIEW'],
    ARRAY['APPROVED', 'TRANSFER_STARTED,REJECTED'],
    ARRAY['TRANSFER_STARTED', 'COMPLETED,REJECTED'],
    ARRAY['COMPLETED', ''],  -- No transitions allowed from COMPLETED
    ARRAY['REJECTED', 'UNDER_REVIEW']  -- Can reopen rejected proposals
  ];

  -- Find valid transitions for current status
  FOR i IN 1..array_length(v_valid_transitions, 1) LOOP
    IF v_valid_transitions[i][1] = OLD.status::TEXT THEN
      v_allowed := string_to_array(v_valid_transitions[i][2], ',');
      EXIT;
    END IF;
  END LOOP;

  -- Check if new status is in allowed list
  IF v_allowed IS NOT NULL AND array_length(v_allowed, 1) > 0 THEN
    IF NEW.status::TEXT = ANY(v_allowed) THEN
      v_is_valid := TRUE;
    END IF;
  END IF;

  IF NOT v_is_valid THEN
    RAISE EXCEPTION 'Transição de status inválida: % → % (Invalid status transition)',
      OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_status_transition ON public.proposals;
CREATE TRIGGER validate_status_transition
  BEFORE UPDATE OF status ON public.proposals
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.validate_proposal_status_transition();

-- ============================================
-- SECTION 5: AUDIT TRAIL TRIGGERS
-- Log changes to proposal_history and cota_history
-- ============================================

-- 5.1 Log proposal status changes
CREATE OR REPLACE FUNCTION public.log_proposal_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.proposal_history (
      id,
      proposal_id,
      old_status,
      new_status,
      changed_by,
      notes,
      changed_at
    ) VALUES (
      gen_random_uuid(),
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()::text,  -- Will be NULL if called from service_role
      NULL,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_proposal_status_change ON public.proposals;
CREATE TRIGGER log_proposal_status_change
  AFTER UPDATE ON public.proposals
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.log_proposal_history();

-- 5.2 Log cota value changes
CREATE OR REPLACE FUNCTION public.log_cota_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Log credit_amount changes
  IF OLD.credit_amount IS DISTINCT FROM NEW.credit_amount THEN
    INSERT INTO public.cota_history (id, cota_id, field_changed, old_value, new_value, changed_by, changed_at)
    VALUES (gen_random_uuid(), NEW.id, 'credit_amount', OLD.credit_amount::text, NEW.credit_amount::text, auth.uid()::text, NOW());
  END IF;

  -- Log outstanding_balance changes
  IF OLD.outstanding_balance IS DISTINCT FROM NEW.outstanding_balance THEN
    INSERT INTO public.cota_history (id, cota_id, field_changed, old_value, new_value, changed_by, changed_at)
    VALUES (gen_random_uuid(), NEW.id, 'outstanding_balance', OLD.outstanding_balance::text, NEW.outstanding_balance::text, auth.uid()::text, NOW());
  END IF;

  -- Log n_installments changes
  IF OLD.n_installments IS DISTINCT FROM NEW.n_installments THEN
    INSERT INTO public.cota_history (id, cota_id, field_changed, old_value, new_value, changed_by, changed_at)
    VALUES (gen_random_uuid(), NEW.id, 'n_installments', OLD.n_installments::text, NEW.n_installments::text, auth.uid()::text, NOW());
  END IF;

  -- Log installment_value changes
  IF OLD.installment_value IS DISTINCT FROM NEW.installment_value THEN
    INSERT INTO public.cota_history (id, cota_id, field_changed, old_value, new_value, changed_by, changed_at)
    VALUES (gen_random_uuid(), NEW.id, 'installment_value', OLD.installment_value::text, NEW.installment_value::text, auth.uid()::text, NOW());
  END IF;

  -- Log entry_amount changes
  IF OLD.entry_amount IS DISTINCT FROM NEW.entry_amount THEN
    INSERT INTO public.cota_history (id, cota_id, field_changed, old_value, new_value, changed_by, changed_at)
    VALUES (gen_random_uuid(), NEW.id, 'entry_amount', OLD.entry_amount::text, NEW.entry_amount::text, auth.uid()::text, NOW());
  END IF;

  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.cota_history (id, cota_id, field_changed, old_value, new_value, changed_by, changed_at)
    VALUES (gen_random_uuid(), NEW.id, 'status', OLD.status::text, NEW.status::text, auth.uid()::text, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_cota_changes ON public.cotas;
CREATE TRIGGER log_cota_changes
  AFTER UPDATE ON public.cotas
  FOR EACH ROW
  EXECUTE FUNCTION public.log_cota_history();

-- 5.3 Sync cota status from proposal status changes
CREATE OR REPLACE FUNCTION public.sync_cota_status_from_proposal()
RETURNS TRIGGER AS $$
BEGIN
  -- When proposal is PRE_APPROVED, set cota to RESERVED
  IF NEW.status = 'PRE_APPROVED' AND OLD.status = 'UNDER_REVIEW' THEN
    UPDATE public.cotas
    SET status = 'RESERVED'
    WHERE id = NEW.cota_id
    AND status = 'AVAILABLE';
  END IF;

  -- When proposal is COMPLETED, set cota to SOLD
  IF NEW.status = 'COMPLETED' AND OLD.status = 'TRANSFER_STARTED' THEN
    UPDATE public.cotas
    SET status = 'SOLD'
    WHERE id = NEW.cota_id;
  END IF;

  -- When proposal is REJECTED, check if cota should go back to AVAILABLE
  IF NEW.status = 'REJECTED' THEN
    UPDATE public.cotas
    SET status = 'AVAILABLE'
    WHERE id = NEW.cota_id
    AND status = 'RESERVED'
    AND NOT EXISTS (
      SELECT 1 FROM public.proposals
      WHERE cota_id = NEW.cota_id
      AND id != NEW.id
      AND status IN ('UNDER_REVIEW', 'PRE_APPROVED', 'APPROVED', 'TRANSFER_STARTED')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_cota_status ON public.proposals;
CREATE TRIGGER sync_cota_status
  AFTER UPDATE ON public.proposals
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.sync_cota_status_from_proposal();

-- ============================================
-- SECTION 6: STORAGE BUCKETS & POLICIES
-- Supabase Storage for document uploads
-- ============================================
--
-- IMPORTANT: Run rls-policies.sql BEFORE this section
-- (storage policies use public.is_admin() function)
--

-- Create storage buckets (10MB limit, PDF and images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('documents-pf', 'documents-pf', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('documents-pj', 'documents-pj', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('documents-cota', 'documents-cota', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES: documents-pf
-- ============================================

DROP POLICY IF EXISTS "Users can upload own PF documents" ON storage.objects;
CREATE POLICY "Users can upload own PF documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents-pf'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view own PF documents" ON storage.objects;
CREATE POLICY "Users can view own PF documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents-pf'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin()
  )
);

DROP POLICY IF EXISTS "Users can update own PF documents" ON storage.objects;
CREATE POLICY "Users can update own PF documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents-pf'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own PF documents" ON storage.objects;
CREATE POLICY "Users can delete own PF documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents-pf'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- STORAGE POLICIES: documents-pj
-- ============================================

DROP POLICY IF EXISTS "Users can upload own PJ documents" ON storage.objects;
CREATE POLICY "Users can upload own PJ documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents-pj'
  AND EXISTS (
    SELECT 1 FROM public.profiles_pj
    WHERE profiles_pj.id = (storage.foldername(name))[1]
    AND profiles_pj.pf_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Users can view own PJ documents" ON storage.objects;
CREATE POLICY "Users can view own PJ documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents-pj'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles_pj
      WHERE profiles_pj.id = (storage.foldername(name))[1]
      AND profiles_pj.pf_id = auth.uid()::text
    )
    OR public.is_admin()
  )
);

DROP POLICY IF EXISTS "Users can update own PJ documents" ON storage.objects;
CREATE POLICY "Users can update own PJ documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents-pj'
  AND EXISTS (
    SELECT 1 FROM public.profiles_pj
    WHERE profiles_pj.id = (storage.foldername(name))[1]
    AND profiles_pj.pf_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Users can delete own PJ documents" ON storage.objects;
CREATE POLICY "Users can delete own PJ documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents-pj'
  AND EXISTS (
    SELECT 1 FROM public.profiles_pj
    WHERE profiles_pj.id = (storage.foldername(name))[1]
    AND profiles_pj.pf_id = auth.uid()::text
  )
);

-- ============================================
-- STORAGE POLICIES: documents-cota
-- ============================================

DROP POLICY IF EXISTS "Sellers can upload cota documents" ON storage.objects;
CREATE POLICY "Sellers can upload cota documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents-cota'
  AND EXISTS (
    SELECT 1 FROM public.cotas
    WHERE cotas.id = (storage.foldername(name))[1]
    AND cotas.seller_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Users can view cota documents" ON storage.objects;
CREATE POLICY "Users can view cota documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents-cota'
  AND (
    -- Seller can view
    EXISTS (
      SELECT 1 FROM public.cotas
      WHERE cotas.id = (storage.foldername(name))[1]
      AND cotas.seller_id = auth.uid()::text
    )
    -- Buyer (with proposal) can view
    OR EXISTS (
      SELECT 1 FROM public.proposals
      WHERE proposals.cota_id = (storage.foldername(name))[1]
      AND proposals.buyer_pf_id = auth.uid()::text
    )
    -- Admin can view
    OR public.is_admin()
  )
);

DROP POLICY IF EXISTS "Sellers can update cota documents" ON storage.objects;
CREATE POLICY "Sellers can update cota documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents-cota'
  AND EXISTS (
    SELECT 1 FROM public.cotas
    WHERE cotas.id = (storage.foldername(name))[1]
    AND cotas.seller_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Sellers can delete cota documents" ON storage.objects;
CREATE POLICY "Sellers can delete cota documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents-cota'
  AND EXISTS (
    SELECT 1 FROM public.cotas
    WHERE cotas.id = (storage.foldername(name))[1]
    AND cotas.seller_id = auth.uid()::text
  )
);

-- ============================================
-- VERIFICATION QUERIES
-- Run these to check everything was created
-- ============================================

-- Check constraints:
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.cotas'::regclass;

-- Check triggers:
-- SELECT trigger_name, event_manipulation, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY event_object_table;

-- Check storage buckets:
-- SELECT * FROM storage.buckets;

-- Check storage policies:
-- SELECT policyname, tablename, cmd FROM pg_policies WHERE schemaname = 'storage';

-- Test calculate_monthly_rate:
-- SELECT public.calculate_monthly_rate(100000, 1500, 100);
-- Expected: ~0.87% (approximately)
