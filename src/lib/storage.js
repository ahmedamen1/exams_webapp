import { app, isFirebaseConfigured } from "./firebase";

export async function uploadQuestionImage(file, examId, questionId) {
  if (!isFirebaseConfigured) {
    return URL.createObjectURL(file);
  }

  const { getDownloadURL, getStorage, ref, uploadBytes } = await import("firebase/storage");
  const storage = getStorage(app);
  const path = `questions/${examId}/${questionId}/${file.name}`;
  const snapshot = await uploadBytes(ref(storage, path), file);
  return getDownloadURL(snapshot.ref);
}

export async function deleteQuestionImage(imageUrl) {
  if (!isFirebaseConfigured) {
    return;
  }

  const { deleteObject, getStorage, ref } = await import("firebase/storage");
  await deleteObject(ref(getStorage(app), imageUrl));
}
