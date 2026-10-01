"use client";

import { useCallback, useState } from "react";

import { deleteAllMealPhotos } from "@/features/meal/meal-photo-storage";
import { signOutFromBrowser } from "@/lib/supabase/sign-out";

import { deleteAccountAction } from "../actions";
import type { AccountStatus } from "../account.types";

type Props = {
  status: AccountStatus;
};

/** 端末に残った利用者データを消す。失敗しても退会自体は完了済みとする。 */
async function clearLocalData() {
  try {
    await deleteAllMealPhotos();
  } catch {
    // IndexedDB が使えない環境では写真自体が保存されていない。
  }

  // アプリがこのオリジンへ置いたキーを個別に列挙すると、新しいキーが増えた
  // 時点で取りこぼす。このオリジンのデータは全てこのアプリのものなので、
  // まとめて消す方が確実。
  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch {
    // ストレージ自体が無効な環境では消すべきデータも無い。
  }
}

/**
 * 退会（アカウント削除）の導線。
 *
 * 確認を2段階にするのは、ログアウトと違って戻れない操作だから。
 * サーバー側でアカウントが消えてから端末内のデータを消す。逆の順序だと
 * サーバー削除が失敗したとき「記録は残っているのに写真だけ消えた」状態になる。
 */
export function DeleteAccountSection({ status }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const run = useCallback(async () => {
    setPending(true);
    setMessage("");

    try {
      const result = await deleteAccountAction();

      if (result.status !== "deleted") {
        setPending(false);
        setMessage(result.message);
        return;
      }
    } catch {
      setPending(false);
      setMessage("通信に失敗しました。通信環境を確認して再試行してください。");
      return;
    }

    await clearLocalData();
    // セッションはサーバー側で既に無効。ローカルの片付けとして最善を尽くす。
    await signOutFromBrowser();
    // フルリロードで全てのクライアント状態を捨てる。replace にすると
    // 戻るボタンで削除済みのアカウント画面へ戻れない。遷移先の `/` で
    // 新しい匿名アカウントが作られる。
    window.location.replace("/");
  }, []);

  if (!status.signedIn) return null;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
      <div className="flex flex-col gap-1">
        <p className="font-medium">アカウントを削除する（退会）</p>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          食事・排便・バトルの記録、図鑑のうんちくん、この端末に保存した食事写真が
          すべて削除されます。プレミアムを購読中の場合は購読も取り消されます。
          この操作は取り消せません。
        </p>
      </div>

      {confirming ? (
        <div className="flex flex-col gap-2 rounded border border-red-300 bg-white p-3 dark:border-red-800 dark:bg-zinc-950">
          <p className="text-sm">
            <strong>本当に削除しますか？</strong>
            削除した記録は元に戻せません。
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => void run()}
              className="min-h-12 flex-1 rounded bg-red-700 px-4 py-2 text-white disabled:opacity-60"
            >
              {pending ? "削除しています…" : "すべて削除して退会する"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="min-h-12 flex-1 rounded border border-zinc-300 px-4 py-2 disabled:opacity-60 dark:border-zinc-700"
            >
              やめる
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="min-h-12 rounded border border-red-400 px-4 py-2 text-red-700 dark:border-red-800 dark:text-red-400"
        >
          退会する
        </button>
      )}

      {message && (
        <p aria-live="polite" className="text-sm text-red-700 dark:text-red-400">
          {message}
        </p>
      )}
    </section>
  );
}
