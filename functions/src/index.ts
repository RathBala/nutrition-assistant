import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

import { runStubMealAnalysis } from "./analysis/stub";

type MealLogDoc = {
  analysisStatus?: string;
  image?: {
    storagePath?: string;
    downloadURL?: string;
  } | null;
  name?: string | null;
};

type MealAnalysisStatus = "pending" | "processing" | "complete" | "error";

const fieldValue = admin.firestore.FieldValue;

if (!admin.apps.length) {
  admin.initializeApp();
}

const buildErrorPayload = (code: string, message: string) => ({
  code,
  message,
});

export const mealLogsOnCreate = functions.firestore
  .document("users/{uid}/mealLogs/{mealId}")
  .onCreate(async (snapshot, context) => {
    functions.logger.info("Meal log created; evaluating trigger", {
      uid: context.params.uid,
      mealId: context.params.mealId,
      initialStatus: snapshot.get("analysisStatus") ?? "pending",
    });

    const data = snapshot.data() as MealLogDoc;
    const status = (data.analysisStatus ?? "pending") as MealAnalysisStatus;

    if (status !== "pending") {
      functions.logger.info("Skipping meal analysis; status is not pending", {
        uid: context.params.uid,
        mealId: context.params.mealId,
        status,
      });
      return;
    }

    functions.logger.info("Marking meal log analysis as processing", {
      uid: context.params.uid,
      mealId: context.params.mealId,
    });

    await snapshot.ref
      .update({
        analysisStatus: "processing",
        analysisStartedAt: fieldValue.serverTimestamp(),
        updatedAt: fieldValue.serverTimestamp(),
      })
      .then(() => {
        functions.logger.info("Meal log status updated to processing", {
          uid: context.params.uid,
          mealId: context.params.mealId,
        });
      });

    try {
      const storagePath = data.image?.storagePath;
      const mealName = typeof data.name === "string" ? data.name.trim() : "";

      let imageBuffer: Buffer | null = null;

      if (storagePath) {
        functions.logger.info("Downloading meal image for analysis", {
          uid: context.params.uid,
          mealId: context.params.mealId,
          storagePath,
        });

        const bucket = admin.storage().bucket();
        const [buffer] = await bucket.file(storagePath).download();
        imageBuffer = buffer;

        functions.logger.info("Image download complete; running stub analysis", {
          uid: context.params.uid,
          mealId: context.params.mealId,
          bufferSize: buffer.length,
        });
      } else if (mealName) {
        functions.logger.info("No meal image provided; using name for stub analysis", {
          uid: context.params.uid,
          mealId: context.params.mealId,
          mealName,
        });
      } else {
        functions.logger.error("Meal log missing both image and name; aborting analysis", {
          uid: context.params.uid,
          mealId: context.params.mealId,
        });
        throw new Error("missing-input");
      }

      const analysis = await runStubMealAnalysis({
        imageBuffer,
        mealName,
      });

      functions.logger.info("Meal analysis complete; updating meal log", {
        uid: context.params.uid,
        mealId: context.params.mealId,
        analysisSummary: {
          calories: analysis.calories,
          items: analysis.items.length,
        },
      });

      await snapshot.ref.update({
        analysisStatus: "complete",
        analysis,
        analysisCompletedAt: fieldValue.serverTimestamp(),
        updatedAt: fieldValue.serverTimestamp(),
        analysisError: fieldValue.delete(),
      });
    } catch (error) {
      let code = "analysis_failed";
      let message = "We couldn’t analyze this meal.";

      if (error instanceof Error && error.message === "missing-image") {
        code = "missing_image";
        message = "Meal log is missing an image path.";
      }

      if (error instanceof Error && error.message === "missing-input") {
        code = "missing_input";
        message = "Meal log is missing details for analysis.";
      }

      functions.logger.error("Meal analysis failed", error, {
        uid: context.params.uid,
        mealId: context.params.mealId,
        status,
      });

      await snapshot.ref.update({
        analysisStatus: "error",
        analysis: fieldValue.delete(),
        analysisCompletedAt: fieldValue.delete(),
        updatedAt: fieldValue.serverTimestamp(),
        analysisError: buildErrorPayload(code.toUpperCase(), message),
      });
    }
  });
