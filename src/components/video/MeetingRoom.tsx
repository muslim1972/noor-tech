// src/components/video/MeetingRoom.tsx
"use client";
import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users } from 'lucide-react';

export default function MeetingRoom({ meetingId }: { meetingId?: string }) {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white">
      {/* منطقة الفيديو الرئيسية - Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {/* فيديو المستخدم المحلي */}
        <div className="relative bg-slate-800 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-xl">

          <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full text-xs font-medium">
            أنت (المهندس مسلم)
          </div>
          {/* هنا سيظهر الـ Video Stream لاحقاً */}
          <div className="w-full h-full flex items-center justify-center bg-slate-700">
             {!isVideoOn && <VideoOff className="w-16 h-16 text-slate-500" />}
          </div>
        </div>

        {/* فيديو المشارك (مثال) */}
        <div className="relative bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-lg">
          <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full text-xs font-medium">
            الموظف المشارك
          </div>
          <div className="w-full h-full flex items-center justify-center bg-slate-700">
            <Users className="w-16 h-16 text-slate-500" />
          </div>
        </div>
      </div>

      {/* شريط التحكم السفلي */}
      <div className="h-24 bg-slate-950/80 backdrop-blur-md flex items-center justify-center gap-6 border-t border-slate-800">
        <button 
          onClick={() => setIsMicOn(!isMicOn)}
          className={`p-4 rounded-full transition-all ${isMicOn ? 'bg-slate-800 hover:bg-slate-700' : 'bg-red-500 hover:bg-red-600'}`}
        >
          {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>

        <button 
          onClick={() => setIsVideoOn(!isVideoOn)}
          className={`p-4 rounded-full transition-all ${isVideoOn ? 'bg-slate-800 hover:bg-slate-700' : 'bg-red-500 hover:bg-red-600'}`}
        >
          {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
        </button>

        <button className="bg-red-600 hover:bg-red-700 p-4 rounded-2xl flex items-center gap-2 px-8 transition-all font-bold">
          <PhoneOff size={24} />
          <span>إنهاء الاجتماع</span>
        </button>
      </div>
    </div>
  );
}