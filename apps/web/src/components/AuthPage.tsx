"use client";

import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { BACKEND_URL } from "../app/config";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { ArrowLeft } from "lucide-react";

export function AuthPage({ isSignin }: { isSignin: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignin) {
        // Sign In Request
        const response = await axios.post(`${BACKEND_URL}/api/v1/auth/signin`, {
          username,
          password,
        });

        if (response.data?.token) {
          localStorage.setItem("token", response.data.token);
          // Redirect to homepage/landing
          router.push("/");
          router.refresh();
        } else {
          setError(
            response.data?.message || "Invalid credentials. Please try again.",
          );
        }
      } else {
        // Sign Up Request
        const response = await axios.post(`${BACKEND_URL}/api/v1/auth/signup`, {
          username,
          email,
          password,
          name,
        });

        if (response.status === 200 || response.data?.userId) {
          // Redirect to sign in page
          router.push("/signin");
        } else {
          setError(response.data?.message || "Registration failed. Try again.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "An unexpected error occurred. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] px-4 py-12 sm:px-6 lg:px-8 font-sans relative">
      {/* Back to Home Button - Floating Top Left */}
      <div className="absolute top-6 left-6">
        <Button
          variant="secondary"
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 font-mono text-xs shadow-sm bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">BACK TO HOME</span>
          <span className="sm:hidden">HOME</span>
        </Button>
      </div>
      <div className="max-w-md w-full space-y-8 bg-white border border-[#E5E0D8] p-8 rounded-xl shadow-[0_4px_24px_rgba(229,224,216,0.25)] relative overflow-hidden">
        {/* Monospace accent line at the top */}
        <div className="absolute top-0 left-0 w-full h-1 bg-[#D95F4D]"></div>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="h-6 w-6 bg-[#1E1E1E] rounded-md flex items-center justify-center text-white font-mono text-xs font-bold">
              S
            </span>
            <span className="font-mono text-xs font-semibold tracking-widest text-[#A19D94]">
              SCRAWL
            </span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1E1E1E]">
            {isSignin ? "Welcome back" : "Create an account"}
          </h2>
          <p className="mt-2 text-sm text-[#706B5F]">
            {isSignin
              ? "Enter your credentials to access your canvas"
              : "Start scrawling your messy middle process"}
          </p>
        </div>

        {error && (
          <div
            className="bg-[#FDF3F2] border border-[#F5C7C1] text-[#C24E3D] px-4 py-3 rounded-lg text-sm relative"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!isSignin && (
              <>
                <Input
                  label="Full Name"
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  label="Email Address"
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </>
            )}

            <Input
              label="Username"
              id="username"
              name="username"
              type="text"
              required
              placeholder="johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <Input
              label="Password"
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5"
              isLoading={loading}
            >
              {isSignin ? "Sign in" : "Sign up"}
            </Button>
          </div>
        </form>

        <div className="text-center mt-4">
          <button
            onClick={() => router.push(isSignin ? "/signup" : "/signin")}
            className="text-sm font-medium text-[#D95F4D] hover:text-[#C24E3D] hover:cursor-pointer transition-colors"
          >
            {isSignin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
