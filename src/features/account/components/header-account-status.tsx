import Link from "next/link";
import type { ReactNode } from "react";

import type { AccountStatus } from "../account.types";

type Props = {
  /** 読み込み中は null。状態が確定するまでは何も断定しない。 */
  status: AccountStatus | null;
  /**
   * Google連携済みのときに出す操作部（プルダウン）。
   *
   * 中身を受け取る形にしているのは、AccountMenu が useRouter を使う
   * クライアント専用の部品で、ここへ直接 import するとこの分岐だけ
   * サーバーで描画できなくなるため。状態の判定は純粋なまま保つ。
   */
  menu: ReactNode;
};

/**
 * ヘッダー右上のアカウント表示。状態は3つある。
 *
 * - 読み込み中: プレースホルダだけ置き、幅を確保して後からのガタつきを防ぐ
 * - 未連携（未サインイン / 匿名）: ログインへの誘導を出す
 * - Google連携済み: 受け取ったプルダウンを出す
 *
 * 匿名ユーザーを「ログイン済み」と扱わないのは、GoogleAccountLink が
 * 匿名を「消える可能性のあるアカウント」として警告しているため。
 * ここで済んだ扱いにすると同じ画面で表示が矛盾する。
 *
 * 誘導先は `/` のアカウント欄で、ここから直接 OAuth を開始しない。
 * 別端末での「ログイン」は既存の匿名データを捨てる破壊的な操作になり得るため、
 * その確認手順は GoogleAccountLink 側に一本化する。
 */
export function HeaderAccountStatus({ status, menu }: Props) {
  if (!status) {
    return <span aria-hidden="true" className="size-9 shrink-0 rounded-full bg-blush-wash" />;
  }

  if (status.hasGoogleIdentity) {
    return <>{menu}</>;
  }

  return (
    <Link
      href="/account"
      className="flex min-h-11 items-center rounded-xl border-2 border-faded-gray bg-paper-white px-4 text-sm font-bold text-spark-blue shadow-raised-gray"
    >
      ログイン
    </Link>
  );
}
