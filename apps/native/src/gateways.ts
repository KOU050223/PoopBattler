import { getSupabase } from "@/lib/supabase";

import { createAccountGateway } from "@/features/account/account-gateway";
import { createIapGateway } from "@/features/billing/iap-gateway";
import { getRevenueCatApiKey } from "@/features/billing/iap-config";
import { loadPurchasesSdk } from "@/features/billing/purchases-sdk";
import { createBattleHistoryGateway } from "@/features/bowel-log/battle-history-gateway";
import { createCollectionGateway } from "@/features/collection/collection-gateway";
import { createMealGateway } from "@/features/meal/meal-gateway";
import { createReportGateway } from "@/features/report/report-gateway";

// getSupabase は env 未設定で throw するため、画面描画時まで遅延させる。
export const mealGateway = () => createMealGateway(getSupabase());
export const battleHistoryGateway = () => createBattleHistoryGateway(getSupabase());
export const collectionGateway = () => createCollectionGateway(getSupabase());
export const reportGateway = () => createReportGateway(getSupabase());
export const accountGateway = () => createAccountGateway(getSupabase());

// RevenueCat は configure が1回きりなので、ゲートウェイは画面ごとに
// 作り直さずアプリ内で1つだけ保持する。
let iap: ReturnType<typeof createIapGateway> | undefined;
export function iapGateway() {
  iap ??= createIapGateway({
    loadSdk: loadPurchasesSdk,
    apiKey: getRevenueCatApiKey(),
    getUserId: async () => {
      try {
        const { data } = await getSupabase().auth.getUser();
        return data.user?.id ?? null;
      } catch {
        return null;
      }
    },
  });
  return iap;
}
