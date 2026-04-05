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
      }).then(async () => {
        console.log('OneSignal initialized successfully');
        
        // التحقق من وجود مستخدم مسجل مسبقاً في الذاكرة المحلية لربطه أولاً
        const storedUser = localStorage.getItem('noortech_user');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            if (user.id && typeof OS.login === 'function') {
              // تسجيل الدخول بدون await لتجنب حظر الطلب اللاحق
              OS.login(user.id).catch((err: any) => console.error('OneSignal login failed:', err));
              console.log('OneSignal: Login request sent for', user.id);
            }
          } catch (e) {
            console.error('OneSignal: Error parsing stored user', e);
          }
        }

        // إظهار نافذة طلب الإذن
        try {
          console.log('OneSignal: Attempting to show Slidedown prompt...');
          await OS.Slidedown.promptPush();
        } catch (err) {
          console.error('OneSignal: Error with permission flow', err);
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
