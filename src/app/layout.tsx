import type { Metadata } from "next";
import { Fraunces, Archivo } from "next/font/google";
import "./globals.css";
import SmoothScrollProvider from "@/components/layout/SmoothScrollProvider";
import Header from "@/components/layout/Header";
import AdminAccess from "@/components/layout/AdminAccess";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shutter Studio | Photography",
  description:
    "A cinematic photography portfolio — landscapes, portraits, and light, captured frame by frame.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${archivo.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-(--color-bg) text-(--color-fg)"
        suppressHydrationWarning
      >
        <SmoothScrollProvider>
          <Header />
          {children}
          <AdminAccess />
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
