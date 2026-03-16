-- Phase 2E: Professor/Instructor Tools

CREATE TABLE instructor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  institution TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES instructor_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  join_code CHAR(8) UNIQUE DEFAULT upper(substring(md5(random()::text), 1, 8)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_join_code ON courses(join_code);

CREATE TABLE course_enrollments (
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dropped')),
  PRIMARY KEY (course_id, user_id)
);

CREATE INDEX idx_course_enrollments_user ON course_enrollments(user_id);

CREATE TABLE course_documents (
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, document_id)
);

-- RLS

ALTER TABLE instructor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_documents ENABLE ROW LEVEL SECURITY;

-- Instructor profiles: own row only
CREATE POLICY "instructor_profiles_select" ON instructor_profiles
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "instructor_profiles_insert" ON instructor_profiles
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "instructor_profiles_update" ON instructor_profiles
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Courses: instructor can manage, enrolled students can view
CREATE POLICY "courses_select" ON courses
  FOR SELECT USING (
    instructor_id IN (
      SELECT id FROM instructor_profiles
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
    OR id IN (
      SELECT course_id FROM course_enrollments
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND status = 'active'
    )
  );

CREATE POLICY "courses_insert" ON courses
  FOR INSERT WITH CHECK (
    instructor_id IN (
      SELECT id FROM instructor_profiles
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "courses_update" ON courses
  FOR UPDATE USING (
    instructor_id IN (
      SELECT id FROM instructor_profiles
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "courses_delete" ON courses
  FOR DELETE USING (
    instructor_id IN (
      SELECT id FROM instructor_profiles
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- Enrollments: instructor or enrolled student
CREATE POLICY "enrollments_select" ON course_enrollments
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR course_id IN (
      SELECT c.id FROM courses c
      JOIN instructor_profiles ip ON ip.id = c.instructor_id
      WHERE ip.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "enrollments_insert" ON course_enrollments
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "enrollments_update" ON course_enrollments
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR course_id IN (
      SELECT c.id FROM courses c
      JOIN instructor_profiles ip ON ip.id = c.instructor_id
      WHERE ip.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- Course documents: instructor or enrolled student
CREATE POLICY "course_documents_select" ON course_documents
  FOR SELECT USING (
    course_id IN (
      SELECT c.id FROM courses c
      JOIN instructor_profiles ip ON ip.id = c.instructor_id
      WHERE ip.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
    OR course_id IN (
      SELECT course_id FROM course_enrollments
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
      AND status = 'active'
    )
  );

CREATE POLICY "course_documents_insert" ON course_documents
  FOR INSERT WITH CHECK (
    course_id IN (
      SELECT c.id FROM courses c
      JOIN instructor_profiles ip ON ip.id = c.instructor_id
      WHERE ip.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "course_documents_delete" ON course_documents
  FOR DELETE USING (
    course_id IN (
      SELECT c.id FROM courses c
      JOIN instructor_profiles ip ON ip.id = c.instructor_id
      WHERE ip.user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );
