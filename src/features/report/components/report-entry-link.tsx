import { ChartNoAxesCombined, ChevronRight } from "lucide-react";
import Link from "next/link";

export function ReportEntryLink() {
  return (
    <Link href="/report" className="mb-5 flex items-center gap-3 rounded-2xl bg-paper-white p-4 shadow-[0_8px_24px_rgb(201_77_127_/_0.1)] transition-transform duration-200 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flush-pink">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blush-wash text-flush-edge"><ChartNoAxesCombined aria-hidden="true" className="size-5" /></span>
      <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="font-black text-charcoal">今週のレポート</span><span className="rounded-md bg-blush-wash px-1.5 py-0.5 text-[11px] font-bold text-flush-edge">プレミアム</span></span><span className="mt-0.5 block text-sm text-pencil-gray">記録から、今週の傾向を振り返る</span></span>
      <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-pencil-gray" />
    </Link>
  );
}
