import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import "./approved-theme.css";
import "./demo-refinement.css";
import "./multi-group.css";
import { FinancialProvider } from "@/components/financial-provider";
import { DisplayPreferenceEffect } from "@/components/personal-settings";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vesta | Your money, in perspective",
  applicationName: "Vesta",
  description:
    "Understand your balances, review recurring charges, and explore your financial future with Vesta. Fictional demo and Nessie sandbox profiles.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <FinancialProvider>
          <DisplayPreferenceEffect />
          {children}
        </FinancialProvider>
      </body>
    </html>
  );
}
