import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConditionalNavbar } from "@/components/layout/ConditionalNavbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MVP-IQ - Empowering the Next Generation of Sports Talent",
  description: "Led by former professional athletes, we deliver advanced video analysis and tailored tools to elevate sports performance, helping players and coaches refine their skills and strategies.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ConditionalNavbar />
        <div className="min-h-screen bg-black text-gray-200">
          {children}
        </div>
      </body>
    </html>
  );
}
