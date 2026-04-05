"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Mic, Settings, LogOut, Plus, Users, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import ParticipantSearchModal from '@/components/video/ParticipantSearchModal';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isStartingVideo, setIsStartingVideo] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // جلب بيانات الموظف من الذاكرة المحلية
    const storedUser = localStorage.getItem('noortech_user');
    if (!storedUser) {
      router.replace('/');
      return;
    }
    try {
      setUser(JSON.parse(storedUser));
    } catch {
      router.replace('/');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('noortech_user');
    router.replace('/');
  };

  const startMeetingWithParticipants = async (selectedIds: string[]) => {
    setIsStartingVideo(true);
    try {
      const res = await fetch('/api/meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `اجتماع طارئ - ${user.fullName}`,
          created_by: user.id,
          participants: selectedIds // إرسال المدعوين
        })
      });
      
      const data = await res.json();
      
      if (data.success && data.meetingId) {
        // يتم توجيه الموظف مباشرة إلى صفحة الاجتماع
        router.push(`/meeting/${data.meetingId}`);
      } else {
        alert('فشل إنشاء جلسة للأسف: ' + (data.details || data.error || 'خطأ غير معروف'));
        setIsStartingVideo(false);
      }
    } catch (error) {
      console.error(error);
      alert('حدث خطأ في الاتصال بالسيرفر');
      setIsStartingVideo(false);
    }
  };

  if (!user) return null; // لا تعرض شيئاً حتى يتم التأكد من المستخدم

  return (
    <div className="min-h-screen bg-slate-950 text-white font-arabic" dir="rtl">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Video size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold">NoorTech Dashboard</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-800/50 py-1.5 pr-1.5 pl-4 rounded-full border border-slate-700/50">
              {user.avatar ? (
                <img src={user.avatar} className="w-8 h-8 rounded-full object-cover" alt="User Avatar" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                </div>
              )}
              <span className="text-sm font-medium">{user.fullName.split(' ')[0]}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-full transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* الترحيب */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <h2 className="text-3xl font-bold">أهلاً بك، المهندس {user.fullName.split(' ')[0]} 👋</h2>
          <p className="text-slate-400">ماذا تود أن تفعل اليوم؟ يمكنك بدء اجتماع فوري أو جدولة واحد.</p>
        </motion.div>

        {/* خيارات الاتصال */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
            disabled={isStartingVideo}
            className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl shadow-xl shadow-blue-900/20 text-right flex flex-col justify-between h-48 border border-blue-500/30 overflow-hidden relative group"
          >
            <div className="absolute top-0 left-0 w-full h-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="bg-white/10 w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-md">
              {isStartingVideo ? <Loader2 className="w-7 h-7 text-white animate-spin" /> : <Video className="w-7 h-7 text-white" />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">اجتماع فيديو خاص</h3>
              <p className="text-blue-100 text-sm">حدد موظفين معينين لإرسال دعوة فورية</p>
            </div>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => alert('الغرفة الصوتية قيد التطوير')}
            className="bg-slate-800 p-6 rounded-3xl border border-slate-700 text-right flex flex-col justify-between h-48 hover:bg-slate-800/80 transition-colors"
          >
            <div className="bg-slate-700/50 w-14 h-14 rounded-2xl flex items-center justify-center text-slate-300">
              <Mic className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">غرفة صوتية</h3>
              <p className="text-slate-400 text-sm">مناقشة صوتية فقط بأسلوب Walkie-Talkie</p>
            </div>
          </motion.button>
          
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-slate-800 p-6 rounded-3xl border border-slate-700 text-right flex flex-col justify-between h-48 opacity-50 cursor-not-allowed"
          >
            <div className="bg-slate-700/50 w-14 h-14 rounded-2xl flex items-center justify-center text-slate-300">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">جدولة اجتماع</h3>
              <p className="text-slate-400 text-sm">التكامل مع تقويم iOS / Android قريباً</p>
            </div>
          </motion.div>
        </div>

      </main>

      {/* مودال اختيار المشاركين */}
      <ParticipantSearchModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onStartMeeting={startMeetingWithParticipants}
        isStarting={isStartingVideo}
        currentUserJobNumber={user.jobNumber}
      />
    </div>
  );
}

function UserIcon(props: any) {
  return <Users {...props} />;
}

function Loader2(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
}
