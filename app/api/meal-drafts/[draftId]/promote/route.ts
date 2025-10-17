import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "@/lib/server/firebase-admin";

const INVALID_AUTH_RESPONSE = NextResponse.json(
  { error: "Authentication required" },
  { status: 401 },
);

const parseBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true;
    }

    if (value.toLowerCase() === "false") {
      return false;
    }
  }

  return fallback;
};

type MealDraftDoc = {
  name?: string;
  slot?: { id?: string; name?: string };
  image?: unknown;
  sourceFileName?: string | null;
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
  status?: string;
  analysis?: unknown;
};

type PromotePayload = {
  isEstimated: boolean;
};

const parsePayload = async (request: NextRequest): Promise<PromotePayload | null> => {
  try {
    const body = await request.json();
    return { isEstimated: parseBoolean(body?.isEstimated, true) };
  } catch (error) {
    console.error("Failed to parse promote payload", error);
    return null;
  }
};

export const POST = async (
  request: NextRequest,
  { params }: { params: { draftId: string } },
): Promise<NextResponse> => {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return INVALID_AUTH_RESPONSE;
  }

  const idToken = authHeader.slice("Bearer ".length);
  const auth = getFirebaseAdminAuth();

  let decodedToken: Awaited<ReturnType<typeof auth.verifyIdToken>>;

  try {
    decodedToken = await auth.verifyIdToken(idToken);
  } catch (error) {
    console.error("Failed to verify Firebase ID token", error);
    return INVALID_AUTH_RESPONSE;
  }

  const payload = await parsePayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const draftId = params.draftId;

  if (!draftId) {
    return NextResponse.json({ error: "Missing draft id" }, { status: 400 });
  }

  let firestore: ReturnType<typeof getFirebaseAdminFirestore>;

  try {
    firestore = getFirebaseAdminFirestore();
  } catch (error) {
    console.error("Failed to initialize Firebase Admin Firestore", error);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const draftRef = firestore.doc(`users/${decodedToken.uid}/mealDrafts/${draftId}`);
  const logsCollection = firestore.collection(`users/${decodedToken.uid}/mealLogs`);

  console.info("[PromoteMealDraft] Starting transaction", {
    uid: decodedToken.uid,
    draftId,
    isEstimated: payload.isEstimated,
  });

  try {
    const result = await firestore.runTransaction(async (transaction) => {
      const draftSnapshot = await transaction.get(draftRef);

      if (!draftSnapshot.exists) {
        throw new Error("draft-not-found");
      }

      const draftData = draftSnapshot.data() as MealDraftDoc;

      if (draftData.status !== "draft") {
        throw new Error("draft-not-ready");
      }

      const logRef = logsCollection.doc();
      const slot = draftData.slot ?? {};

      transaction.set(logRef, {
        name: (draftData.name ?? "Untitled meal").trim() || "Untitled meal",
        slot: {
          id: (typeof slot.id === "string" && slot.id.trim()) || "unspecified",
          name: (typeof slot.name === "string" && slot.name.trim()) || slot.id || "Meal",
        },
        image: draftData.image ?? null,
        sourceFileName: draftData.sourceFileName ?? null,
        createdAt: draftData.createdAt ?? FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        analysis: draftData.analysis ?? null,
        isEstimated: payload.isEstimated,
        sourceDraftId: draftId,
        promotedAt: FieldValue.serverTimestamp(),
      });

      transaction.delete(draftRef);

      return { logId: logRef.id };
    });

    console.info("[PromoteMealDraft] Draft promoted", {
      uid: decodedToken.uid,
      draftId,
      logId: result.logId,
    });

    return NextResponse.json({ ok: true, logId: result.logId });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "draft-not-found") {
        console.warn("[PromoteMealDraft] Draft not found", { uid: decodedToken.uid, draftId });
        return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      }

      if (error.message === "draft-not-ready") {
        console.warn("[PromoteMealDraft] Draft not ready", {
          uid: decodedToken.uid,
          draftId,
          reason: error.message,
        });
        return NextResponse.json({ error: "Draft is not ready for promotion" }, { status: 400 });
      }
    }

    console.error("Failed to promote meal draft", error, { uid: decodedToken.uid, draftId });
    return NextResponse.json({ error: "Failed to promote meal draft" }, { status: 500 });
  }
};

