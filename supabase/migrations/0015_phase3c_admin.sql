-- Phase 3C: Admin roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can view all roles
CREATE POLICY "user_roles_select_own" ON user_roles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = user_roles.user_id AND u.auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur2
      JOIN users u ON u.id = ur2.user_id
      WHERE ur2.role = 'admin' AND u.auth_id = auth.uid()
    )
  );

-- Only admins can insert/update roles (service role bypasses RLS for seeding)
CREATE POLICY "user_roles_admin_write" ON user_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur2
      JOIN users u ON u.id = ur2.user_id
      WHERE ur2.role = 'admin' AND u.auth_id = auth.uid()
    )
  );
