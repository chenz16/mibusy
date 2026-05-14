-- Worker protocol columns: human/computer/remote node support
ALTER TABLE virtual_agents ADD COLUMN IF NOT EXISTS linked_email text;
ALTER TABLE virtual_agents ADD COLUMN IF NOT EXISTS work_token   text UNIQUE;
ALTER TABLE virtual_agents ADD COLUMN IF NOT EXISTS system_prompt text;
ALTER TABLE virtual_agents ADD COLUMN IF NOT EXISTS last_seen_at   timestamptz;
ALTER TABLE virtual_agents ADD COLUMN IF NOT EXISTS proxy_agent_id uuid REFERENCES virtual_agents(id);
