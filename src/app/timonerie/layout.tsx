import type { Metadata, Viewport } from "next";
import { Josefin_Sans, Source_Sans_3 } from "next/font/google";
import "./admin.css";

const josefin = Josefin_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "600"],
  variable: "--font-josefin",
});
const source = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-source",
});

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s — Administration Nautilus" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#132438", colorScheme: "dark" };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${josefin.variable} ${source.variable}`}>
      <body>{children}</body>
    </html>
  );
}
