import { notFound } from "next/navigation";

import { Poopm3DPreview } from "./poopm-3d-preview";

// 開発者向けの3D確認ページ。本番バンドルでは404にする。
export default function Poopm3DDevPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <Poopm3DPreview />;
}
