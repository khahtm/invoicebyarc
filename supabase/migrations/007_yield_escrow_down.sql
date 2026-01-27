-- Reverse migration: remove yield escrow support (V5)

-- Drop constraints first
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS check_contract_version_yield;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS check_yield_columns;

-- Drop yield_snapshots table (cascades indexes, policies)
DROP TABLE IF EXISTS yield_snapshots;

-- Remove yield columns from invoices
ALTER TABLE invoices
  DROP COLUMN IF EXISTS yield_escrow_enabled,
  DROP COLUMN IF EXISTS original_usdc_amount,
  DROP COLUMN IF EXISTS usyc_deposited,
  DROP COLUMN IF EXISTS yield_earned;
