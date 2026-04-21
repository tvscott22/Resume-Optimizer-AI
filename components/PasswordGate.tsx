"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "ro_auth";

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const password = process.env.NEXT_PUBLIC_SITE_PASSWORD;
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!password || sessionStorage.getItem(SESSION_KEY) === "1") {
      setUnlocked(true);
    }
    setReady(true);
  }, [password]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input === password) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
    } else {
      setError(true);
      setInput("");
    }
  }

  if (!ready) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
            R
          </div>
          <span className="font-semibold text-gray-900 text-sm tracking-tight">
            ResumeOptimizer
          </span>
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-1">Enter password</h1>
        <p className="text-sm text-gray-500 mb-6">This app is currently in private beta.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            autoFocus
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            placeholder="Password"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 placeholder:text-gray-400"
          />
          {error && (
            <p className="text-xs text-red-500 font-medium">Incorrect password. Try again.</p>
          )}
          <button
            type="submit"
            disabled={!input}
            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
