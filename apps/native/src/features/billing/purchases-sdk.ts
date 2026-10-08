import type Purchases from "react-native-purchases";

export type PurchasesSdk = typeof Purchases;

/**
 * react-native-purchases を遅延ロードする。
 *
 * トップレベルで import すると vitest（node 実行）や Expo Go でも評価される。
 * Metro はリテラル文字列の require を静的にバンドルへ含め、実行は呼ばれた
 * 時点まで遅延できるため、ネイティブモジュールの無い環境では null を返す。
 */
export function loadPurchasesSdk(): PurchasesSdk | null {
  try {
    const mod = require("react-native-purchases") as { default?: PurchasesSdk };
    return mod.default ?? null;
  } catch {
    return null;
  }
}
