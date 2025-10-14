# Meal Image Upload MVP Technical Plan

## Overview
Deliver a minimal workflow that lets users attach a meal photo and persist it in Firebase Storage. This milestone keeps the feature focused strictly on file upload so that we can verify storage integration before layering on AI analysis or additional metadata.

## Scope
- Add a "Log a Meal" entry point that opens a modal dedicated to image upload.
- Allow users to select or capture a single image, preview it, and confirm the upload.
- Upload the confirmed file to Firebase Storage under a user-specific path and return the storage reference (path + download URL).
- Surface success and error feedback within the modal so the user knows whether the image is ready for later meal logging steps.
- Out of scope: AI analysis, EXIF stripping, feature flags, analytics instrumentation, and automated test coverage.

## User Flow
1. User clicks the "Log a Meal" button.
2. Modal opens prompting the user to choose or drag in an image.
3. Selected image is previewed with filename and file size.
4. User confirms upload; UI shows a simple progress indicator.
5. On success, modal shows a confirmation state and returns `{ storagePath, downloadUrl, uploadedAt }` to the caller.
6. Calling code stores the reference (e.g., in local state or Firestore) for future use and closes the modal.

## Client Implementation
- Build a `MealImageUploadModal` component responsible for file selection, preview, upload, and result callbacks.
- Track component state: `selectedFile`, `previewUrl`, `isUploading`, `progress`, `error`, and `result`.
- Disable the confirm button until a file passes validation (JPEG/PNG/HEIC and <= 10 MB).
- Use the Firebase Web SDK `uploadBytesResumable` to push the file to `meal-images/${uid}/${timestamp}-${filename}` and capture progress updates.
- After upload, call `getDownloadURL` and resolve the metadata object to the parent via `onUploadComplete`.
- Provide a cancel button that clears local state; if canceling mid-upload, call `task.cancel()` so Firebase stops the transfer.

## Error Handling
- Show inline errors for validation failures (unsupported type, file too large) before starting the upload.
- Surface Firebase errors (permission denied, quota exceeded, network issues) with a retry button that restarts the upload using the same file.
- Ensure the modal stays open on failure so the user can retry or pick another image.

## What You Need to Enable
To turn on this MVP in your environment:
1. **Firebase project setup**: Ensure the web app is configured with Firebase SDK credentials that include Storage access.
2. **Storage bucket**: Confirm the default Firebase Storage bucket exists; no additional buckets are required.
3. **Storage rules**: Deploy rules that restrict writes to authenticated users and limit uploads to expected MIME types and file sizes. Example:
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /meal-images/{userId}/{allPaths=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId &&
           request.resource.size < 10 * 1024 * 1024 &&
           request.resource.contentType.matches('image/.*');
       }
     }
   }
   ```
   Deploy with `firebase deploy --only storage` once the rule file is updated.
4. **Environment variables**: Provide the client with `NEXT_PUBLIC_FIREBASE_*` config values (apiKey, authDomain, projectId, storageBucket, etc.).
5. **Authentication**: Ensure the upload flow runs after the user is signed in so `uid` is available for path scoping.

With those steps completed, the application can upload meal images and persist their references without additional backend changes.
