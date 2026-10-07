import type { PhotoStore } from "@poopbattler/domain/ports";

export const MEAL_PHOTO_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export class MealPhotoError extends Error {
  constructor(readonly code: "too_large" | "save_failed") {
    super(code);
    this.name = "MealPhotoError";
  }
}

type Deps = {
  readBytes: (uri: string) => Promise<Uint8Array>;
  store: Pick<PhotoStore, "put">;
  newId: () => string;
};

/** 選択・撮影した画像を端末内へ保存し、meal_logs.image_path に入れる UUID を返す。 */
export async function storePickedPhoto(uri: string, { readBytes, store, newId }: Deps): Promise<string> {
  let bytes: Uint8Array;
  try {
    bytes = await readBytes(uri);
  } catch {
    throw new MealPhotoError("save_failed");
  }
  if (bytes.byteLength > MEAL_PHOTO_MAX_SIZE_BYTES) throw new MealPhotoError("too_large");

  const id = newId();
  try {
    await store.put(id, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  } catch {
    throw new MealPhotoError("save_failed");
  }
  return id;
}
