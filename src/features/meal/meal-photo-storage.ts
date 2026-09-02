export const MEAL_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MEAL_PHOTO_ACCEPT = MEAL_PHOTO_MIME_TYPES.join(",");
export const MEAL_PHOTO_MAX_SIZE_BYTES = 5 * 1024 * 1024;

const DATABASE_NAME = "poop-battler";
const DATABASE_VERSION = 1;
const PHOTO_STORE_NAME = "meal-photos";

export class MealPhotoStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MealPhotoStorageError";
  }
}

type StoredMealPhoto = {
  id: string;
  blob: Blob;
  createdAt: string;
};

function openDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new MealPhotoStorageError("このブラウザは端末内の画像保存に対応していません。"));
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onerror = () => reject(new MealPhotoStorageError("端末内の画像保存を開始できませんでした。"));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(PHOTO_STORE_NAME)) {
        request.result.createObjectStore(PHOTO_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return openDatabase().then((database) => new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE_NAME, mode);
    const request = operation(transaction.objectStore(PHOTO_STORE_NAME));

    request.onerror = () => reject(new MealPhotoStorageError("端末内の画像保存に失敗しました。"));
    transaction.onabort = () => reject(new MealPhotoStorageError("端末内の画像保存に失敗しました。"));
    transaction.oncomplete = () => {
      database.close();
      resolve(request.result);
    };
  }));
}

export function validateMealPhoto(photo: File) {
  if (!MEAL_PHOTO_MIME_TYPES.includes(photo.type as (typeof MEAL_PHOTO_MIME_TYPES)[number])) {
    return "JPEG、PNG、WebPの画像を選択してください。";
  }
  if (photo.size > MEAL_PHOTO_MAX_SIZE_BYTES) {
    return "画像は5MB以下にしてください。";
  }
  return undefined;
}

/** 食事ログにはこのIDだけを保存し、画像本体は端末内に保持する。 */
export async function saveMealPhoto(photo: File) {
  const validationError = validateMealPhoto(photo);
  if (validationError) throw new MealPhotoStorageError(validationError);

  const id = crypto.randomUUID();
  await runTransaction("readwrite", (store) => store.put({
    id,
    blob: photo,
    createdAt: new Date().toISOString(),
  } satisfies StoredMealPhoto));
  return id;
}

export async function getMealPhoto(id: string) {
  const photo = await runTransaction<StoredMealPhoto | undefined>("readonly", (store) => store.get(id));
  return photo?.blob;
}

export async function deleteMealPhoto(id: string) {
  await runTransaction("readwrite", (store) => store.delete(id));
}

export function isMealPhotoStorageError(error: unknown): error is MealPhotoStorageError {
  return error instanceof MealPhotoStorageError;
}
