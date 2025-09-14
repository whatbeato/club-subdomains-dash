import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Club Subdomains Dashboard",
  description: "Manage your Hack Club subdomains.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a href="https://hackclub.com/">
          <img style={{ position: "absolute", top: 0, left: 10, border: 0, width: 180, zIndex: 999 }} src="https://assets.hackclub.com/flag-orpheus-top.svg" alt="Hack Club"/>
        </a>
        {children}
      </body>
    </html>
  );
}
