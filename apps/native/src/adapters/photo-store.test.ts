import { describe, expect, it } from "vitest";

import { createPhotoStore, type PhotoFileSystem } from "./photo-store";

const ID = "11111111-1111-4111-8111-111111111111";

function memoryFs() {
  const files = new Map<string, Uint8Array>();
  const fs: PhotoFileSystem = {
    write: async (name, bytes) => void files.set(name, bytes),
    read: async (name) => files.get(name) ?? null,
    remove: async (name) => void files.delete(name),
    uri: (name) => `file:///doc/meal-photos/${name}`,
  };
  return { fs, files };
}

describe("createPhotoStore", () => {
  it("UUID を <uuid>.jpg に写して put/get/delete できる", async () => {
    const { fs, files } = memoryFs();
    const store = createPhotoStore(fs);
    await store.put(ID, new Uint8Array([1, 2, 3]).buffer);
    expect([...files.keys()]).toEqual([`${ID}.jpg`]);
    expect(new Uint8Array((await store.get(ID))!)).toEqual(new Uint8Array([1, 2, 3]));
    expect(store.uriFor(ID)).toBe(`file:///doc/meal-photos/${ID}.jpg`);
    await store.delete(ID);
    expect(await store.get(ID)).toBeNull();
  });

  it("subarray 由来の bytes でも範囲外を含めず返す", async () => {
    const { fs } = memoryFs();
    fs.read = async () => new Uint8Array([9, 1, 2, 9]).subarray(1, 3);
    expect(new Uint8Array((await createPhotoStore(fs).get(ID))!)).toEqual(new Uint8Array([1, 2]));
  });

  it("UUID 以外（パス混入）は fs に触れず拒否する", async () => {
    const { fs, files } = memoryFs();
    const store = createPhotoStore(fs);
    await expect(store.put("../evil", new ArrayBuffer(1))).rejects.toThrow("写真IDが不正です。");
    await expect(store.get("a/b")).rejects.toThrow();
    await expect(store.delete("")).rejects.toThrow();
    expect(() => store.uriFor("../x")).toThrow();
    expect(files.size).toBe(0);
  });
});
