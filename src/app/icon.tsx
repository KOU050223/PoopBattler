import { ImageResponse } from "next/og";

const iconSizes = [192, 512] as const;

export function generateImageMetadata() {
  return iconSizes.map((edge) => ({
    id: edge.toString(),
    size: { width: edge, height: edge },
    contentType: "image/png",
  }));
}

/** ホーム画面でも埋もれない、アプリの配色に合わせたシンプルなアイコン。 */
export default async function Icon({ id }: { id: Promise<string | number> }) {
  const edge = Number(await id);
  const inset = Math.round(edge * 0.117);
  const radius = Math.round(edge * 0.203);

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
            border: `${Math.round(edge * 0.039)}px solid #c94d7f`,
            borderRadius: radius,
            color: "white",
            display: "flex",
            fontSize: Math.round(edge * 0.336),
            fontWeight: 900,
            height: edge - inset * 2,
            justifyContent: "center",
            letterSpacing: Math.round(edge * -0.039),
            paddingLeft: 2,
            width: edge - inset * 2,
          }}
        >
          BR
        </div>
      </div>
    ),
    { width: edge, height: edge },
  );
}
