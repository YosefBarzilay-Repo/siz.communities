import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "SIZ",
  description: "קהילות קנייה, מכירה ומסירה"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html dir="rtl" lang="he">
      <body className={jakarta.className}>{children}</body>
    </html>
  );
}
