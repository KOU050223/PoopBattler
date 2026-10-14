import AsyncStorage from "@react-native-async-storage/async-storage";

import { createCachedSyncStorage } from "./battle-speed-storage";
import { BATTLE_RENDER_MODE_STORAGE_KEY } from "./battle-render-mode-storage";

export const battleRenderModeCache = createCachedSyncStorage(AsyncStorage, [BATTLE_RENDER_MODE_STORAGE_KEY]);
