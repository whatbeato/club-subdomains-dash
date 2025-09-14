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
  description: "Get a free subdomain for your club.",
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
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <main style={{ flex: 1 }}>
            {children}
          </main>
          <footer style={{
            backgroundColor: '#f8f9fa',
            borderTop: '1px solid #e9ecef',
            padding: '32px 24px',
            textAlign: 'center',
            color: '#6c757d',
            fontSize: '0.9rem',
            marginTop: 'auto'
          }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <p style={{ margin: '0 0 16px 0', lineHeight: '1.6' }}>
                Club Subdomains by{' '}
                <a 
                  href="https://lynn.pt" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#ec3750', textDecoration: 'none', fontWeight: 'bold' }}
                >
                  Lynn
                </a>
                . Made with ❤️ in Portugal.
                <br />
                Not an official Hack Club project. Funded entirely by donations.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <a 
                  href="https://hackclub.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#6c757d', textDecoration: 'none' }}
                >
                  Hack Club
                </a>
                <a 
                  href="https://github.com/whatbeato/club-subdomains-dash"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#6c757d', textDecoration: 'none' }}
                >
                  Source Code
                </a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
