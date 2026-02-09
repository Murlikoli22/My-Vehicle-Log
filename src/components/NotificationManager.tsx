'use client';
import { useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { requestPermissionAndToken, saveTokenToDb, setupForegroundMessageHandler } from '@/firebase/messaging-client';
import { useToast } from '@/hooks/use-toast';

// IMPORTANT: REPLACE THIS WITH YOUR VAPID KEY FROM THE FIREBASE CONSOLE
// Project Settings > Cloud Messaging > Web configuration
const VAPID_KEY = 'YOUR_VAPID_KEY_HERE';

export function NotificationManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        if ('serviceWorker' in navigator && user) {
            navigator.serviceWorker
                .register('/firebase-messaging-sw.js')
                .then(async (registration) => {
                    console.log('Service Worker registered with scope:', registration.scope);

                    if(VAPID_KEY === 'YOUR_VAPID_KEY_HERE') {
                        console.warn("Push notifications are not fully configured. Please replace 'YOUR_VAPID_KEY_HERE' in src/components/NotificationManager.tsx with your actual VAPID key from the Firebase Console.");
                        return;
                    }

                    const token = await requestPermissionAndToken(VAPID_KEY);
                    if (token) {
                        await saveTokenToDb(firestore, user, token);
                    }
                })
                .catch((err) => {
                    console.error('Service Worker registration failed:', err);
                });
        }
    }, [user, firestore]);

    useEffect(() => {
        if (user) {
            setupForegroundMessageHandler((payload) => {
                if (payload.notification) {
                  toast({
                      title: payload.notification.title,
                      description: payload.notification.body,
                  });
                }
            });
        }
    }, [user, toast]);

    return null; // This component doesn't render anything
}
