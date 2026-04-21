import type { Metadata } from "next";
import "./globals.css";
import PasswordGate from "@/components/PasswordGate";

export const metadata: Metadata = {
  title: "Resume Optimizer",
  description: "AI-powered resume optimization for higher response rates",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold select-none">
                R
              </div>
              <span className="font-semibold text-gray-900 text-sm tracking-tight">
                ResumeOptimizer
              </span>
            </div>
          </div>
        </header>
        <PasswordGate>{children}</PasswordGate>
      </body>
    </html>
  );
}
