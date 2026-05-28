import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Momentum Market | Trade Match Momentum, Not Outcomes",
  description:
    "AI-powered real-time momentum trading for World Cup matches. Long or short a team's momentum score — updated live by AI every 60 seconds. Built on X Layer.",
  openGraph: {
    title: "Momentum Market",
    description: "Trade match momentum, not outcomes. AI-powered. Onchain.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black min-h-screen antialiased">{children}</body>
    </html>
  );
}
