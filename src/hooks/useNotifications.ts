import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useNotifications(userId: string | null) {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    // Check if user already has a push token stored
    if (userId) {
      supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId)
        .eq('platform', 'web')
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) setEnabled(true);
        });
    }
  }, [userId]);

  const registerPush = useCallback(async () => {
    if (!userId || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    try {
      // Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      // Get existing service worker registration (registered by vite-plugin-pwa)
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) return false;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      // Store the subscription in push_tokens
      const token = JSON.stringify(subscription);
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: userId,
          token,
          platform: 'web',
          last_used_at: new Date().toISOString(),
        }, { onConflict: 'user_id,token' });

      if (error) throw error;

      setEnabled(true);
      return true;
    } catch (err) {
      console.error('Push registration failed:', err);
      return false;
    }
  }, [userId]);

  const unregisterPush = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Remove token from DB
      if (userId) {
        await supabase
          .from('push_tokens')
          .delete()
          .eq('user_id', userId)
          .eq('platform', 'web');
      }

      setEnabled(false);
    } catch (err) {
      console.error('Push unregister failed:', err);
    }
  }, [userId]);

  return {
    enabled,
    permission,
    registerPush,
    unregisterPush,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
