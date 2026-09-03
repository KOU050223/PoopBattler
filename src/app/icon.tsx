import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** ホーム画面でも埋もれない、アプリの配色に合わせたシンプルなアイコン。 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#ffe0ef",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "#ff7aac",
            border: "20px solid #c94d7f",
            borderRadius: 104,
            color: "white",
            display: "flex",
            fontSize: 172,
            fontWeight: 900,
            height: 392,
            justifyContent: "center",
            letterSpacing: -20,
            paddingLeft: 2,
            width: 392,
          }}
        >
          BR
        </div>
      </div>
    ),
    size,
  );
}
