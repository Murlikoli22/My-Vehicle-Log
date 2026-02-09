// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here, other Firebase services
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
const firebaseConfig = {
  "projectId": "studio-6312432449-3dd8c",
  "appId": "1:829333176938:web:baa5494d83dc363f42c013",
  "apiKey": "AIzaSyBo7d2Nv3ATK2ruyzcj__CPfkNueu-drPQ",
  "authDomain": "studio-6312432449-3dd8c.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "829333176938"
};

firebase.initializeApp(firebaseConfig);


// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  if (!payload.notification) {
    return;
  }

  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png' // Ensure you have an icon file at this path in your public folder
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
