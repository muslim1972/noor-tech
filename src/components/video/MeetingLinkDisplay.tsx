"use client";

import React from 'react';
import { Copy, Check, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface MeetingLinkDisplayProps {
  meetingUrl: string;
  onCopy: () => void;
  isCopied: boolean;
}

export default function MeetingLinkDisplay({ meetingUrl, onCopy, isCopied }: MeetingLinkDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-slate-300">
        <LinkIcon size={18} />
        <span className="text-sm font-medium">رابط الانضمام إلى الاجتماع</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 overflow-hidden">
          <p className="text-xs text-slate-400 font-sans truncate" dir="ltr">
            {meetingUrl}
          </p>
        </div>

        <button
          onClick={onCopy}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-all flex-shrink-0"
        >
          {isCopied ? (
            <>
              <Check size={18} />
              <span className="text-sm font-medium">تم النسخ</span>
            </>
          ) : (
            <>
              <Copy size={18} />
              <span className="text-sm font-medium">نسخ الرابط</span>
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-slate-500 text-center">
        يمكنك نسخ هذا الرابط ومشاركته عبر تطبيقات المراسلة الأخرى
      </p>
    </motion.div>
  );
}
