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
    functions.logger.info("Meal draft created; evaluating trigger", {
      uid: context.params.uid,
      draftId: context.params.draftId,
      initialStatus: snapshot.get("status") ?? "pending",
    });

    const data = snapshot.data() as MealDraftDoc;
    const status = (data.status ?? "pending") as MealDraftStatus;

    if (status !== "pending") {
      functions.logger.info("Skipping meal draft processing; status is not pending", {
        uid: context.params.uid,
        draftId: context.params.draftId,
        status,
      });
      return;
    }

    functions.logger.info("Marking meal draft as processing", {
      uid: context.params.uid,
      draftId: context.params.draftId,
    });

    await snapshot.ref
      .update({
        status: "processing",
        analysisStartedAt: fieldValue.serverTimestamp(),
        updatedAt: fieldValue.serverTimestamp(),
      })
      .then(() => {
        functions.logger.info("Meal draft status updated to processing", {
          uid: context.params.uid,
          draftId: context.params.draftId,
        });
      });

    try {
      const storagePath = data.image?.storagePath;

      if (!storagePath) {
        functions.logger.error("Meal draft missing storage path; aborting analysis", {
          uid: context.params.uid,
          draftId: context.params.draftId,
        });
        throw new Error("missing-image");
      }

      functions.logger.info("Downloading meal draft image for analysis", {
        uid: context.params.uid,
        draftId: context.params.draftId,
        storagePath,
      });

      const bucket = admin.storage().bucket();
      const [buffer] = await bucket.file(storagePath).download();
      functions.logger.info("Image download complete; running stub analysis", {
        uid: context.params.uid,
        draftId: context.params.draftId,
        bufferSize: buffer.length,
      });

      const analysis = await runStubMealAnalysis(buffer);

      functions.logger.info("Meal analysis complete; updating draft", {
        uid: context.params.uid,
        draftId: context.params.draftId,
        analysisSummary: {
          calories: analysis.calories,
          items: analysis.items.length,
        },
      });

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
        status,
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
