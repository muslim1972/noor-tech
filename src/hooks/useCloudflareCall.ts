// src/hooks/useCloudflareCall.ts
// Custom Hook لإدارة اتصال الفيديو عبر Cloudflare Calls SFU
"use client";

import { useRef, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Participant {
  id: string;
  meeting_id: string;
  user_id: string;
  user_name: string;
  cloudflare_session_id: string;
  is_audio_on: boolean;
  is_video_on: boolean;
  joined_at: string;
  left_at: string | null;
}

interface RemoteStream {
  participantId: string;
  userName: string;
  stream: MediaStream;
  isAudioOn: boolean;
  isVideoOn: boolean;
}

interface UseCloudflareCallReturn {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  participants: Participant[];
  isConnecting: boolean;
  isConnected: boolean;
  connectionError: string | null;
  isMicOn: boolean;
  isVideoOn: boolean;
  callDuration: number;
  toggleMic: () => void;
  toggleVideo: () => void;
  joinMeeting: (meetingId: string, userId: string, userName: string) => Promise<void>;
  leaveMeeting: () => Promise<void>;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
  ],
  bundlePolicy: 'max-bundle',
};

export function useCloudflareCall(): UseCloudflareCallReturn {
  // State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  // Refs - لتجنب إعادة الرسم غير الضرورية
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const meetingIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeChannelRef = useRef<any>(null);
  const pulledSessionsRef = useRef<Set<string>>(new Set());
  const midToParticipantRef = useRef<Map<string, { userId: string, userName: string }>>(new Map());

  // تشغيل عداد المدة
  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  // إيقاف عداد المدة
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // التقاط الكاميرا والمايكروفون
  const acquireMedia = useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.error('getUserMedia error:', err);
      // محاولة بدون فيديو
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        localStreamRef.current = audioOnly;
        setLocalStream(audioOnly);
        setIsVideoOn(false);
        return audioOnly;
      } catch (audioErr) {
        throw new Error('لا يمكن الوصول للكاميرا أو المايكروفون');
      }
    }
  }, []);

  // سحب tracks من مشارك آخر
  const pullRemoteTracks = useCallback(async (participant: Participant) => {
    const pc = pcRef.current;
    const mySessionId = sessionIdRef.current;
    if (!pc || !mySessionId || !participant.cloudflare_session_id) return;

    // تجنب السحب المكرر
    if (pulledSessionsRef.current.has(participant.cloudflare_session_id)) return;
    pulledSessionsRef.current.add(participant.cloudflare_session_id);

    console.log('Pulling tracks from:', participant.user_name, participant.cloudflare_session_id);

    try {
      // طلب سحب tracks من السيرفر
      const pullRes = await fetch('/api/meeting/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: mySessionId,
          tracks: [
            { trackName: 'video', sessionId: participant.cloudflare_session_id },
            { trackName: 'audio', sessionId: participant.cloudflare_session_id },
          ],
        }),
      });

      const pullData = await pullRes.json();

      if (pullData.sdpOffer) {
        // حفظ الـ mid المخصص لكل تراك لربطه بالمشارك لاحقاً (قبل تفعيل الـ tracks)
        if (pullData.tracks && Array.isArray(pullData.tracks)) {
          pullData.tracks.forEach((t: any) => {
            if (t.mid) {
              midToParticipantRef.current.set(t.mid, {
                userId: participant.user_id,
                userName: participant.user_name
              });
            }
          });
        }

        // Cloudflare أرسل offer جديد - نحتاج renegotiation
        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: 'offer', sdp: pullData.sdpOffer })
        );
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // إرسال الـ answer للسيرفر
        await fetch('/api/meeting/tracks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: mySessionId,
            sdpAnswer: answer.sdp,
          }),
        });
      }
    } catch (err) {
      console.error('Pull tracks error:', err);
      // إزالة من المسحوبة حتى يمكن إعادة المحاولة
      pulledSessionsRef.current.delete(participant.cloudflare_session_id);
    }
  }, []);

  // الاستماع لأحداث Supabase Realtime
  const subscribeToParticipants = useCallback((meetingId: string, userId: string) => {
    const channel = supabase
      .channel(`meeting-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_participants',
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          console.log('Realtime event:', payload.eventType, payload.new);

          if (payload.eventType === 'INSERT') {
            const newPart = payload.new as Participant;
            // مشارك جديد انضم
            if (newPart.user_id !== userId) {
              setParticipants(prev => {
                const exists = prev.some(p => p.user_id === newPart.user_id);
                if (exists) return prev;
                return [...prev, newPart];
              });
              // سحب tracks المشارك الجديد
              pullRemoteTracks(newPart);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Participant;
            if (updated.left_at) {
              // مشارك غادر
              setParticipants(prev => prev.filter(p => p.user_id !== updated.user_id));
              setRemoteStreams(prev => prev.filter(s => s.participantId !== updated.user_id));
              if (updated.cloudflare_session_id) {
                pulledSessionsRef.current.delete(updated.cloudflare_session_id);
              }
            } else {
              // تحديث حالة (mic/video)
              setParticipants(prev =>
                prev.map(p => p.user_id === updated.user_id ? updated : p)
              );
              setRemoteStreams(prev =>
                prev.map(s =>
                  s.participantId === updated.user_id
                    ? { ...s, isAudioOn: updated.is_audio_on, isVideoOn: updated.is_video_on }
                    : s
                )
              );
            }
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;
  }, [pullRemoteTracks]);

  // الانضمام للاجتماع
  const joinMeeting = useCallback(async (meetingId: string, userId: string, userName: string) => {
    setIsConnecting(true);
    setConnectionError(null);
    meetingIdRef.current = meetingId;
    userIdRef.current = userId;

    try {
      // 1. التقاط الميديا
      const stream = await acquireMedia();

      // 2. إنشاء RTCPeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // 3. إضافة الـ local tracks
      const trackHints: { trackName: string; mid: string }[] = [];
      stream.getTracks().forEach((track, index) => {
        const sender = pc.addTrack(track, stream);
        trackHints.push({
          trackName: track.kind, // 'audio' أو 'video'
          mid: String(index),
        });
      });

      // 4. معالجة الـ remote tracks
      pc.ontrack = (event) => {
        const mid = event.transceiver.mid;
        if (!mid) return;

        const participantInfo = midToParticipantRef.current.get(mid);
        if (!participantInfo) {
          console.warn('Received unmapped track for mid:', mid);
          return;
        }

        const userId = participantInfo.userId;
        const userName = participantInfo.userName;

        setRemoteStreams(prev => {
          const existing = prev.find(s => s.participantId === userId);
          
          if (existing) {
            // إضافة التراك للـ stream الموجود إذا لم يكن موجوداً
            const hasTrack = existing.stream.getTracks().some(t => t.id === event.track.id);
            if (!hasTrack) {
              // إنشاء ستريم جديد يحتوي على التراك الجديد والتراكات القديمة لضمان استجابة ريأكت
              const newStream = new MediaStream([...existing.stream.getTracks(), event.track]);
              return prev.map(s => s.participantId === userId ? { ...s, stream: newStream } : s);
            }
            return prev;
          }

          // تجميع التراك في stream جديد للمشارك
          const newStream = new MediaStream([event.track]);
          return [
            ...prev,
            {
              participantId: userId,
              userName: userName,
              stream: newStream,
              isAudioOn: true,
              isVideoOn: true,
            },
          ];
        });
      };

      // مراقبة حالة الاتصال
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
          setIsConnecting(false);
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setConnectionError('انقطع الاتصال. جاري إعادة المحاولة...');
        }
      };

      // 5. إنشاء SDP Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 6. إرسال الـ Offer إلى السيرفر (الذي يتواصل مع Cloudflare)
      const joinRes = await fetch('/api/meeting/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          userId,
          userName,
          sdpOffer: offer.sdp,
          trackHints,
        }),
      });

      const joinData = await joinRes.json();

      if (!joinData.success) {
        throw new Error(joinData.error || 'فشل الانضمام');
      }

      sessionIdRef.current = joinData.sessionId;

      // 7. تعيين SDP Answer من Cloudflare
      if (joinData.sdpAnswer) {
        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: 'answer', sdp: joinData.sdpAnswer })
        );
      }

      // 8. تسجيل المشاركين الموجودين
      if (joinData.otherParticipants && joinData.otherParticipants.length > 0) {
        setParticipants(joinData.otherParticipants);
        // سحب tracks لكل مشارك موجود بشكل تسلسلي لضمان تزامن الـ mid
        for (const p of joinData.otherParticipants) {
          if (p.cloudflare_session_id) {
            await pullRemoteTracks(p);
          }
        }
      }

      // 9. الاشتراك بـ Realtime لمراقبة المشاركين الجدد
      subscribeToParticipants(meetingId, userId);

      // 10. بدء العداد
      setIsConnected(true);
      setIsConnecting(false);
      startTimer();
    } catch (error: any) {
      console.error('Join Meeting Error:', error);
      setConnectionError(error.message || 'فشل في الدخول للاجتماع');
      setIsConnecting(false);
    }
  }, [acquireMedia, pullRemoteTracks, subscribeToParticipants, startTimer]);

  // مغادرة الاجتماع
  const leaveMeeting = useCallback(async () => {
    stopTimer();

    // إيقاف Realtime
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    // إيقاف media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // إغلاق RTCPeerConnection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // إبلاغ السيرفر
    if (meetingIdRef.current && userIdRef.current) {
      try {
        await fetch('/api/meeting/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingId: meetingIdRef.current,
            userId: userIdRef.current,
            sessionId: sessionIdRef.current,
          }),
        });
      } catch (e) {
        console.warn('Leave API warning:', e);
      }
    }

    // تنظيف الحالة
    setLocalStream(null);
    setRemoteStreams([]);
    setParticipants([]);
    setIsConnected(false);
    setCallDuration(0);
    pulledSessionsRef.current.clear();
    sessionIdRef.current = null;
  }, [stopTimer]);

  // تبديل المايكروفون
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);

        // تحديث الحالة في DB
        if (meetingIdRef.current && userIdRef.current) {
          supabase
            .from('meeting_participants')
            .update({ is_audio_on: audioTrack.enabled })
            .eq('meeting_id', meetingIdRef.current)
            .eq('user_id', userIdRef.current)
            .then(() => {});
        }
      }
    }
  }, []);

  // تبديل الكاميرا
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);

        // تحديث الحالة في DB
        if (meetingIdRef.current && userIdRef.current) {
          supabase
            .from('meeting_participants')
            .update({ is_video_on: videoTrack.enabled })
            .eq('meeting_id', meetingIdRef.current)
            .eq('user_id', userIdRef.current)
            .then(() => {});
        }
      }
    }
  }, []);

  // تنظيف عند unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, [stopTimer]);

  return {
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
  };
}
