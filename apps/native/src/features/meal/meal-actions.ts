import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";

import { photoStore } from "@/adapters/expo-photo-fs";

import { MealPhotoError, storePickedPhoto } from "./meal-photo";

/** ピッカーが返した一時ファイルを端末内ストアへ保存し、新しい写真IDを返す。 */
export function savePickedPhoto(uri: string): Promise<string> {
  return storePickedPhoto(uri, {
    readBytes: (u) => new File(u).bytes(),
    store: photoStore,
    newId: () => Crypto.randomUUID(),
  });
}

export async function removePhotoQuietly(photoId: string): Promise<boolean> {
  try {
    await photoStore.delete(photoId);
    return true;
  } catch {
    return false;
  }
}

/** 画面に出す文言のキー。写真系の既知エラーだけ個別、それ以外は呼び出し側の既定。 */
export function pickErrorKey(error: unknown, fallback: string): string {
  if (error instanceof MealPhotoError) return error.code === "too_large" ? "Records.photoTooLarge" : "Records.photoSaveFailed";
  return fallback;
}
