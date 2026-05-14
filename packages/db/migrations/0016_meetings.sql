-- Migration 0016: meeting room
--
-- Flow:
--   1. Initiator (agent or CEO) requests a meeting (status='pending' for
--      agent-initiated, 'in_session' for CEO-initiated)
--   2. CEO approves → status='in_session'
--   3. Participants exchange messages in meeting_messages
--   4. CEO ends → summarize → deliverable on initiator's task → status='summarized'

CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desk_id UUID NOT NULL REFERENCES desks(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  agenda TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_session','summarized','rejected','cancelled')),
  initiator_kind TEXT NOT NULL CHECK (initiator_kind IN ('ceo','agent','system')),
  initiator_agent_id UUID REFERENCES virtual_agents(id) ON DELETE SET NULL,
  initiator_assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  complexity_reason TEXT,
  participant_agent_ids UUID[] NOT NULL DEFAULT '{}',
  summary TEXT,
  summary_assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_initiator ON meetings(initiator_assignment_id);

CREATE TABLE IF NOT EXISTS meeting_messages (
  id BIGSERIAL PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  sender_kind TEXT NOT NULL CHECK (sender_kind IN ('ceo','agent','system')),
  sender_agent_id UUID REFERENCES virtual_agents(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_msgs ON meeting_messages(meeting_id, created_at ASC);
