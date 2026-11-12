import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { APP_NAME } from "@dots/shared";
import { ClerkProvider } from "@/components/auth/ClerkProvider";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: `${APP_NAME} — Спортивные точки`,
  description: "Online 1v1 Спортивные точки — Canvas board + Socket.IO",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="ru">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
