-- Migration: Add yield escrow support (V5)
-- Arc Invoice V5 USYC Yield Escrow

-- Add yield escrow columns to invoices table
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS yield_escrow_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS original_usdc_amount NUMERIC(20, 6),
  ADD COLUMN IF NOT EXISTS usyc_deposited NUMERIC(20, 6),
  ADD COLUMN IF NOT EXISTS yield_earned NUMERIC(20, 6);

-- Column documentation
COMMENT ON COLUMN invoices.yield_escrow_enabled IS 'Whether this invoice uses USYC yield escrow (contract_version=5)';
COMMENT ON COLUMN invoices.original_usdc_amount IS 'Original USDC amount deposited before yield accrual';
COMMENT ON COLUMN invoices.usyc_deposited IS 'USYC shares received from deposit';
COMMENT ON COLUMN invoices.yield_earned IS 'Total yield earned in USDC (set on release/refund)';

-- Yield snapshots table for historical tracking
CREATE TABLE IF NOT EXISTS yield_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    usyc_balance NUMERIC(20, 6) NOT NULL,
    usdc_value NUMERIC(20, 6) NOT NULL,
    yield_accrued NUMERIC(20, 6) NOT NULL DEFAULT 0,
    snapshot_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_yield_snapshots_invoice_id
  ON yield_snapshots(invoice_id);
CREATE INDEX IF NOT EXISTS idx_yield_snapshots_snapshot_at
  ON yield_snapshots(snapshot_at DESC);

-- RLS
ALTER TABLE yield_snapshots ENABLE ROW LEVEL SECURITY;

-- Permissive policies (matches existing pattern in 006_terms_escrow.sql)
CREATE POLICY "yield_snapshots_select_all" ON yield_snapshots FOR SELECT USING (true);
CREATE POLICY "yield_snapshots_insert_all" ON yield_snapshots FOR INSERT WITH CHECK (true);

-- Constraints: yield columns require yield_escrow_enabled=true
ALTER TABLE invoices
  ADD CONSTRAINT check_yield_columns
  CHECK (
    (yield_escrow_enabled = FALSE OR yield_escrow_enabled IS NULL) OR
    (yield_escrow_enabled = TRUE AND original_usdc_amount IS NOT NULL)
  );

-- Constraint: contract_version=5 implies yield_escrow_enabled=true
ALTER TABLE invoices
  ADD CONSTRAINT check_contract_version_yield
  CHECK (
    (contract_version IS NULL OR contract_version != 5) OR
    (contract_version = 5 AND yield_escrow_enabled = TRUE)
  );
