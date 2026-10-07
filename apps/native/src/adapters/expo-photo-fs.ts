import { Directory, File, Paths } from "expo-file-system";

import { createPhotoStore, type PhotoFileSystem } from "./photo-store";

// documentDirectory 配下はOSに勝手に消されない。cache だと食事写真が黙って消える。
const photoDirectory = () => new Directory(Paths.document, "meal-photos");

export const expoPhotoFileSystem: PhotoFileSystem = {
  async write(fileName, bytes) {
    const directory = photoDirectory();
    directory.create({ intermediates: true, idempotent: true });
    const file = new File(directory, fileName);
    file.create({ overwrite: true });
    file.write(bytes);
  },
  async read(fileName) {
    const file = new File(photoDirectory(), fileName);
    return file.exists ? file.bytes() : null;
  },
  async remove(fileName) {
    const file = new File(photoDirectory(), fileName);
    if (file.exists) file.delete();
  },
  uri: (fileName) => new File(photoDirectory(), fileName).uri,
};

export const photoStore = createPhotoStore(expoPhotoFileSystem);
