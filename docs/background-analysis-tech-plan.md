# Background Meal Analysis MVP Technical Plan (Firebase Cloud Functions, single upload)

## Overview
Implement the "background analysis with a ready nudge" UX variant for **single-image uploads**. When a user uploads one photo, it should appear immediately in their daily log with a pending state while the nutrition analysis runs asynchronously. Once the background job finishes, the card nudges the user to review or lets it auto-save after a grace period.

The existing stack (Next.js app, Firebase Auth/Firestore/Storage) is retained. Background work runs inside a Firebase Cloud Function so we can stay inside the free tier for a small user base and avoid managing extra infrastructure.

## Goals
- Allow users to upload exactly one photo per draft meal and see a **Pending analysis** status instantly.
- Process analysis server-side via a Firebase Cloud Function that updates the Firestore draft with items and macros once ready.
- Provide a lightweight in-app review step and auto-promotion to the meal log if ignored.
- Keep the MVP implementable with today’s Firebase setup plus a new Cloud Function.

## Non-Goals
- Multiple-image batching or gallery selection (explicitly scoped out for now).
- Push notifications, template suggestions, or fine-grained confidence tooling.
- Offline-first queuing beyond Firestore’s built-in offline cache.

## High-Level Architecture
1. **Single-image upload (client):** Update the upload UI to restrict to one image. After a successful upload to Firebase Storage, create a Firestore draft document with `status: "pending"` and the storage path.
2. **Background processing (Cloud Function):** A Firestore-triggered Cloud Function (`mealDraftsOnCreate`) runs whenever a draft with `status == 'pending'` is written. It downloads the image, invokes the stub analysis helper, and writes results back as `status: "draft"`.
3. **Client sync:** The Next.js client subscribes to the user’s `mealDrafts` collection. Pending cards render with a spinner; once `status` becomes `draft`, the UI swaps to show the macro summary and a **Review** action.
4. **Autosave promotion:** After a configurable delay (e.g., 5 minutes) without user edits, the client calls an authenticated API route hosted in Next.js (`/api/meal-drafts/:id/promote`) which promotes the draft into the `mealLogs` collection with `isEstimated: true` and deletes the draft.

## Data Model
- `mealDrafts/{uid}/entries/{entryId}`
  ```json
  {
    "uid": "USER_ID",
    "status": "pending" | "draft" | "error",
    "imagePath": "meal-images/USER_ID/ENTRY_ID.jpg",
    "createdAt": Timestamp,
    "analysis": {
      "items": [{ "name": "Salad", "quantity": 1, "unit": "plate" }],
      "calories": 320,
      "macros": { "protein": 12, "carbs": 28, "fat": 14 }
    },
    "analysisStartedAt": Timestamp,
    "analysisCompletedAt": Timestamp,
    "error": { "code": "ANALYSIS_TIMEOUT", "message": "..." }
  }
  ```
- `mealLogs/{uid}/{logId}` (existing) gains:
  - `isEstimated: boolean`
  - `sourceDraftId?: string`
  - `analysis?: MealAnalysisPayload` (copied from draft)

## Backend Implementation (Firebase)
- **Firestore-triggered Cloud Function:**
  - Add `functions/src/mealDraftsOnCreate.ts` (or extend existing `functions/src/index.ts`) with an `onCreate` trigger on `mealDrafts/{uid}/entries/{entryId}`.
  - Guard the trigger so it only runs for documents where `status === 'pending'` and no `analysis` is present.
  - Steps inside the function:
    1. Record `analysisStartedAt` and set `status: 'processing'` to avoid duplicate executions.
    2. Generate a signed URL for the uploaded image (or read via Admin SDK `getSignedUrl`).
    3. Call a local stub helper `runStubMealAnalysis(imageBuffer)` that returns deterministic macros/items.
    4. Update the draft with the analysis payload, `status: 'draft'`, and `analysisCompletedAt`.
  - Use built-in retries to handle transient failures (Cloud Functions automatically retries on thrown errors). Add a failure counter and, after N retries, set `status: 'error'` with a friendly message.

- **Analysis helper stub:**
  - Create `functions/src/analysis/stub.ts` exporting `runStubMealAnalysis` that mocks the AI response (e.g., returns a fixed set of macros based on image file size hash).
  - Keep this helper pure so it can be swapped for a real model call later.

- **Promotion API:**
  - Implement Next.js route `/api/meal-drafts/[draftId]/promote.ts`:
    1. Verify Firebase Auth token from the request.
    2. Read the draft, ensure `uid` matches request user and `status === 'draft'`.
    3. Write new doc to `mealLogs/{uid}` with `isEstimated` (true if autopromotion, false if manual review) and `analysis` data, set `promotedAt`.
    4. Delete the draft doc.

- **Security:**
  - Update Firestore rules so clients can create drafts with `status: 'pending'` and update fields such as `clientNotes`, but only the Cloud Function (via Admin SDK) can set `analysis` or change `status` to `draft/error`.
  - Promotion API runs server-side, so Firestore rules should prevent direct client deletion unless through Cloud Function operations.

## Frontend Implementation
- **Upload UI:** Limit file picker/camera to a single image. Update validation messages to reflect "One photo per meal".
- **Draft creation helper:** Extract a `createPendingDraft(imagePath)` function that writes the draft doc with `status: 'pending'`, `createdAt`, and `imagePath` only.
- **Draft list hook:** Implement `useMealDrafts` to subscribe to `mealDrafts/{uid}/entries` ordered by `createdAt`. Merge with Today log.
- **Card states:**
  - `pending`: show thumbnail, "Pending analysis" label, subtle spinner.
  - `draft`: show macros/items summary, `Review` pill, countdown badge until auto-save.
  - `error`: show "Couldn’t analyze" with `Retry` (sets `status: 'pending'`) and `Manual entry` link.
- **Review surface:** Bottom sheet/modal that displays AI items read-only with quick portion slider and ability to accept (`Save`) or discard (keep as draft). Save calls promotion API with `isEstimated: false`.
- **Autosave timer:** `useEffect` per draft: when `status` becomes `draft`, start timer (default 5 min). Pause if modal open or user interacts. When timer expires, call promotion API with `isEstimated: true`.

## Firebase Deployment Considerations
- **Cloud Functions setup:**
  - Add a `functions` directory managed via Firebase CLI (Node 18 runtime). Use `firebase deploy --only functions:mealDraftsOnCreate` to ship updates.
  - Configure local emulators (`firebase emulators:start --only functions,firestore,storage`) for integration testing.
- **Environment variables:**
  - If the stub analysis needs configuration (e.g., deterministic seed), set them via `firebase functions:config:set`.
  - Reuse existing client env vars on the Next.js app (`NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_ENABLE_BACKGROUND_ANALYSIS`).
- **Networking:** All work happens inside Firebase. No additional public endpoints are required beyond existing Firebase/Next.js deployments.
- **Scaling & retries:** Cloud Functions scales automatically. With only two users, the free tier should cover usage. Monitor Cloud Function retries and errors in the Firebase console.

## What You Need to Provide
1. **Firebase project access:** Confirm the Firebase project with Firestore/Storage is linked to the repo and Cloud Functions billing is enabled (Spark/free tier is fine for two users).
2. **Cloud Functions initialization:** Run `firebase init functions` (if not already) so we have the scaffold to add `mealDraftsOnCreate`.
3. **Stub analysis acceptance:** Confirm the deterministic stub response shape so we can hard-code copy/macro values that align with UX expectations.
4. **Firestore rules updates:** Approve the proposed rule changes that restrict who can set `analysis` fields and status transitions.
5. **Timeout preference:** Provide the desired auto-save window (default 5 minutes) so we can wire it as an env var (`NEXT_PUBLIC_DRAFT_AUTOSAVE_MINUTES`).

## Testing Plan
- **Local emulator suite:**
  - Use Firebase Emulator to run Firestore/Storage locally.
  - Run the Cloud Function locally against emulator (`firebase emulators:start --only functions,firestore,storage`).
  - Verify flow: create pending draft → function writes analysis → promotion API moves to `mealLogs`.
- **Integration manual test:**
  - Upload a single image in the dev app.
  - Confirm pending state shows instantly, transitions to draft with macros, review works, and autosave triggers.
  - Test error path by forcing the stub helper to throw (toggle a debug flag) and ensure the card shows the retry state.
- **Firebase staging check:**
  - Deploy the Cloud Function to a staging Firebase project or use feature flag gating in production.
  - Upload from staging web app and verify end-to-end behavior with the deployed function.

## Rollout
- Gate UI and Cloud Function updates behind `NEXT_PUBLIC_ENABLE_BACKGROUND_ANALYSIS` until staging QA completes.
- Monitor Firestore metrics (draft count, error rate, analysis latency) via logging and Firebase console.
- Once stable, enable the flag for production users.
