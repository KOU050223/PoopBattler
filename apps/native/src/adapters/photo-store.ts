import type { PhotoStore } from "@poopbattler/domain/ports";

/** 端末のファイル操作の最小面。実体は expo-file-system、テストではメモリ実装に差し替える。 */
export type PhotoFileSystem = {
  write(fileName: string, bytes: Uint8Array): Promise<void>;
  read(fileName: string): Promise<Uint8Array | null>;
  remove(fileName: string): Promise<void>;
  uri(fileName: string): string;
};

export type LocalPhotoStore = PhotoStore & {
  /** <Image source={{ uri }}> に渡すファイルURI。ファイルの有無は確認しない。 */
  uriFor(id: string): string;
};

const PHOTO_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPhotoId(value: unknown): value is string {
  return typeof value === "string" && PHOTO_ID_PATTERN.test(value);
}

/** image_path に入る UUID をファイル名へ写す。UUID 以外は拒否し、パス区切りの混入を防ぐ。 */
function fileNameFor(id: string): string {
  if (!isPhotoId(id)) throw new Error("写真IDが不正です。");
  return `${id.toLowerCase()}.jpg`;
}

export function createPhotoStore(fs: PhotoFileSystem): LocalPhotoStore {
  return {
    async put(id, data) {
      await fs.write(fileNameFor(id), new Uint8Array(data));
    },
    async get(id) {
      const bytes = await fs.read(fileNameFor(id));
      if (!bytes) return null;
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    },
    async delete(id) {
      await fs.remove(fileNameFor(id));
    },
    uriFor: (id) => fs.uri(fileNameFor(id)),
  };
}
