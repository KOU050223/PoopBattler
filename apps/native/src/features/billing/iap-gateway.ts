// RevenueCat SDK との境界。SDK 型をアプリ全体へ広げず、ここで必要な最小形に写す。
// このモジュールは純ロジックのみ（react-native / supabase client を import しない）。
// 本番の依存配線は features/gateways.ts 側で行う（vitest が react-native を
// 解決できないため）。
// 権利の正は引き続き subscriptions テーブル（webhook 経由の同期）で、
// CustomerInfo は「購入/復元が成立したか」の即時判定だけに使う。

export type PurchasesPackageLike = {
  identifier: string;
  product: { title: string; priceString: string; subscriptionPeriod: string | null };
};

export type OfferingLike = { identifier: string; availablePackages: PurchasesPackageLike[] };
export type OfferingsLike = { current: OfferingLike | null; all: Record<string, OfferingLike> };
export type CustomerInfoLike = { entitlements: { active: Record<string, unknown> } };

/** 画面側が触る SDK の最小インターフェース。テストはこれを偽装する。 */
export type PurchasesLike = {
  configure(config: { apiKey: string; appUserID: string }): void;
  logIn(appUserID: string): Promise<unknown>;
  getOfferings(): Promise<OfferingsLike>;
  purchasePackage(pkg: PurchasesPackageLike): Promise<{ customerInfo: CustomerInfoLike }>;
  restorePurchases(): Promise<CustomerInfoLike>;
};

export type IapUnavailableReason =
  /** EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY 未設定。 */
  | "no-api-key"
  /** Expo Go などネイティブモジュールの無い環境。 */
  | "no-sdk"
  /** サインイン前。app_user_id に Supabase の user id を入れるため必須。 */
  | "no-user"
  /** configure/logIn が投げた。SDK 未リンク環境ではここに落ちる。 */
  | "init-failed";

export type IapInitResult = { status: "ready" } | { status: "unavailable"; reason: IapUnavailableReason };

/** 画面表示用のプラン情報。SDK の PurchasesPackage から必要分だけ。 */
export type PurchaseOffer = {
  /** PurchasesPackage.identifier（RC 側のパッケージID。$rc_monthly 等）。 */
  identifier: string;
  title: string;
  priceString: string;
  /** ISO-8601 期間（P1M / P1Y など）。非定期商品は null。 */
  subscriptionPeriod: string | null;
};

export type PurchaseOutcome =
  | { status: "purchased" }
  | { status: "cancelled" }
  | { status: "unavailable"; reason: IapUnavailableReason }
  | { status: "error" };

export type RestoreOutcome =
  | { status: "restored" }
  | { status: "not-found" }
  | { status: "unavailable"; reason: IapUnavailableReason }
  | { status: "error" };

export type PackagesOutcome =
  | { status: "ok"; offers: PurchaseOffer[] }
  | { status: "unavailable"; reason: IapUnavailableReason }
  | { status: "error" };

/** RevenueCat の「ユーザーが購入シートを閉じた」エラー。再試行案内を出さない。 */
export function isUserCancelledError(error: unknown): boolean {
  const e = error as { userCancelled?: boolean; code?: string } | null;
  return e?.userCancelled === true || e?.code === "1"; // PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
}

export function hasActiveRcEntitlement(info: CustomerInfoLike): boolean {
  return Object.keys(info.entitlements?.active ?? {}).length > 0;
}

export function pickOffering(offerings: OfferingsLike): OfferingLike | null {
  return offerings.current ?? Object.values(offerings.all)[0] ?? null;
}

export function toPurchaseOffers(offering: OfferingLike | null): PurchaseOffer[] {
  return (offering?.availablePackages ?? []).map((pkg) => ({
    identifier: pkg.identifier,
    title: pkg.product.title,
    priceString: pkg.product.priceString,
    subscriptionPeriod: pkg.product.subscriptionPeriod ?? null,
  }));
}

/**
 * RevenueCat ゲートウェイ。
 *
 * 権利の書き込みは RevenueCat webhook → subscriptions のみ。ここでは購入の
 * 実行と、購入直後の即時フィードバック（RC 側の entitlement 成立）だけを扱う。
 */
export function createIapGateway(deps: {
  loadSdk: () => PurchasesLike | null;
  apiKey: string | null;
  getUserId: () => Promise<string | null>;
}) {
  let boundUserId: string | null = null;

  async function init(): Promise<IapInitResult> {
    if (!deps.apiKey) return { status: "unavailable", reason: "no-api-key" };
    const sdk = deps.loadSdk();
    if (!sdk) return { status: "unavailable", reason: "no-sdk" };
    const userId = await deps.getUserId();
    if (!userId) return { status: "unavailable", reason: "no-user" };

    try {
      if (boundUserId === null) {
        // webhook は app_user_id を auth.users.id として subscriptions に
        // 書く。匿名IDやRC発行のIDにすると権利が誰のものか解決できないため、
        // configure 時点で必ず Supabase の user id を渡す。
        sdk.configure({ apiKey: deps.apiKey, appUserID: userId });
      } else if (boundUserId !== userId) {
        // Google ログインでユーザーが切り替わったとき。同じIDなら何もしない。
        await sdk.logIn(userId);
      }
      boundUserId = userId;
      return { status: "ready" };
    } catch {
      return { status: "unavailable", reason: "init-failed" };
    }
  }

  async function withSdk<T>(
    run: (sdk: PurchasesLike) => Promise<T>,
    unavailable: (reason: IapUnavailableReason) => T,
  ): Promise<T> {
    const state = await init();
    if (state.status !== "ready") return unavailable(state.reason);
    const sdk = deps.loadSdk();
    if (!sdk) return unavailable("no-sdk");
    return run(sdk);
  }

  return {
    init,

    async getPackages(): Promise<PackagesOutcome> {
      return withSdk<PackagesOutcome>(
        async (sdk) => {
          try {
            const offerings = await sdk.getOfferings();
            return { status: "ok", offers: toPurchaseOffers(pickOffering(offerings)) };
          } catch {
            return { status: "error" };
          }
        },
        (reason) => ({ status: "unavailable", reason }),
      );
    },

    /** identifier から生のパッケージを引き直して購入する。 */
    async purchase(packageIdentifier: string): Promise<PurchaseOutcome> {
      return withSdk<PurchaseOutcome>(
        async (sdk) => {
          try {
            const offerings = await sdk.getOfferings();
            const pkg = pickOffering(offerings)?.availablePackages.find(
              (candidate) => candidate.identifier === packageIdentifier,
            );
            if (!pkg) return { status: "error" };
            await sdk.purchasePackage(pkg);
            return { status: "purchased" };
          } catch (error) {
            return isUserCancelledError(error) ? { status: "cancelled" } : { status: "error" };
          }
        },
        (reason) => ({ status: "unavailable", reason }),
      );
    },

    async restore(): Promise<RestoreOutcome> {
      return withSdk<RestoreOutcome>(
        async (sdk) => {
          try {
            const info = await sdk.restorePurchases();
            return hasActiveRcEntitlement(info) ? { status: "restored" } : { status: "not-found" };
          } catch {
            return { status: "error" };
          }
        },
        (reason) => ({ status: "unavailable", reason }),
      );
    },
  };
}

/**
 * 購入/復元の直後に subscriptions への反映（webhook 経由・数秒の遅延）を待つ。
 * 時間内に権利が付いたら true、付かなくても false で返る（画面側が再読み込みを案内）。
 */
export async function waitForEntitlement(
  isEntitled: () => Promise<boolean>,
  options: { tries?: number; intervalMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<boolean> {
  const { tries = 5, intervalMs = 2000, sleep = defaultSleep } = options;
  for (let i = 0; i < tries; i += 1) {
    if (await isEntitled()) return true;
    if (i < tries - 1) await sleep(intervalMs);
  }
  return false;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
