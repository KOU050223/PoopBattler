import { getSupabase } from "@/lib/supabase";

import { createBattleHistoryGateway } from "./bowel-log/battle-history-gateway";
import { createCollectionGateway } from "./collection/collection-gateway";
import { createMealGateway } from "./meal/meal-gateway";

// getSupabase は env 未設定で throw するため、画面描画時まで遅延させる。
export const mealGateway = () => createMealGateway(getSupabase());
export const battleHistoryGateway = () => createBattleHistoryGateway(getSupabase());
export const collectionGateway = () => createCollectionGateway(getSupabase());
