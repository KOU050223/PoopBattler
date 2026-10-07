import AsyncStorage from "@react-native-async-storage/async-storage";

import { createCachedSyncStorage } from "./battle-speed-storage";

export const battleSpeedCache = createCachedSyncStorage(AsyncStorage);
