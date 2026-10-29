import { MealPhotoError } from "./meal-photo";
import type { PickResult } from "./meal-photo-picker";

export type MealEditDeps = {
  pickPhoto: () => Promise<PickResult>;
  savePhoto: (uri: string) => Promise<string>;
  /** 端末内の写真を消す。消せなかったら false（例外は投げない）。 */
  removePhoto: (photoId: string) => Promise<boolean>;
  /** DB の写真IDを差し替え、置き換わった旧写真IDを返す。 */
  replaceLogPhoto: (logId: string, photoId: string) => Promise<string>;
  /** DB から記録を消し、その写真IDを返す。 */
  deleteLog: (logId: string) => Promise<string>;
};

export type MealEditResult =
  | { status: "skipped" }
  | { status: "done"; noticeKey?: string }
  | { status: "failed"; noticeKey: string };

function replaceErrorKey(error: unknown): string {
  if (error instanceof MealPhotoError) return error.code === "too_large" ? "Gohan.photoTooLarge" : "Gohan.photoSaveFailed";
  return "Gohan.replaceFailed";
}

export async function replaceMealPhoto(logId: string, deps: MealEditDeps): Promise<MealEditResult> {
  const picked = await deps.pickPhoto();
  if (picked.status === "denied") return { status: "failed", noticeKey: "Gohan.permissionLibrary" };
  if (picked.status !== "picked") return { status: "skipped" };

  let newPhotoId: string | undefined;
  try {
    newPhotoId = await deps.savePhoto(picked.uri);
    const previousPhotoId = await deps.replaceLogPhoto(logId, newPhotoId);
    // DB は差し替わっているので、旧写真が消せなくても失敗にはせず、残骸だけ知らせる。
    const isCleaned = await deps.removePhoto(previousPhotoId);
    return isCleaned ? { status: "done" } : { status: "done", noticeKey: "Gohan.replaceCleanupFailed" };
  } catch (e) {
    // DB に載らなかった新写真は端末に残さない。
    if (newPhotoId) await deps.removePhoto(newPhotoId);
    return { status: "failed", noticeKey: replaceErrorKey(e) };
  }
}

export async function deleteMealLog(logId: string, deps: MealEditDeps): Promise<MealEditResult> {
  try {
    const photoId = await deps.deleteLog(logId);
    const isCleaned = await deps.removePhoto(photoId);
    return isCleaned ? { status: "done" } : { status: "done", noticeKey: "Gohan.deleteCleanupFailed" };
  } catch {
    return { status: "failed", noticeKey: "Gohan.deleteFailed" };
  }
}
