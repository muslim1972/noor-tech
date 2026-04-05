"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, X, CheckCircle2, UserCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Profile {
  id: string;
  full_name: string;
  job_number: string;
  avatar_url?: string;
  avatar?: string;
}

interface ParticipantSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMeeting: (selectedIds: string[]) => void;
  isStarting: boolean;
  currentUserJobNumber: string; // حتى لا يظهر المستخدم نفسه في القائمة
}

export default function ParticipantSearchModal({
  isOpen,
  onClose,
  onStartMeeting,
  isStarting,
  currentUserJobNumber
}: ParticipantSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  // بحث ذكي يتفاعل مع كل تغيير في الحقل
  useEffect(() => {
    if (!isOpen) return;

    const searchEmployees = async () => {
      // إذا كان الحقل فارغاً، نعرض بعض الموظفين بشكل افتراضي (أو نتركه فارغاً)
      const query = supabase
        .from('profiles')
        .select('id, full_name, job_number, avatar_url, avatar')
        .neq('job_number', currentUserJobNumber) // استثناء الشخص نفسه
        .limit(20);

      if (searchTerm.trim() !== '') {
        query.ilike('full_name', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        startTransition(() => {
          setResults(data);
        });
      }
    };

    // تقليل الطلبات السريعة (Debouncing) بسيط
    const timeoutId = setTimeout(() => {
      searchEmployees();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, isOpen, currentUserJobNumber]);

  // إغلاق المودال وتصفير البيانات
  const handleClose = () => {
    if (isStarting) return;
    setSearchTerm('');
    setSelectedIds(new Set());
    onClose();
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectedCount = selectedIds.size;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-arabic" dir="rtl">
        {/* خلفية معتمة */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* المودال */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">بدء اجتماع خاص</h2>
              <p className="text-sm text-slate-400 mt-1">اختر الموظفين الذين تود إرسال دعوة لهم</p>
            </div>
            <button 
              onClick={handleClose}
              disabled={isStarting}
              className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/50">
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث عن موظف (بالاسم)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
              />
              <Search className="absolute right-4 top-3.5 text-slate-500" size={20} />
              {isPending && <Loader2 className="absolute left-4 top-3.5 text-blue-500 animate-spin" size={20} />}
            </div>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-900/30">
            {results.length === 0 ? (
              <div className="text-center py-10 text-slate-500 flex flex-col items-center">
                {searchTerm ? 'لم يتم العثور على موظفين بهذا الاسم' : 'اكتب للبحث عن الموظفين...'}
              </div>
            ) : (
              results.map((profile) => {
                const isSelected = selectedIds.has(profile.id);
                const avatar = profile.avatar_url || profile.avatar;

                return (
                  <motion.div 
                    key={profile.id}
                    layout
                    onClick={() => toggleSelection(profile.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer border transition-all ${
                      isSelected 
                        ? 'bg-blue-900/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                        : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {avatar ? (
                        <img src={avatar} alt={profile.full_name} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                          <UserCircle size={24} />
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium text-white">{profile.full_name}</h4>
                        <p className="text-xs text-slate-400 font-sans tracking-wide">{profile.job_number}</p>
                      </div>
                    </div>
                    
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-500 text-transparent'
                    }`}>
                      <CheckCircle2 size={16} className={isSelected ? 'block' : 'hidden'} />
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Footer & Start Action */}
          <div className="p-6 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-sm">المشاركين:</span>
              <span className={`font-bold text-lg px-3 py-1 rounded-lg ${selectedCount > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800'}`}>
                {selectedCount}
              </span>
            </div>
            
            <button
              onClick={() => onStartMeeting(Array.from(selectedIds))}
              disabled={selectedCount === 0 || isStarting}
              className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                selectedCount > 0 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isStarting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>جاري الإنشاء...</span>
                </>
              ) : (
                <span>بدء الجلسة الآن</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
