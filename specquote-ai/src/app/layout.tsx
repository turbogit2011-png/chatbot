import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpecQuote AI",
  description: "From technical request to approved quote.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
