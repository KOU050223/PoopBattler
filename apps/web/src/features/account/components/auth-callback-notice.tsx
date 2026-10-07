import { getAuthErrorMessage } from "../auth-error-messages";

type Props = {
  linked: boolean;
  errorCode: string | null;
};

/** OAuth のコールバックから戻った結果を、画面上で一度だけ伝える。 */
export function AuthCallbackNotice({ linked, errorCode }: Props) {
  if (errorCode) {
    return (
      <p
        aria-live="polite"
        className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      >
        {getAuthErrorMessage(errorCode)}
      </p>
    );
  }

  if (linked) {
    return (
      <p
        aria-live="polite"
        className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
      >
        Googleアカウントとの連携が完了しました。
      </p>
    );
  }

  return null;
}
