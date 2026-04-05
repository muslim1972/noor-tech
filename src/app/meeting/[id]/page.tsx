import MeetingRoom from '@/components/video/MeetingRoom';

export default function MeetingPage({ params }: { params: { id: string } }) {
  return (
    <main>
      <MeetingRoom meetingId={params.id} />
    </main>
  );
}
