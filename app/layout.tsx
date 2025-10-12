import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import { FirebaseAnalyticsProvider } from "@/components/FirebaseAnalyticsProvider";
import { AuthProvider } from "@/components/auth-provider";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Nutrition Assistant",
  description:
    "Log meals, visualize macros, and receive a friendly AI-style recap in a single responsive dashboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={font.className}>
        <AuthProvider>
          <FirebaseAnalyticsProvider />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
