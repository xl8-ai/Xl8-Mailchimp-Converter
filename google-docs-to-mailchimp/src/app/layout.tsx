import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "XL8 Mailchimp Converter",
  description:
    "Convert Google Docs to Mailchimp-friendly HTML easily. Transform your Google Documents into clean, email-ready HTML code for Mailchimp campaigns.",
  keywords: [
    "Google Docs",
    "Mailchimp",
    "HTML converter",
    "Email marketing",
    "XL8",
  ],
  authors: [{ name: "XL8" }],
  creator: "XL8",
  publisher: "XL8",
  robots: "index, follow",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "XL8 Mailchimp Converter",
    description: "Convert Google Docs to Mailchimp-friendly HTML easily",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "XL8 Mailchimp Converter",
    description: "Convert Google Docs to Mailchimp-friendly HTML easily",
  },
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
        {children}
      </body>
    </html>
  );
}
