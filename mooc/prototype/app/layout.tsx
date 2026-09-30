import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { I18nRuntime } from "@/components/open/i18n-runtime";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ClassProject Open — learn what you need, prove what you can do",
  description: "Prototype of ClassProject Open, the outcome-first global learning platform.",
};

export const viewport: Viewport = { themeColor: "#f7f3ec" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        {children}
        <Toaster position="bottom-center" />
        <I18nRuntime />
      </body>
    </html>
  );
}
