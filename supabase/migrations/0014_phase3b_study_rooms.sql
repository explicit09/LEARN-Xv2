-- Phase 3B: Collaborative Study Rooms
CREATE TABLE IF NOT EXISTS study_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_room_members (
  room_id UUID NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS study_room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_study_rooms_course_id ON study_rooms(course_id);
CREATE INDEX IF NOT EXISTS idx_study_rooms_status ON study_rooms(status);
CREATE INDEX IF NOT EXISTS idx_study_room_members_room_id ON study_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_study_room_messages_room_id ON study_room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_study_room_messages_created_at ON study_room_messages(created_at);

-- RLS
ALTER TABLE study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_room_messages ENABLE ROW LEVEL SECURITY;

-- study_rooms: visible to enrolled students and instructor
CREATE POLICY "study_rooms_select" ON study_rooms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments ce
      JOIN users u ON u.id = ce.user_id
      WHERE ce.course_id = study_rooms.course_id
        AND ce.status = 'active'
        AND u.auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM courses c
      JOIN instructor_profiles ip ON ip.id = c.instructor_id
      JOIN users u ON u.id = ip.user_id
      WHERE c.id = study_rooms.course_id
        AND u.auth_id = auth.uid()
    )
  );

-- Only enrolled students can create rooms
CREATE POLICY "study_rooms_insert" ON study_rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM course_enrollments ce
      JOIN users u ON u.id = ce.user_id
      WHERE ce.course_id = study_rooms.course_id
        AND ce.status = 'active'
        AND u.auth_id = auth.uid()
        AND u.id = study_rooms.host_user_id
    )
  );

-- Host can close their own room
CREATE POLICY "study_rooms_update" ON study_rooms
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = study_rooms.host_user_id
        AND u.auth_id = auth.uid()
    )
  );

-- study_room_members: members can see who's in the same room
CREATE POLICY "study_room_members_select" ON study_room_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_room_members srm2
      JOIN users u ON u.id = srm2.user_id
      WHERE srm2.room_id = study_room_members.room_id
        AND u.auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = study_room_members.user_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "study_room_members_insert" ON study_room_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = study_room_members.user_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "study_room_members_delete" ON study_room_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = study_room_members.user_id
        AND u.auth_id = auth.uid()
    )
  );

-- study_room_messages: room members can read and write
CREATE POLICY "study_room_messages_select" ON study_room_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_room_members srm
      JOIN users u ON u.id = srm.user_id
      WHERE srm.room_id = study_room_messages.room_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "study_room_messages_insert" ON study_room_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_room_members srm
      JOIN users u ON u.id = srm.user_id
      WHERE srm.room_id = study_room_messages.room_id
        AND u.auth_id = auth.uid()
        AND u.id = study_room_messages.user_id
    )
  );
