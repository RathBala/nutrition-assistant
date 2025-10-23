import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  getFirebaseAdminAuth,
  getFirebaseAdminFirestore,
  getFirebaseAdminStorage,
} from "@/lib/server/firebase-admin";
import { runStubMealAnalysis } from "@/lib/server/stub-meal-analysis";

const INVALID_AUTH_RESPONSE = NextResponse.json(
  { error: "Authentication required" },
  { status: 401 },
);

const buildErrorPayload = (code: string, message: string) => ({
  code,
  message,
});

type MealLogDoc = {
  analysisStatus?: string | null;
  name?: string | null;
  image?: {
    storagePath?: string;
    downloadURL?: string;
  } | null;
};

type MealAnalysisStatus = "pending" | "processing" | "complete" | "error";

const parseStatus = (value: unknown): MealAnalysisStatus => {
  if (value === "processing" || value === "complete" || value === "error") {
    return value;
  }

  return "pending";
};

export const POST = async (
  request: NextRequest,
  { params }: { params: { mealId?: string } },
): Promise<NextResponse> => {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return INVALID_AUTH_RESPONSE;
  }

  const idToken = authHeader.slice("Bearer ".length);

  let auth: ReturnType<typeof getFirebaseAdminAuth>;

  try {
    auth = getFirebaseAdminAuth();
  } catch (error) {
    console.error("[AnalyzeMealLog] Failed to initialize Firebase Admin auth", error);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let decodedToken: Awaited<ReturnType<typeof auth.verifyIdToken>>;

  try {
    decodedToken = await auth.verifyIdToken(idToken);
  } catch (error) {
    console.error("[AnalyzeMealLog] Failed to verify token", error);
    return INVALID_AUTH_RESPONSE;
  }

  const mealId = params.mealId;

  if (!mealId) {
    return NextResponse.json({ error: "Missing meal id" }, { status: 400 });
  }

  let firestore: ReturnType<typeof getFirebaseAdminFirestore>;

  try {
    firestore = getFirebaseAdminFirestore();
  } catch (error) {
    console.error("[AnalyzeMealLog] Failed to initialize Firestore", error);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  const mealLogRef = firestore.doc(`users/${decodedToken.uid}/mealLogs/${mealId}`);
  const snapshot = await mealLogRef.get();

  if (!snapshot.exists) {
    return NextResponse.json({ error: "Meal log not found" }, { status: 404 });
  }

  const data = snapshot.data() as MealLogDoc;
  const status = parseStatus(data.analysisStatus);

  if (status !== "pending") {
    return NextResponse.json({ ok: true, status });
  }

  await mealLogRef.update({
    analysisStatus: "processing",
    analysisStartedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  try {
    const storagePath = data.image?.storagePath;
    const mealName = typeof data.name === "string" ? data.name.trim() : "";

    let imageBuffer: Buffer | null = null;

    if (storagePath) {
      let storage: ReturnType<typeof getFirebaseAdminStorage>;

      try {
        storage = getFirebaseAdminStorage();
      } catch (error) {
        console.error("[AnalyzeMealLog] Failed to initialize storage", error);
        throw new Error("storage-unavailable");
      }

      const bucket = storage.bucket();
      const [buffer] = await bucket.file(storagePath).download();
      imageBuffer = buffer;
    } else if (!mealName) {
      throw new Error("missing-input");
    }

    const analysis = await runStubMealAnalysis({
      imageBuffer,
      mealName,
    });

    await mealLogRef.update({
      analysisStatus: "complete",
      analysis,
      analysisCompletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      analysisError: FieldValue.delete(),
    });

    return NextResponse.json({ ok: true, status: "complete", analysis });
  } catch (error) {
    console.error("[AnalyzeMealLog] Failed to analyze meal log", error, {
      uid: decodedToken.uid,
      mealId,
    });

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

    if (error instanceof Error && error.message === "storage-unavailable") {
      code = "storage_unavailable";
      message = "Storage is temporarily unavailable. Try again soon.";
    }

    await mealLogRef.update({
      analysisStatus: "error",
      analysis: FieldValue.delete(),
      analysisCompletedAt: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
      analysisError: buildErrorPayload(code.toUpperCase(), message),
    });

    return NextResponse.json({ error: message, status: "error" }, { status: 500 });
  }
};
