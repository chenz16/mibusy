-- Migration 0009: budgets for CEO and each agent
--
-- monthly_budget — soft cap in USD per calendar month. NULL = unlimited.
-- The CEO's monthly_budget is stored on the desk row.
-- Each agent's monthly_budget is stored on virtual_agents.
--
-- "spent" is not stored — it's computed on demand from completed assignments
-- in the current month (SUM(budget_limit)).

ALTER TABLE virtual_agents
  ADD COLUMN IF NOT EXISTS monthly_budget NUMERIC(10, 2);

ALTER TABLE desks
  ADD COLUMN IF NOT EXISTS ceo_monthly_budget NUMERIC(10, 2);

-- Sensible defaults (only set if currently NULL)
UPDATE virtual_agents
SET monthly_budget = 50.00
WHERE monthly_budget IS NULL;

UPDATE desks
SET ceo_monthly_budget = 500.00
WHERE id = '00000000-0000-0000-0000-000000000001' AND ceo_monthly_budget IS NULL;
