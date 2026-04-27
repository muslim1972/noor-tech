-- ======================================================
-- إضافة حقل is_read إلى جدول meeting_participants
-- نفّذ هذا السكربت في Supabase Dashboard → SQL Editor
-- ======================================================

ALTER TABLE public.meeting_participants 
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- إنشاء فهرس لتسريع استعلام الإشعارات غير المقروءة
CREATE INDEX IF NOT EXISTS idx_meeting_participants_unread 
  ON public.meeting_participants(user_id, is_read) 
  WHERE is_read = false;
