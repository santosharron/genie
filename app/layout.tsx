import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-serif", display: "swap", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Gift Brain · Amazon",
  description: "Agentic gifting — describe the person, get the gift."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${newsreader.variable}`}>
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
