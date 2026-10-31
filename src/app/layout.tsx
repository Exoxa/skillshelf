import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SkillShelf",
    template: "%s · SkillShelf",
  },
  description:
    "Online courses from a Lagos trainer. Pay once in naira, then learn at your own pace on your phone.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground antialiased">
      <SiteHeader />

      <main className="flex-1">{children}</main>

        <footer className="mt-auto border-t border-border">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-6 text-xs text-muted">
            <span>SkillShelf</span>
            <span>Lagos, Nigeria</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
