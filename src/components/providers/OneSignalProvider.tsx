"use client";

import React, { useEffect } from 'react';

interface OneSignalProviderProps {
  children: React.ReactNode;
}

export default function OneSignalProvider({ children }: OneSignalProviderProps) {
  useEffect(() => {
    // التأكد من أن الكود يعمل في المتصفح فقط
    if (typeof window === 'undefined') return;

    // تخطي التهيئة على localhost إذا رغبت، لكن للتجربة سنتركها
    // if (window.location.hostname === 'localhost') return;

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) {
      console.warn('OneSignal: NEXT_PUBLIC_ONESIGNAL_APP_ID is missing');
      return;
    }

    const initOS = (OS: any) => {
      OS.init({
        appId: appId,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: {
          enable: false,
        },
      }).then(async () => {
        console.log('OneSignal initialized successfully');
        
        // إظهار نافذة طلب الإذن إذا لم يكن مفعلاً
        try {
          const isEnabled = await OS.Notifications.permission;
          if (!isEnabled) {
            await OS.Slidedown.promptPush({ force: true });
            console.log('OneSignal: Slidedown prompt shown');
          }
        } catch (err) {
          console.error('OneSignal: Error showing prompt', err);
        }

        // التحقق من وجود مستخدم مسجل مسبقاً في الذاكرة المحلية لربطه
        const storedUser = localStorage.getItem('noortech_user');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            if (user.id && typeof OS.login === 'function') {
              OS.login(user.id);
              console.log('OneSignal: Logged in as', user.id);
            }
          } catch (e) {
            console.error('OneSignal: Error parsing stored user', e);
          }
        }
      });
    };

    // التحقق مما إذا كان السكريبت محملاً بالفعل
    const OneSignal = (window as any).OneSignal;
    if (OneSignal) {
      initOS(OneSignal);
    } else {
      // استخدام OneSignalDeferred لانتظار تحميل السكريبت
      const OneSignalDeferred = (window as any).OneSignalDeferred || [];
      (window as any).OneSignalDeferred = OneSignalDeferred;
      OneSignalDeferred.push((OS: any) => {
        initOS(OS);
      });
    }
  }, []);

  return <>{children}</>;
}
