import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

import { runStubMealAnalysis } from "./analysis/stub";

type MealDraftDoc = {
  status?: string;
  image?: {
    storagePath?: string;
    downloadURL?: string;
  } | null;
  autoPromoteDelayMinutes?: number;
};

type MealDraftStatus = "pending" | "processing" | "draft" | "error";

const fieldValue = admin.firestore.FieldValue;

if (!admin.apps.length) {
  admin.initializeApp();
}

const buildErrorPayload = (code: string, message: string) => ({
  code,
  message,
});

export const mealDraftsOnCreate = functions.firestore
  .document("users/{uid}/mealDrafts/{draftId}")
  .onCreate(async (snapshot, context) => {
    const data = snapshot.data() as MealDraftDoc;
    const status = (data.status ?? "pending") as MealDraftStatus;

    if (status !== "pending") {
      return;
    }

    await snapshot.ref.update({
      status: "processing",
      analysisStartedAt: fieldValue.serverTimestamp(),
      updatedAt: fieldValue.serverTimestamp(),
    });

    try {
      const storagePath = data.image?.storagePath;

      if (!storagePath) {
        throw new Error("missing-image");
      }

      const bucket = admin.storage().bucket();
      const [buffer] = await bucket.file(storagePath).download();
      const analysis = await runStubMealAnalysis(buffer);

      await snapshot.ref.update({
        status: "draft",
        analysis,
        analysisCompletedAt: fieldValue.serverTimestamp(),
        updatedAt: fieldValue.serverTimestamp(),
      });
    } catch (error) {
      let code = "analysis_failed";
      let message = "We couldn’t analyze this meal.";

      if (error instanceof Error && error.message === "missing-image") {
        code = "missing_image";
        message = "Meal draft is missing an image path.";
      }

      functions.logger.error("Meal draft analysis failed", error, {
        uid: context.params.uid,
        draftId: context.params.draftId,
      });

      await snapshot.ref.update({
        status: "error",
        error: buildErrorPayload(code.toUpperCase(), message),
        analysis: fieldValue.delete(),
        analysisCompletedAt: fieldValue.delete(),
        updatedAt: fieldValue.serverTimestamp(),
      });
    }
  });

