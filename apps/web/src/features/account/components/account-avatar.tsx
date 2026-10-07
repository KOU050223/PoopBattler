import { User } from "lucide-react";

type Props = {
  /** 連携済みのメールアドレス。頭文字をアイコン代わりに使う。 */
  email: string | null;
};

/**
 * ヘッダー右上のアイコン。画像は持たないので、メールアドレスの頭文字を出す。
 * 頭文字を取れない場合だけ汎用のユーザーアイコンへ落とす。
 */
export function AccountAvatar({ email }: Props) {
  const initial = email?.trim().charAt(0).toUpperCase();

  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-flush-pink text-[15px] font-bold text-paper-white"
    >
      {initial ? initial : <User className="size-5" />}
    </span>
  );
}
