import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// This function runs every day at 9:00 AM UTC.
export const sendReminderNotifications = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const userId = userDoc.id;

      if (!user.fcmTokens || user.fcmTokens.length === 0) {
        functions.logger.log(`User ${userId} has no FCM tokens. Skipping.`);
        continue;
      }

      const vehiclesSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("vehicles")
        .get();

      for (const vehicleDoc of vehiclesSnapshot.docs) {
        const vehicle = vehicleDoc.data();
        const vehicleId = vehicleDoc.id;

        const documentsSnapshot = await db
          .collection("users")
          .doc(userId)
          .collection("vehicles")
          .doc(vehicleId)
          .collection("documents")
          .get();

        for (const docSnapshot of documentsSnapshot.docs) {
          const document = docSnapshot.data();

          if (document.expiryDate) {
            const expiry = new Date(document.expiryDate);

            // Check if the document expires within the next 30 days but hasn't expired yet
            if (expiry > now && expiry <= thirtyDaysFromNow) {
              const daysUntilExpiry = Math.ceil(
                (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );

              const payload = {
                notification: {
                  title: "Upcoming Vehicle Document Expiry",
                  body:
                    `${vehicle.brand} ${vehicle.model}'s ${document.documentType} ` +
                    `is expiring in ${daysUntilExpiry} days.`,
                  icon: "/logo-192.png",
                },
              };

              functions.logger.log(
                `Sending notification to user ${userId} for vehicle ${vehicleId}`,
                payload
              );

              try {
                await admin.messaging().sendToDevice(user.fcmTokens, payload);
              } catch (error) {
                functions.logger.error(
                  `Error sending notification to user ${userId}:`,
                  error
                );
                // Optional: Clean up invalid tokens here if needed
              }
            }
          }
        }
      }
    }
  });
