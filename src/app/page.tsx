"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Video, Lock, User, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [jobNumber, setJobNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // البحث عن الموظف في جدول profiles
      const { data: user, error: dbError } = await supabase
        .from('profiles')
        .select('*')
        .eq('job_number', jobNumber)
        .eq('password', password)
        .single();

      if (dbError || !user) {
        setError('الرقم الوظيفي أو كلمة المرور غير صحيحة');
        setIsLoading(false);
        return;
      }

      // حفظ بيانات الموظف محلياً
      localStorage.setItem('noortech_user', JSON.stringify({
        id: user.id,
        fullName: user.full_name,
        jobNumber: user.job_number,
        avatar: user.avatar_url || user.avatar
      }));

      // التوجيه إلى لوحة القيادة
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setError('حدث خطأ في الاتصال، يرجى المحاولة لاحقاً');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* خلفية جمالية */}
      <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-8 relative z-10">
          <div className="flex flex-col items-center justify-center space-y-4 mb-8">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500 mb-2">
              <Video size={32} />
            </div>
            <h1 className="text-3xl font-bold font-arabic text-white">NoorTech Meet</h1>
            <p className="text-slate-400 text-sm">منصة الاجتماعات الآمنة للموظفين</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6" dir="rtl">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-xl text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 px-1">الرقم الوظيفي</label>
              <div className="relative">
                <input
                  type="text"
                  value={jobNumber}
                  onChange={(e) => setJobNumber(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-left dir-ltr"
                  placeholder="مثال: c123456"
                  required
                />
                <User className="absolute left-3 top-3.5 text-slate-500" size={20} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 px-1">كلمة المرور</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-left dir-ltr"
                  placeholder="••••••••"
                  required
                />
                <Lock className="absolute left-3 top-3.5 text-slate-500" size={20} />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl py-3.5 font-bold text-lg transition-all flex items-center justify-center space-x-2 space-x-reverse shadow-lg shadow-blue-500/20 mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>جاري الدخول...</span>
                </>
              ) : (
                <span>تسجيل الدخول</span>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}