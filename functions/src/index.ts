import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

import { analysisSecrets, runOpenAIMealAnalysis } from "./analysis/openai";

const fieldValue = admin.firestore.FieldValue;

if (!admin.apps.length) {
  admin.initializeApp();
}

const buildErrorPayload = (code: string, message: string) => ({
  code,
  message,
});

export const mealLogsOnCreate = functions
  .runWith({ secrets: analysisSecrets })
  .firestore
  .document("users/{uid}/mealLogs/{logId}")
  .onCreate(async (snapshot: admin.firestore.DocumentSnapshot, context: functions.EventContext) => {
    functions.logger.info("Meal log created; running analysis", {
      uid: context.params.uid,
      logId: context.params.logId,
    });

    const data = snapshot.data() as {
      name?: string | null;
      image?: { storagePath?: string | null } | null;
    };

    try {
      const storagePath = data.image?.storagePath ?? undefined;
      const mealName = typeof data.name === "string" ? data.name.trim() : "";

      let imageBuffer: Buffer | null = null;

      if (storagePath) {
        const bucket = admin.storage().bucket();
        const [buffer] = await bucket.file(storagePath).download();
        imageBuffer = buffer;
        functions.logger.info("Downloaded image for meal log analysis", {
          uid: context.params.uid,
          logId: context.params.logId,
          bufferSize: buffer.length,
        });
      }

      if (!imageBuffer && !mealName) {
        throw new Error("missing-input");
      }

      const analysis = await runOpenAIMealAnalysis({ imageBuffer, mealName });

      await snapshot.ref.update({
        analysis,
        updatedAt: fieldValue.serverTimestamp(),
      });
    } catch (error) {
      functions.logger.error("Meal log analysis failed", error, {
        uid: context.params.uid,
        logId: context.params.logId,
      });

    }
  });
