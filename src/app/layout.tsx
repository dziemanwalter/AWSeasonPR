import type { Metadata } from "next";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { DropdownNav } from "./dropdownmenu";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AW Season PR",
  description: "Track player statistics, kill streaks, and battlegroup performance for AW Masters",
  keywords: ["AW Masters", "gaming", "statistics", "dashboard", "kill streaks", "battlegroup"],
  authors: [{ name: "AW Masters" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Combine classes safely with fallback to empty string
  const bodyClass = `antialiased ${geistSans.variable ?? ""} ${geistMono.variable ?? ""}`;

  return (
    <html lang="en" suppressHydrationWarning className="bg-gray-900">
      <body className={`${bodyClass} bg-gray-900`} suppressHydrationWarning>
        <div className="min-h-screen bg-gray-900 text-white">
          {/* Navigation Header */}
          <header className="bg-gray-800 border-b border-gray-700 p-4">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold text-yellow-400">AW Season PR</h1>
              <DropdownNav />
            </div>
          </header>
          
          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
