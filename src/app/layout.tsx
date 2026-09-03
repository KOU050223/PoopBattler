import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";

import { AppHeader } from "@/components/layout/app-header";
import { HeaderAccountSlot } from "@/features/account/components/header-account-slot";

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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${nunito.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-blush-wash font-sans text-charcoal">
        <NextIntlClientProvider>
          <AppHeader action={<HeaderAccountSlot />} />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}