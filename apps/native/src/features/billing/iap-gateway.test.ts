import { describe, expect, it } from "vitest";

import {
  createIapGateway,
  hasActiveRcEntitlement,
  isUserCancelledError,
  pickOffering,
  toPurchaseOffers,
  waitForEntitlement,
  type PurchasesLike,
} from "./iap-gateway";

const PKG = {
  identifier: "$rc_monthly",
  product: { title: "プレミアム（月額）", priceString: "¥480", subscriptionPeriod: "P1M" },
};
const OFFERINGS = { current: { identifier: "default", availablePackages: [PKG] }, all: {} };

function fakeSdk(overrides: Partial<PurchasesLike> = {}) {
  const calls: string[] = [];
  const sdk: PurchasesLike = {
    configure: (config) => { calls.push(`configure:${config.appUserID}`); },
    logIn: async (id) => { calls.push(`logIn:${id}`); return {}; },
    getOfferings: async () => OFFERINGS,
    purchasePackage: async () => ({ customerInfo: { entitlements: { active: { premium: {} } } } }),
    restorePurchases: async () => ({ entitlements: { active: { premium: {} } } }),
    ...overrides,
  };
  return { sdk, calls };
}

function gateway(overrides: {
  sdk?: PurchasesLike | null;
  apiKey?: string | null;
  userId?: string | null;
} = {}) {
  const sdk = "sdk" in overrides ? overrides.sdk : fakeSdk().sdk;
  return createIapGateway({
    loadSdk: () => sdk ?? null,
    apiKey: "apiKey" in overrides ? (overrides.apiKey ?? null) : "test_key",
    getUserId: async () => ("userId" in overrides ? (overrides.userId ?? null) : "user-uuid"),
  });
}

describe("init", () => {
  it("APIキー未設定 / SDK無し / 未ログインは unavailable で落ちない", async () => {
    expect(await gateway({ apiKey: null }).init()).toEqual({ status: "unavailable", reason: "no-api-key" });
    expect(await gateway({ sdk: null }).init()).toEqual({ status: "unavailable", reason: "no-sdk" });
    expect(await gateway({ userId: null }).init()).toEqual({ status: "unavailable", reason: "no-user" });
  });

  it("configure は Supabase user id を appUserID にし、同一ユーザーの再initではlogInしない", async () => {
    const { sdk, calls } = fakeSdk();
    const gw = gateway({ sdk });
    await gw.init();
    await gw.init();
    expect(calls).toEqual(["configure:user-uuid"]);
  });

  it("ユーザーが変わったら logIn で張り替える（configure は二度呼ばない）", async () => {
    const { sdk, calls } = fakeSdk();
    let userId = "user-uuid";
    const gw = createIapGateway({
      loadSdk: () => sdk,
      apiKey: "test_key",
      getUserId: async () => userId,
    });
    await gw.init();
    userId = "linked-user-uuid";
    await gw.init();
    expect(calls).toEqual(["configure:user-uuid", "logIn:linked-user-uuid"]);
  });

  it("configure が投げる環境（Expo Go等）は init-failed", async () => {
    const { sdk } = fakeSdk({ configure: () => { throw new Error("native module missing"); } });
    expect(await gateway({ sdk }).init()).toEqual({ status: "unavailable", reason: "init-failed" });
  });
});

describe("getPackages / purchase / restore", () => {
  it("offerings から表示用のオファーに写す", async () => {
    const result = await gateway().getPackages();
    expect(result).toEqual({
      status: "ok",
      offers: [{ identifier: "$rc_monthly", title: "プレミアム（月額）", priceString: "¥480", subscriptionPeriod: "P1M" }],
    });
  });

  it("current が無いときは all の先頭 offering を使う", () => {
    const alt = { identifier: "alt", availablePackages: [] };
    expect(pickOffering({ current: null, all: { alt } })).toBe(alt);
    expect(toPurchaseOffers(null)).toEqual([]);
  });

  it("購入成功は purchased、ユーザーキャンセルは cancelled、失敗は error", async () => {
    expect(await gateway().purchase("$rc_monthly")).toEqual({ status: "purchased" });

    const cancelled = fakeSdk({ purchasePackage: async () => { throw { userCancelled: true, code: "1" }; } });
    expect(await gateway({ sdk: cancelled.sdk }).purchase("$rc_monthly")).toEqual({ status: "cancelled" });

    const failed = fakeSdk({ purchasePackage: async () => { throw new Error("store error"); } });
    expect(await gateway({ sdk: failed.sdk }).purchase("$rc_monthly")).toEqual({ status: "error" });
  });

  it("restore は RC entitlement の有無で restored / not-found を返す", async () => {
    expect(await gateway().restore()).toEqual({ status: "restored" });
    const empty = fakeSdk({ restorePurchases: async () => ({ entitlements: { active: {} } }) });
    expect(await gateway({ sdk: empty.sdk }).restore()).toEqual({ status: "not-found" });
  });

  it("unavailable 時は購入も復元も unavailable を返す", async () => {
    const gw = gateway({ apiKey: null });
    expect(await gw.purchase("$rc_monthly")).toEqual({ status: "unavailable", reason: "no-api-key" });
    expect(await gw.restore()).toEqual({ status: "unavailable", reason: "no-api-key" });
  });
});

describe("pure helpers", () => {
  it("isUserCancelledError は userCancelled フラグと code '1' を拾う", () => {
    expect(isUserCancelledError({ userCancelled: true })).toBe(true);
    expect(isUserCancelledError({ code: "1" })).toBe(true);
    expect(isUserCancelledError(new Error("x"))).toBe(false);
    expect(isUserCancelledError(null)).toBe(false);
  });

  it("hasActiveRcEntitlement は active の有無だけを見る", () => {
    expect(hasActiveRcEntitlement({ entitlements: { active: { premium: {} } } })).toBe(true);
    expect(hasActiveRcEntitlement({ entitlements: { active: {} } })).toBe(false);
  });
});

describe("waitForEntitlement", () => {
  it("権利が付くまで再読み込みし、付いた時点で抜ける", async () => {
    const sleeps: number[] = [];
    let reads = 0;
    const ok = await waitForEntitlement(
      async () => ++reads >= 3,
      { tries: 5, intervalMs: 100, sleep: async (ms) => { sleeps.push(ms); } },
    );
    expect(ok).toBe(true);
    expect(reads).toBe(3);
    expect(sleeps).toEqual([100, 100]);
  });

  it("期限内に付かなければ false", async () => {
    const ok = await waitForEntitlement(async () => false, { tries: 3, intervalMs: 1, sleep: async () => {} });
    expect(ok).toBe(false);
  });
});
