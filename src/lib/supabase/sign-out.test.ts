import { describe, expect, it, vi } from "vitest";

import { signOut } from "./sign-out";

describe("signOut", () => {
  it("成功したら signed-out を返す", async () => {
    const auth = { signOut: vi.fn().mockResolvedValue({ error: null }) };

    expect(await signOut(auth)).toEqual({ status: "signed-out" });
    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it("失敗を握り潰さず、日本語の文言で返す", async () => {
    // Supabase の英語メッセージをそのまま利用者へ見せない。
    const result = await signOut({
      signOut: vi.fn().mockResolvedValue({
        error: { message: "Auth session missing!" },
      }),
    });

    expect(result.status).toBe("error");
    expect(result).not.toMatchObject({ message: "Auth session missing!" });
    if (result.status === "error") {
      expect(result.message).toContain("ログアウトに失敗しました");
    }
  });

  it("通信自体が失敗しても例外を投げず、error として返す", async () => {
    // 例外のまま抜けるとメニューが「処理中…」で固まる。
    const result = await signOut({
      signOut: vi.fn().mockRejectedValue(new Error("offline")),
    });

    expect(result.status).toBe("error");
  });
});
