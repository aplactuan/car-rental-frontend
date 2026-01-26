"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length > 0 && !isLoading;
  }, [email, password, isLoading]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Login failed.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Network error. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Light purple gradient at top */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-purple-50 to-transparent" />
      
      <div className="relative flex min-h-screen">
        {/* Left Section - Illustration (40%) */}
        <div className="hidden lg:flex lg:w-[40%] items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-white p-12">
          <div className="relative w-full max-w-md">
            {/* Isometric Illustration */}
            <svg
              viewBox="0 0 400 400"
              className="w-full h-auto"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background decorative shapes */}
              <circle cx="80" cy="100" r="8" fill="#E9D5FF" opacity="0.6" />
              <circle cx="320" cy="150" r="6" fill="#E9D5FF" opacity="0.5" />
              <circle cx="100" cy="320" r="10" fill="#E9D5FF" opacity="0.4" />
              <circle cx="350" cy="280" r="7" fill="#E9D5FF" opacity="0.5" />
              
              {/* Book-like structure (isometric) */}
              <g transform="translate(100, 80)">
                {/* Book base */}
                <path
                  d="M 0 80 L 60 40 L 180 40 L 120 80 Z"
                  fill="#6366F1"
                  opacity="0.9"
                />
                <path
                  d="M 0 80 L 120 80 L 120 160 L 0 160 Z"
                  fill="#818CF8"
                />
                <path
                  d="M 120 80 L 180 40 L 180 120 L 120 160 Z"
                  fill="#A5B4FC"
                />
                
                {/* User profile icon inside book */}
                <circle cx="60" cy="120" r="20" fill="#FFFFFF" />
                <path
                  d="M 40 150 Q 40 140 60 140 Q 80 140 80 150 L 80 160 L 40 160 Z"
                  fill="#FFFFFF"
                />
                
                {/* Lines representing data */}
                <line x1="90" y1="100" x2="110" y2="100" stroke="#FFFFFF" strokeWidth="2" />
                <line x1="90" y1="110" x2="110" y2="110" stroke="#FFFFFF" strokeWidth="2" />
                <line x1="90" y1="120" x2="105" y2="120" stroke="#FFFFFF" strokeWidth="2" />
              </g>
              
              {/* Green checkmark icon */}
              <g transform="translate(200, 60)">
                <circle cx="0" cy="0" r="25" fill="#10B981" />
                <path
                  d="M -8 -2 L -2 4 L 8 -6"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </g>
              
              {/* Blue padlock icon */}
              <g transform="translate(280, 200)">
                <rect x="-20" y="-15" width="40" height="50" rx="4" fill="#3B82F6" />
                <rect x="-12" y="0" width="24" height="30" rx="2" fill="#FFFFFF" />
                <path
                  d="M -8 -25 Q -8 -35 0 -35 Q 8 -35 8 -25"
                  stroke="#3B82F6"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
              
              {/* Document icon */}
              <g transform="translate(60, 280)">
                <rect x="0" y="0" width="30" height="40" rx="2" fill="#FFFFFF" stroke="#6366F1" strokeWidth="2" />
                <line x1="8" y1="10" x2="22" y2="10" stroke="#6366F1" strokeWidth="1.5" />
                <line x1="8" y1="18" x2="22" y2="18" stroke="#6366F1" strokeWidth="1.5" />
                <line x1="8" y1="26" x2="18" y2="26" stroke="#6366F1" strokeWidth="1.5" />
              </g>
              
              {/* Red card with person icon */}
              <g transform="translate(300, 300)">
                <rect x="0" y="0" width="50" height="60" rx="4" fill="#EF4444" />
                <circle cx="25" cy="20" r="10" fill="#FFFFFF" />
                <path
                  d="M 10 40 Q 10 35 25 35 Q 40 35 40 40 L 40 50 L 10 50 Z"
                  fill="#FFFFFF"
                />
              </g>
            </svg>
          </div>
        </div>

        {/* Right Section - Form (60%) */}
        <div className="flex-1 lg:w-[60%] flex flex-col p-8 lg:p-12">
          {/* Top bar with logo and sign in link */}
          <div className="flex items-center justify-between mb-8 lg:mb-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="text-xl font-bold text-gray-900">CAR RENTAL</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Already have an account?</span>
              <button className="px-4 py-2 text-sm font-medium text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors">
                SIGN IN
              </button>
            </div>
          </div>

          {/* Form Container */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-md">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Welcome to Car Rental!
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Register your account
              </p>

              <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 px-4 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900 placeholder-gray-400"
                    placeholder="focus001@gmail.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-12 px-4 pr-12 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900 placeholder-gray-400"
                      placeholder="8+ characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full h-12 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? "Signing in..." : "Login"}
                </button>
              </form>

              {/* Social Login Section */}
              <div className="mt-8">
                <p className="text-center text-sm text-gray-600 mb-4">
                  Create account with
                </p>
                <div className="flex items-center justify-center gap-4">
                  {/* Facebook */}
                  <button className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center hover:bg-blue-700 transition-colors">
                    <span className="text-white font-bold text-lg">f</span>
                  </button>
                  
                  {/* LinkedIn */}
                  <button className="w-12 h-12 rounded-lg bg-blue-700 flex items-center justify-center hover:bg-blue-800 transition-colors">
                    <span className="text-white font-bold text-xs">in</span>
                  </button>
                  
                  {/* Google */}
                  <button className="w-12 h-12 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors">
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
