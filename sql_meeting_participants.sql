-- ======================================================
-- جدول meeting_participants لتطبيق NoorTech
-- نفّذ هذا السكربت في Supabase Dashboard → SQL Editor
-- ======================================================

CREATE TABLE public.meeting_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  cloudflare_session_id TEXT,
  track_ids JSONB DEFAULT '[]'::jsonb,
  is_audio_on BOOLEAN DEFAULT true,
  is_video_on BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  CONSTRAINT meeting_participants_pkey PRIMARY KEY (id),
  CONSTRAINT meeting_participants_unique UNIQUE (meeting_id, user_id)
);

-- تفعيل Realtime على الجدول
ALTER PUBLICATION supabase_realtime ADD TABLE meeting_participants;

-- فهرس للبحث السريع بحسب الاجتماع
CREATE INDEX idx_meeting_participants_meeting ON meeting_participants(meeting_id);

-- سياسة RLS مؤقتة (للتطوير - اقرأ/اكتب للجميع)
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meeting_participants_allow_all"
  ON meeting_participants
  FOR ALL
  USING (true)
  WITH CHECK (true);
