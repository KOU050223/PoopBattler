import AsyncStorage from "@react-native-async-storage/async-storage";

import type { RecordStorage } from "./record";

export const asyncRecordStorage: RecordStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
};
