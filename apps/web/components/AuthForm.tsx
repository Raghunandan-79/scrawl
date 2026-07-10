"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { BACKEND_URL } from "../app/config";

// --- Custom SVGs for premium feel ---
const MailIcon = () => (
  <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const UserTagIcon = () => (
  <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-4 h-4 text-neutral-400 hover:text-neutral-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-4 h-4 text-neutral-400 hover:text-neutral-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L5.636 5.636m-1.414 1.414L19 19.828l1.414-1.414" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4 text-neutral-400 hover:text-neutral-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 6H16" />
  </svg>
);

interface Toast {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

interface AuthFormProps {
  initialMode: "signin" | "signup";
}

export default function AuthForm({ initialMode }: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [view, setView] = useState<"auth" | "forgot-password">("auth");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // CAPTCHA State
  const [captchaText, setCaptchaText] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaDetails, setCaptchaDetails] = useState<{
    lines: { x1: number; y1: number; x2: number; y2: number; color: string }[];
    dots: { cx: number; cy: number; r: number; color: string }[];
    chars: { char: string; rotate: number; y: number }[];
  }>({ lines: [], dots: [], chars: [] });

  // Custom Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Generate CAPTCHA code
  const generateCaptcha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Omit confusing letters like O, I, 1, 0
    let text = "";
    for (let i = 0; i < 5; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(text);
    setCaptchaInput("");

    // Generate random background lines and noise dots for SVG
    const lines = [];
    for (let i = 0; i < 6; i++) {
      lines.push({
        x1: Math.random() * 30,
        y1: Math.random() * 40,
        x2: 90 + Math.random() * 60,
        y2: Math.random() * 40,
        color: `hsl(${Math.random() * 360}, 60%, 50%)`,
      });
    }

    const dots = [];
    for (let i = 0; i < 30; i++) {
      dots.push({
        cx: Math.random() * 150,
        cy: Math.random() * 40,
        r: Math.random() * 1.5 + 0.5,
        color: `hsl(${Math.random() * 360}, 50%, 60%)`,
      });
    }

    const charDetails = text.split("").map((char) => ({
      char,
      rotate: Math.random() * 30 - 15, // Rotate between -15deg and 15deg
      y: 24 + Math.random() * 10, // vertical variation
    }));

    setCaptchaDetails({ lines, dots, chars: charDetails });
  };

  useEffect(() => {
    generateCaptcha();
  }, [mode, view]);

  // Sync mode update with page state
  useEffect(() => {
    setMode(initialMode);
    setView("auth");
  }, [initialMode]);

  const handleToggle = (targetMode: "signin" | "signup") => {
    setMode(targetMode);
    setView("auth");
    // Change URL route without reloading
    router.push(targetMode === "signin" ? "/signin" : "/signup");
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. CAPTCHA Check
    if (captchaInput.trim().toUpperCase() !== captchaText) {
      addToast("error", "Incorrect CAPTCHA verification code");
      generateCaptcha();
      return;
    }

    // 2. Client side validations
    if (mode === "signup") {
      if (!name.trim()) {
        addToast("error", "Name is required");
        return;
      }
      if (name.length < 3 || name.length > 50) {
        addToast("error", "Name must be between 3 and 50 characters");
        return;
      }
      if (username.length < 3 || username.length > 20) {
        addToast("error", "Username must be between 3 and 20 characters");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        addToast("error", "Please enter a valid email address");
        return;
      }
      if (password.length < 4 || password.length > 30) {
        addToast("error", "Password must be between 4 and 30 characters");
        return;
      }
      if (!agreeToTerms) {
        addToast("error", "You must agree to the Terms of Service & Privacy Policy");
        return;
      }
    } else {
      if (username.length < 3) {
        addToast("error", "Username must be at least 3 characters");
        return;
      }
      if (password.length < 4) {
        addToast("error", "Password must be at least 4 characters");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const response = await axios.post(`${BACKEND_URL}/api/v1/auth/signup`, {
          username,
          email,
          password,
          name: name.trim(),
        });

        if (response.data?.userId) {
          addToast("success", "Registration successful! You can now Sign In.");
          // Prefill username in login and switch tab
          setTimeout(() => {
            setMode("signin");
            router.push("/signin");
          }, 1500);
        } else {
          addToast("error", response.data?.message || "Registration failed");
        }
      } else {
        const response = await axios.post(`${BACKEND_URL}/api/v1/auth/signin`, {
          username,
          password,
        });

        if (response.data?.token) {
          addToast("success", "Sign in successful! Redirecting...");
          localStorage.setItem("token", response.data.token);
          setTimeout(() => {
            router.push("/");
          }, 1500);
        } else {
          addToast("error", response.data?.message || "Invalid credentials");
        }
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.message || "Connection to authentication backend failed";
      addToast("error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      addToast("error", "Please enter a valid email address");
      return;
    }

    setLoading(true);
    // Mock sending reset link
    setTimeout(() => {
      setLoading(false);
      addToast("success", `Reset instructions sent to ${forgotEmail}! (Mocked)`);
      setForgotEmail("");
      setView("auth");
    }, 1500);
  };

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-neutral-950 font-sans p-4 overflow-hidden">
      {/* Background elements */}
      <div className="perspective-grid" />
      
      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[140px] pointer-events-none" />
      
      {/* Main card container (Standalone Form Card) */}
      <div className="relative w-full max-w-md bg-white border border-neutral-200/60 rounded-3xl shadow-2xl p-8 md:p-10 z-10 transition-all duration-300">
        
        {view === "auth" ? (
          <>
            {/* Header branding logo */}
            <div className="flex items-center gap-2 mb-6 justify-center">
              <div className="p-1.5 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <span className="text-xl font-black tracking-tight text-neutral-900">
                Scrawl
              </span>
            </div>

            {/* Header mode switcher */}
            <div className="flex justify-between items-start mb-6 gap-4 border-b border-neutral-100 pb-4">
              <div className="flex flex-col">
                <h1 className="text-xl font-extrabold tracking-tight text-neutral-900">
                  {mode === "signin" ? "Sign In" : "Create Account"}
                </h1>
                <p className="text-neutral-400 text-xs mt-1">
                  {mode === "signin" ? "Access your room workspace" : "Get started with Scrawl today"}
                </p>
              </div>
              <span className="text-xs text-neutral-500 shrink-0 pt-1 text-right">
                {mode === "signin" ? "New? " : "Registered? "}
                <button
                  type="button"
                  onClick={() => handleToggle(mode === "signin" ? "signup" : "signin")}
                  className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors hover:underline cursor-pointer"
                >
                  {mode === "signin" ? "Sign Up" : "Sign In"}
                </button>
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  {/* Name field */}
                  <div>
                    <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5 block">
                      Name
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 pointer-events-none">
                        <UserIcon />
                      </div>
                      <input
                        key="auth-signup-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-11 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-neutral-900 outline-none placeholder-neutral-400 text-sm"
                      />
                    </div>
                  </div>

                  {/* Email address field */}
                  <div>
                    <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5 block">
                      Email Address
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 pointer-events-none">
                        <MailIcon />
                      </div>
                      <input
                        key="auth-signup-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full pl-11 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-neutral-900 outline-none placeholder-neutral-400 text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Username field */}
              <div>
                <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5 block">
                  Username
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 pointer-events-none">
                    <UserTagIcon />
                  </div>
                  <input
                    key="auth-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="johndoe12"
                    className="w-full pl-11 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-neutral-900 outline-none placeholder-neutral-400 text-sm"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider block">
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setView("forgot-password")}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-500 hover:underline transition-colors focus:outline-none cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-4 pointer-events-none">
                    <LockIcon />
                  </div>
                  <input
                    key="auth-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-neutral-900 outline-none placeholder-neutral-400 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-neutral-400 hover:text-neutral-600 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* CAPTCHA section */}
              <div className="border border-neutral-200 bg-neutral-50 rounded-xl p-3.5 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                    Verification CAPTCHA
                  </span>
                  <button
                    type="button"
                    onClick={generateCaptcha}
                    className="p-1 hover:bg-neutral-200/60 rounded-md transition-colors cursor-pointer text-neutral-500 hover:text-neutral-700"
                    title="Generate new CAPTCHA"
                  >
                    <RefreshIcon />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative select-none bg-white border border-neutral-200 rounded-lg flex-1 h-10.5 overflow-hidden flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 150 40">
                      {/* Grid lines */}
                      <path d="M 0,10 L 150,10 M 0,20 L 150,20 M 0,30 L 150,30" stroke="#f3f4f6" strokeWidth="1" />
                      <path d="M 30,0 L 30,40 M 60,0 L 60,40 M 90,0 L 90,40 M 120,0 L 120,40" stroke="#f3f4f6" strokeWidth="1" />

                      {/* Random Noise Lines */}
                      {captchaDetails.lines.map((line, i) => (
                        <line
                          key={`l-${i}`}
                          x1={line.x1}
                          y1={line.y1}
                          x2={line.x2}
                          y2={line.y2}
                          stroke={line.color}
                          strokeWidth="1.2"
                          opacity="0.35"
                        />
                      ))}

                      {/* Noise Dots */}
                      {captchaDetails.dots.map((dot, i) => (
                        <circle
                          key={`d-${i}`}
                          cx={dot.cx}
                          cy={dot.cy}
                          r={dot.r}
                          fill={dot.color}
                          opacity="0.3"
                        />
                      ))}

                      {/* Characters */}
                      {captchaDetails.chars.map((char, i) => (
                        <text
                          key={`c-${i}`}
                          x={16 + i * 26}
                          y={char.y}
                          fill={`hsl(${200 + i * 30}, 85%, 45%)`}
                          fontSize="22"
                          fontWeight="bold"
                          fontFamily="monospace, sans-serif"
                          letterSpacing="4"
                          transform={`rotate(${char.rotate}, ${16 + i * 26}, ${char.y})`}
                        >
                          {char.char}
                        </text>
                      ))}
                    </svg>
                  </div>

                  <input
                    key="auth-captcha"
                    type="text"
                    required
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    placeholder="Enter code"
                    maxLength={5}
                    className="w-28 py-2 px-3 bg-white border border-neutral-200 rounded-lg text-center font-mono focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-neutral-900 outline-none uppercase placeholder-neutral-400 text-sm"
                  />
                </div>
              </div>

              {/* Agreement / Options */}
              {mode === "signup" ? (
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    key="auth-agree-terms"
                    type="checkbox"
                    id="agreeToTerms"
                    required
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="agreeToTerms" className="text-xs text-neutral-500 leading-normal select-none cursor-pointer">
                    I agree to the{" "}
                    <span className="text-indigo-600 font-bold hover:underline">Terms of Service</span>{" "}
                    and{" "}
                    <span className="text-indigo-600 font-bold hover:underline">Privacy Policy</span>.
                  </label>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    key="auth-remember-me"
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="rememberMe" className="text-xs text-neutral-500 select-none cursor-pointer">
                    Remember me on this device
                  </label>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-full shadow-lg shadow-neutral-900/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 mt-4 cursor-pointer text-sm font-sans"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : mode === "signin" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
          </>
        ) : (
          /* Forgot Password View */
          <div className="animate-fadeIn flex-1 flex flex-col justify-center">
            {/* Header */}
            <div className="flex flex-col mb-6">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl mb-4 w-12 h-12 flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-neutral-900">Forgot Password?</h2>
              <p className="text-neutral-500 text-xs mt-2 leading-relaxed">
                No worries! Enter the email address associated with your account, and we will send you a reset link.
              </p>
            </div>

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5 block">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 pointer-events-none">
                    <MailIcon />
                  </div>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-11 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-neutral-900 outline-none placeholder-neutral-400 text-sm"
                  />
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-full shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  "Send Reset Link"
                )}
              </button>

              <button
                type="button"
                onClick={() => setView("auth")}
                className="w-full py-2.5 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100/80 text-neutral-700 font-semibold rounded-full transition-all text-xs block text-center cursor-pointer"
              >
                Back to Sign In
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Modern custom toast alerts container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 ${
              toast.type === "success"
                ? "bg-emerald-950/90 border-emerald-800/60 text-emerald-200 shadow-emerald-950/20"
                : toast.type === "error"
                ? "bg-red-950/90 border-red-800/60 text-red-200 shadow-red-950/20"
                : "bg-neutral-900/90 border-neutral-800 text-neutral-100 shadow-black/40"
            }`}
          >
            {/* Status Icons */}
            {toast.type === "success" ? (
              <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : toast.type === "error" ? (
              <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}

            <div className="text-xs font-semibold flex-1 leading-relaxed">{toast.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
