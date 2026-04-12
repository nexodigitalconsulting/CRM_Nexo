import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../src/index.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CRM Nexo",
  description: "Sistema de gestión CRM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

export const dynamic = 'force-dynamic';
