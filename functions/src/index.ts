import * as logger from "firebase-functions/logger";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { sendEmail } from "./emailProvider";

admin.initializeApp();
const db = admin.firestore();

export const processNotification = onDocumentCreated(
  {
    document: "notifications/{notificationId}",
    secrets: ["EMAIL_PROVIDER_API_KEY", "SENDER_EMAIL"],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.error("No data associated with the event");
      return;
    }

    const notificationId = event.params.notificationId;
    const notification = snapshot.data();
    
    logger.info(`Processing new notification: ${notificationId} for user: ${notification.userId}`);

    try {
      // 1. Look up the target user to get their email address
      const userDoc = await db.collection("users").doc(notification.userId).get();
      if (!userDoc.exists) {
        throw new Error(`Target user ${notification.userId} not found`);
      }
      
      const userData = userDoc.data();
      const userEmail = userData?.email;

      if (!userEmail) {
        throw new Error(`Target user ${notification.userId} does not have an email address`);
      }

      // 2. Format the email
      const subject = `FlatFlow: ${notification.title}`;
      const htmlBody = `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
          <h2>${notification.title}</h2>
          <p>${notification.message}</p>
          <hr style="border: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="color: #666; font-size: 12px;">You are receiving this notification from FlatFlow because you are an active house member.</p>
        </div>
      `;

      // 3. Send the email using the provider abstraction
      const result = await sendEmail({
        to: userEmail,
        subject,
        html: htmlBody
      });

      // 4. Log the result to the emailLogs collection
      const logRef = db.collection("emailLogs").doc();
      await logRef.set({
        houseId: notification.houseId,
        userId: notification.userId,
        to: userEmail,
        type: notification.type,
        subject,
        status: result.success ? "sent" : "failed",
        provider: "resend",
        errorMessage: result.error || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (!result.success) {
        logger.error(`Failed to send email to ${userEmail}: ${result.error}`);
      } else {
        logger.info(`Successfully dispatched email to ${userEmail}`);
      }

    } catch (error: any) {
      logger.error(`Error processing notification ${notificationId}:`, error);
      
      // Attempt to log the catastrophic failure
      try {
        await db.collection("emailLogs").add({
          houseId: notification.houseId,
          userId: notification.userId,
          to: "unknown",
          type: notification.type,
          subject: notification.title,
          status: "failed",
          provider: "system",
          errorMessage: error.message || "Unknown catastrophic error",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (logError) {
        logger.error("Failed to write to emailLogs during error catch", logError);
      }
    }
  }
);
