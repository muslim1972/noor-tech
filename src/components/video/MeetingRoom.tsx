// src/components/video/MeetingRoom.tsx
// شاشة غرفة الاجتماع الحيّة مع Cloudflare Calls SFU
"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCloudflareCall } from '@/hooks/useCloudflareCall';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Users, Shield, Loader2, WifiOff, UserPlus,
  Maximize, Minimize
} from 'lucide-react';
import ParticipantSearchModal from '@/components/video/ParticipantSearchModal';

interface MeetingRoomProps {
  meetingId: string;
}

// مكون عرض الفيديو المحلي
function LocalVideoTile({
  stream,
  userName,
  isMicOn,
  isVideoOn,
}: {
  stream: MediaStream | null;
  userName: string;
  isMicOn: boolean;
  isVideoOn: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map(n => n.charAt(0))
    .join('');

  return (
    <div className="meeting-tile meeting-tile--local">
      {isVideoOn && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="meeting-tile__video meeting-tile__video--mirrored"
        />
      ) : (
        <div className="meeting-tile__avatar">
          <div className="meeting-tile__avatar-circle">
            <span>{initials}</span>
          </div>
        </div>
      )}

      <div className="meeting-tile__info">
        <span className="meeting-tile__name">
          أنت • {userName.split(' ')[0]}
        </span>
        <div className="meeting-tile__indicators">
          {!isMicOn && <MicOff size={12} className="meeting-tile__indicator--off" />}
          {!isVideoOn && <VideoOff size={12} className="meeting-tile__indicator--off" />}
        </div>
      </div>

      <div className="meeting-tile__badge meeting-tile__badge--you">أنت</div>
    </div>
  );
}

// مكون عرض فيديو المشارك البعيد
function RemoteVideoTile({
  stream,
  userName,
  isAudioOn,
  isVideoOn,
}: {
  stream: MediaStream;
  userName: string;
  isAudioOn: boolean;
  isVideoOn: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map(n => n.charAt(0))
    .join('');

  return (
    <div className="meeting-tile meeting-tile--remote">
      {isVideoOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="meeting-tile__video"
        />
      ) : (
        <div className="meeting-tile__avatar">
          <div className="meeting-tile__avatar-circle meeting-tile__avatar-circle--remote">
            <span>{initials}</span>
          </div>
        </div>
      )}

      <div className="meeting-tile__info">
        <span className="meeting-tile__name">{userName}</span>
        <div className="meeting-tile__indicators">
          {!isAudioOn && <MicOff size={12} className="meeting-tile__indicator--off" />}
          {!isVideoOn && <VideoOff size={12} className="meeting-tile__indicator--off" />}
        </div>
      </div>
    </div>
  );
}

// مكون عداد المدة
function DurationDisplay({ seconds }: { seconds: number }) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const display = h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  return (
    <div className="meeting-duration">
      <div className="meeting-duration__dot" />
      <span>{display}</span>
    </div>
  );
}

// المكون الرئيسي
export default function MeetingRoom({ meetingId }: MeetingRoomProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    localStream,
    remoteStreams,
    participants,
    isConnecting,
    isConnected,
    connectionError,
    isMicOn,
    isVideoOn,
    callDuration,
    toggleMic,
    toggleVideo,
    joinMeeting,
    leaveMeeting,
  } = useCloudflareCall();

  // جلب بيانات المستخدم والانضمام للاجتماع
  useEffect(() => {
    const storedUser = localStorage.getItem('noortech_user');
    if (!storedUser) {
      router.replace('/');
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);

      // الانضمام التلقائي
      joinMeeting(meetingId, parsed.id, parsed.fullName);
    } catch {
      router.replace('/');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  // المغادرة ← العودة للوحة التحكم
  const handleLeave = useCallback(async () => {
    await leaveMeeting();
    router.replace('/dashboard');
  }, [leaveMeeting, router]);

  // ملء الشاشة
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // دعوة أشخاص إضافيين أثناء الاجتماع
  const handleInviteParticipants = useCallback(async (selectedIds: string[]) => {
    setIsSendingInvite(true);
    try {
      // إرسال إشعار للمدعوين الجدد مع رابط الاجتماع الحالي
      const res = await fetch('/api/meeting/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          invitedBy: user?.fullName || 'مشارك',
          participants: selectedIds
        })
      });
      const data = await res.json();
      if (!data.success) {
        console.error('Invite error:', data.error);
      }
    } catch (err) {
      console.error('Invite failed:', err);
    } finally {
      setIsSendingInvite(false);
      setShowInviteModal(false);
    }
  }, [meetingId, user]);

  // حساب عدد المشاركين الإجمالي (أنا + الآخرين)
  const totalParticipants = useMemo(() => {
    return 1 + remoteStreams.length;
  }, [remoteStreams]);

  // Grid class بحسب عدد المشاركين
  const gridClass = useMemo(() => {
    if (totalParticipants <= 1) return 'meeting-grid--solo';
    if (totalParticipants === 2) return 'meeting-grid--duo';
    if (totalParticipants <= 4) return 'meeting-grid--quad';
    return 'meeting-grid--many';
  }, [totalParticipants]);

  // شاشة التحميل
  if (!user) {
    return (
      <div className="meeting-loading">
        <Loader2 className="meeting-loading__spinner" size={40} />
        <p>جارٍ التحقق من هويتك...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="meeting-container" dir="rtl">
      {/* Header */}
      <header className="meeting-header">
        <div className="meeting-header__right">
          <Shield size={16} className="meeting-header__secure-icon" />
          <span className="meeting-header__title">اجتماع خاص مشفّر</span>
        </div>
        <div className="meeting-header__center">
          {isConnected && <DurationDisplay seconds={callDuration} />}
          {isConnecting && (
            <div className="meeting-header__connecting">
              <Loader2 size={14} className="animate-spin" />
              <span>جارٍ الاتصال...</span>
            </div>
          )}
        </div>
        <div className="meeting-header__left">
          <div className="meeting-header__participants-count">
            <Users size={14} />
            <span>{totalParticipants}</span>
          </div>
          <button
            onClick={toggleFullscreen}
            className="meeting-header__btn"
            title={isFullscreen ? 'إلغاء ملء الشاشة' : 'ملء الشاشة'}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </header>

      {/* خطأ الاتصال */}
      {connectionError && (
        <div className="meeting-error">
          <WifiOff size={18} />
          <span>{connectionError}</span>
        </div>
      )}

      {/* منطقة الفيديو */}
      <main className={`meeting-grid ${gridClass}`}>
        {/* الفيديو المحلي - دائماً أول عنصر */}
        <LocalVideoTile
          stream={localStream}
          userName={user.fullName}
          isMicOn={isMicOn}
          isVideoOn={isVideoOn}
        />

        {/* فيديو المشاركين */}
        {remoteStreams.map((remote, index) => (
          <RemoteVideoTile
            key={remote.participantId || index}
            stream={remote.stream}
            userName={remote.userName || `مشارك ${index + 1}`}
            isAudioOn={remote.isAudioOn}
            isVideoOn={remote.isVideoOn}
          />
        ))}
      </main>

      {/* شريط التحكم */}
      <footer className="meeting-controls">
        <div className="meeting-controls__bar">
          {/* زر المايكروفون */}
          <button
            onClick={toggleMic}
            className={`meeting-controls__btn ${!isMicOn ? 'meeting-controls__btn--danger' : ''}`}
            title={isMicOn ? 'كتم الصوت' : 'تشغيل الصوت'}
          >
            {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
            <span className="meeting-controls__btn-label">
              {isMicOn ? 'الصوت' : 'مكتوم'}
            </span>
          </button>

          {/* زر الكاميرا */}
          <button
            onClick={toggleVideo}
            className={`meeting-controls__btn ${!isVideoOn ? 'meeting-controls__btn--danger' : ''}`}
            title={isVideoOn ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا'}
          >
            {isVideoOn ? <Video size={22} /> : <VideoOff size={22} />}
            <span className="meeting-controls__btn-label">
              {isVideoOn ? 'الكاميرا' : 'متوقفة'}
            </span>
          </button>

          {/* زر دعوة أشخاص */}
          <button
            onClick={() => setShowInviteModal(true)}
            className="meeting-controls__btn meeting-controls__btn--invite"
            title="دعوة أشخاص"
          >
            <UserPlus size={22} />
            <span className="meeting-controls__btn-label">دعوة</span>
          </button>

          {/* زر إنهاء الاجتماع */}
          <button
            onClick={handleLeave}
            className="meeting-controls__btn meeting-controls__btn--end"
            title="إنهاء الاجتماع"
          >
            <PhoneOff size={22} />
            <span className="meeting-controls__btn-label">إنهاء</span>
          </button>
        </div>
      </footer>

      {/* مودال دعوة مشاركين إضافيين */}
      {user && (
        <ParticipantSearchModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onStartMeeting={handleInviteParticipants}
          isStarting={isSendingInvite}
          currentUserJobNumber={user.jobNumber}
        />
      )}

      <style jsx>{meetingStyles}</style>
    </div>
  );
}

// ─── أنماط CSS المعزولة ────────────────────────────────────────────────
const meetingStyles = `
  /* الحاوية الرئيسية */
  .meeting-container {
    position: fixed;
    inset: 0;
    background: linear-gradient(135deg, #0c0f1a 0%, #111827 50%, #0f172a 100%);
    display: flex;
    flex-direction: column;
    z-index: 9999;
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    color: #fff;
    overflow: hidden;
  }

  /* شاشة التحميل */
  .meeting-loading {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #0c0f1a;
    color: #94a3b8;
    gap: 16px;
    font-size: 16px;
  }

  .meeting-loading__spinner {
    animation: spin 1s linear infinite;
    color: #3b82f6;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Header */
  .meeting-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(51, 65, 85, 0.3);
    z-index: 10;
  }

  .meeting-header__right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .meeting-header__secure-icon {
    color: #22c55e;
  }

  .meeting-header__title {
    font-size: 13px;
    color: #94a3b8;
    font-weight: 500;
  }

  .meeting-header__center {
    display: flex;
    align-items: center;
  }

  .meeting-header__connecting {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #fbbf24;
    font-size: 13px;
  }

  .meeting-header__left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .meeting-header__participants-count {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(51, 65, 85, 0.5);
    border-radius: 20px;
    font-size: 13px;
    color: #cbd5e1;
  }

  .meeting-header__btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(51, 65, 85, 0.5);
    border: none;
    border-radius: 10px;
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.2s;
  }

  .meeting-header__btn:hover {
    background: rgba(51, 65, 85, 0.8);
    color: #fff;
  }

  /* عداد المدة */
  .meeting-duration {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #fca5a5;
  }

  .meeting-duration__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ef4444;
    animation: pulse-dot 1.5s ease-in-out infinite;
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }

  /* خطأ الاتصال */
  .meeting-error {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 10px 20px;
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    font-size: 14px;
    border-bottom: 1px solid rgba(239, 68, 68, 0.2);
  }

  /* شبكة الفيديو */
  .meeting-grid {
    flex: 1;
    display: grid;
    padding: 12px;
    gap: 10px;
    min-height: 0;
    overflow: hidden;
  }

  .meeting-grid--solo {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
  }

  .meeting-grid--duo {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr;
  }

  .meeting-grid--quad {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }

  .meeting-grid--many {
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: 1fr;
  }

  /* بلاطة الفيديو */
  .meeting-tile {
    position: relative;
    border-radius: 16px;
    overflow: hidden;
    background: linear-gradient(145deg, #1e293b, #0f172a);
    border: 1px solid rgba(51, 65, 85, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    transition: border-color 0.3s, box-shadow 0.3s;
  }

  .meeting-tile:hover {
    border-color: rgba(59, 130, 246, 0.4);
  }

  .meeting-tile--local {
    border-color: rgba(59, 130, 246, 0.3);
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.08);
  }

  .meeting-tile__video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .meeting-tile__video--mirrored {
    transform: scaleX(-1);
  }

  /* الصورة الرمزية */
  .meeting-tile__avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at center, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.95));
  }

  .meeting-tile__avatar-circle {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #6366f1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 700;
    color: white;
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
    animation: avatar-appear 0.4s ease-out;
  }

  .meeting-tile__avatar-circle--remote {
    background: linear-gradient(135deg, #8b5cf6, #a855f7);
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3);
  }

  @keyframes avatar-appear {
    from { transform: scale(0.5); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  /* معلومات المشارك */
  .meeting-tile__info {
    position: absolute;
    bottom: 0;
    right: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  }

  .meeting-tile__name {
    font-size: 13px;
    font-weight: 500;
    color: #e2e8f0;
    text-shadow: 0 1px 3px rgba(0,0,0,0.5);
  }

  .meeting-tile__indicators {
    display: flex;
    gap: 6px;
  }

  .meeting-tile__indicator--off {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.2);
    padding: 3px;
    border-radius: 4px;
  }

  .meeting-tile__badge {
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 10px;
    font-weight: 600;
  }

  .meeting-tile__badge--you {
    background: rgba(59, 130, 246, 0.3);
    color: #93c5fd;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  /* شريط التحكم */
  .meeting-controls {
    padding: 16px 20px 24px;
    display: flex;
    justify-content: center;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent);
  }

  .meeting-controls__bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: rgba(30, 41, 59, 0.85);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    border: 1px solid rgba(51, 65, 85, 0.4);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  }

  .meeting-controls__btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 16px;
    border: none;
    border-radius: 14px;
    background: rgba(51, 65, 85, 0.5);
    color: #fff;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 64px;
  }

  .meeting-controls__btn:hover {
    background: rgba(71, 85, 105, 0.6);
    transform: translateY(-2px);
  }

  .meeting-controls__btn:active {
    transform: translateY(0);
  }

  .meeting-controls__btn--danger {
    background: rgba(239, 68, 68, 0.25);
    color: #fca5a5;
  }

  .meeting-controls__btn--danger:hover {
    background: rgba(239, 68, 68, 0.35);
  }

  .meeting-controls__btn--end {
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    color: #fff;
    padding: 12px 28px;
    box-shadow: 0 4px 20px rgba(220, 38, 38, 0.3);
  }

  .meeting-controls__btn--end:hover {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    box-shadow: 0 6px 30px rgba(220, 38, 38, 0.4);
  }

  .meeting-controls__btn--invite {
    background: rgba(16, 185, 129, 0.2);
    color: #6ee7b7;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .meeting-controls__btn--invite:hover {
    background: rgba(16, 185, 129, 0.35);
    border-color: rgba(16, 185, 129, 0.5);
  }

  .meeting-controls__btn-label {
    font-size: 11px;
    font-weight: 500;
    opacity: 0.8;
  }

  /* ─── Responsive ─── */
  @media (max-width: 768px) {
    .meeting-grid--duo {
      grid-template-columns: 1fr;
      grid-template-rows: 1fr 1fr;
    }

    .meeting-grid--quad {
      grid-template-columns: 1fr 1fr;
    }

    .meeting-grid--many {
      grid-template-columns: 1fr 1fr;
    }

    .meeting-header__title {
      display: none;
    }

    .meeting-controls__btn {
      padding: 10px 12px;
      min-width: 54px;
    }

    .meeting-controls__btn--end {
      padding: 10px 20px;
    }

    .meeting-tile__avatar-circle {
      width: 60px;
      height: 60px;
      font-size: 22px;
    }
  }

  @media (max-width: 480px) {
    .meeting-grid { padding: 6px; gap: 6px; }
    .meeting-tile { border-radius: 12px; }
    .meeting-controls { padding: 10px 12px 18px; }
    .meeting-controls__bar { padding: 8px 10px; gap: 8px; }
    .meeting-controls__btn-label { display: none; }
  }
`;