// src/app/meeting/[id]/page.tsx
// صفحة غرفة الاجتماع - Next.js 16 (params = Promise)
"use client";

import { use } from 'react';
import MeetingRoom from '@/components/video/MeetingRoom';

export default function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return <MeetingRoom meetingId={id} />;
}
