import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-sans',
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: "SSLDUCK.COM | Premium Career Content & AI Resume Audit",
  description: "Get a professional resume audit & gap analysis delivered in under 48 hours. Expert career strategies and premium professional content.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
