import AsyncStorage from "@react-native-async-storage/async-storage";

import { createBattleStore } from "./battle-store-factory";

export { BATTLE_STORE_NAME, BATTLE_STORE_VERSION, type BattleStore } from "./battle-store-factory";

export const useBattleStore = createBattleStore(AsyncStorage);
