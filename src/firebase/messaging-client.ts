'use client';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getApp } from 'firebase/app';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';

export async function requestPermissionAndToken(vapidKey: string): Promise<string | null> {
    const messaging = getMessaging(getApp());
    
    // Check for notification support.
    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification");
        return null;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        try {
            const currentToken = await getToken(messaging, { vapidKey });
            if (currentToken) {
                console.log('FCM Token:', currentToken);
                return currentToken;
            } else {
                console.log('No registration token available. Request permission to generate one.');
                return null;
            }
        } catch (err) {
            console.error('An error occurred while retrieving token. ', err);
            return null;
        }
    } else {
        console.log('Unable to get permission to notify.');
        return null;
    }
}

export async function saveTokenToDb(firestore: Firestore, user: User, token: string) {
    if (!user || !firestore) return;
    try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            // Avoid duplicates
            if (userData.fcmTokens && userData.fcmTokens.includes(token)) {
                console.log('FCM token already exists for this user.');
                return;
            }
        }

        await updateDoc(userDocRef, {
            fcmTokens: arrayUnion(token)
        });
        console.log('FCM token saved to user profile.');
    } catch (error) {
        console.error('Error saving FCM token:', error);
    }
}


export function setupForegroundMessageHandler(callback: (payload: any) => void) {
    const messaging = getMessaging(getApp());
    onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        callback(payload);
    });
}
