import { saveMealLogAction } from "@/features/meal/actions";
import {
  deleteMealPhoto,
  isMealPhotoStorageError,
  saveMealPhoto,
} from "@/features/meal/meal-photo-storage";
import type { MealLogSaveResult } from "@/features/meal/meal.types";

/**
 * 戦闘後ガチャ用。写真をIndexedDBへ保存し、本人の meal_logs を作って ID を返す。
 * タグは食事画面と同じ必須列を満たすための `other`。敵属性は変えない。
 */
export async function saveBattleMealLog(photo: File): Promise<MealLogSaveResult> {
  let photoId: string | undefined;

  try {
    photoId = await saveMealPhoto(photo);
    const result = await saveMealLogAction({
      photoId,
      eatenAt: new Date().toISOString(),
      tag: "other",
    });
    if (!result.success) {
      await deleteMealPhoto(photoId).catch(() => undefined);
      return result;
    }
    return result;
  } catch (error) {
    if (photoId) await deleteMealPhoto(photoId).catch(() => undefined);
    return {
      success: false,
      message: isMealPhotoStorageError(error)
        ? error.message
        : "食事ログの保存に失敗しました。通信環境を確認して再試行してください。",
    };
  }
}
