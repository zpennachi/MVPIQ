import type { Metadata } from "next";
import { Akshar, Outfit } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ConditionalNavbar } from "@/components/layout/ConditionalNavbar";

const akshar = Akshar({
  subsets: ["latin"],
  variable: "--font-akshar",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "MVP-IQ - Empowering the Next Generation of Sports Talent",
  description: "Led by former professional athletes, we deliver advanced video analysis and tailored tools to elevate sports performance, helping players and coaches refine their skills and strategies.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.variable} ${akshar.variable} font-sans`}>
        <ConditionalNavbar />
        <div className="min-h-screen bg-black text-gray-200">
          {children}
        </div>
        <Script
          type="module"
          src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
