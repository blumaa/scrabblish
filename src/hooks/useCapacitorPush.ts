import { useState, useEffect, useCallback } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../lib/supabase';
import { getAppContext } from '../lib/app-context';

export function useCapacitorPush(userId: string | null) {
  const [enabled, setEnabled] = useState(false);
  const supported = getAppContext() === 'capacitor';

  useEffect(() => {
    if (!supported || !userId) return;

    // Check if user already has an iOS push token stored
    supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)
      .eq('platform', 'ios')
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setEnabled(true);
      });
  }, [userId, supported]);

  useEffect(() => {
    if (!supported) return;

    // Listen for notification taps (app opened from notification)
    const actionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification) => {
        const url = notification.notification.data?.url;
        if (url && typeof url === 'string') {
          window.location.href = url;
        }
      },
    );

    return () => {
      actionListener.then(handle => handle.remove());
    };
  }, [supported]);

  const registerPush = useCallback(async () => {
    if (!supported || !userId) return false;

    try {
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') return false;

      // Set up registration listener before calling register
      const tokenPromise = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Registration timeout')), 10000);

        PushNotifications.addListener('registration', (token) => {
          clearTimeout(timeout);
          resolve(token.value);
        });

        PushNotifications.addListener('registrationError', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      await PushNotifications.register();
      const deviceToken = await tokenPromise;

      // Store the token
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: userId,
          token: deviceToken,
          platform: 'ios',
          last_used_at: new Date().toISOString(),
        }, { onConflict: 'user_id,token' });

      if (error) throw error;

      setEnabled(true);
      return true;
    } catch (err) {
      console.error('Capacitor push registration failed:', err);
      return false;
    }
  }, [userId, supported]);

  const unregisterPush = useCallback(async () => {
    if (!supported) return;

    try {
      await PushNotifications.removeAllListeners();

      if (userId) {
        await supabase
          .from('push_tokens')
          .delete()
          .eq('user_id', userId)
          .eq('platform', 'ios');
      }

      setEnabled(false);
    } catch (err) {
      console.error('Capacitor push unregister failed:', err);
    }
  }, [userId, supported]);

  return {
    supported,
    enabled,
    registerPush,
    unregisterPush,
  };
}
