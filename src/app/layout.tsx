import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "Poop Battler",
    template: "%s | Poop Battler",
  },
  description: "食事と排便の記録を、うんちモンスターとのバトルとして続けられるアプリ。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-paper-white font-sans text-charcoal">
        {children}
      </body>
    </html>
  );
}
