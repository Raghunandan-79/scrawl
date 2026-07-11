"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { BACKEND_URL } from "./config";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { LogOut, ArrowRight, User, Plus, Compass, Sparkles, Download } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [roomSlug, setRoomSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, []);

  const handleCreateOrJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomSlug.trim()) return;

    setLoading(true);
    setError(null);

    const slug = roomSlug.trim().toLowerCase().replace(/\s+/g, "-");

    try {
      const storedToken = localStorage.getItem("token");
      if (!storedToken) {
        router.push("/signin");
        return;
      }

      // Check if room already exists by trying to join
      const joinResponse = await axios.post(`${BACKEND_URL}/api/v1/room/join-room/${slug}`);
      
      if (joinResponse.data?.room) {
        // Room exists, redirect to it using slug
        router.push(`/canvas/${joinResponse.data.room.slug}`);
      } else {
        // Room doesn't exist, create it
        const createResponse = await axios.post(
          `${BACKEND_URL}/api/v1/room/create-room`,
          { name: slug },
          {
            headers: {
              token: storedToken,
            },
          }
        );

        if (createResponse.data?.roomId) {
          router.push(`/canvas/${slug}`);
        } else {
          setError("Failed to create room. It might already exist or inputs are invalid.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "An error occurred while opening the workspace. Ensure you are signed in."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    router.refresh();
  };

  const handleGetStartedRandom = async () => {
    setLoading(true);
    setError(null);

    const randomSlug = `rm-${Math.random().toString(36).substr(2, 8)}`;

    try {
      const storedToken = localStorage.getItem("token");
      if (!storedToken) {
        router.push("/signup");
        return;
      }

      const createResponse = await axios.post(
        `${BACKEND_URL}/api/v1/room/create-room`,
        { name: randomSlug },
        {
          headers: {
            token: storedToken,
          },
        }
      );

      if (createResponse.data?.roomId) {
        router.push(`/canvas/${randomSlug}`);
      } else {
        setError("Failed to create canvas workspace.");
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Could not generate random canvas workspace. Ensure you are signed in."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1E1E1E] flex flex-col font-sans relative">
      {/* Navigation */}
      <header className="border-b border-[#E5E0D8] px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <span className="h-7 w-7 bg-[#1E1E1E] rounded-md flex items-center justify-center text-[#FAF8F5] font-mono text-sm font-extrabold select-none">
            S
          </span>
          <span className="font-mono text-sm font-extrabold tracking-widest text-[#1E1E1E]">
            SCRWAL
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-[11px] font-mono font-bold tracking-widest text-[#706B5F]">
          <a href="#features" className="hover:text-[#1E1E1E] transition-colors">
            FEATURES
          </a>
          <a href="#manifesto" className="hover:text-[#1E1E1E] transition-colors">
            MANIFESTO
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {token ? (
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="font-mono text-xs font-bold tracking-wider"
              >
                MY PAGES
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Log out"
                className="text-[#706B5F] hover:text-[#D95F4D]"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/signin")}
                className="font-mono text-xs font-bold tracking-wider"
              >
                SIGN IN
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push("/signup")}
                className="font-mono text-xs font-bold tracking-wider"
              >
                GET STARTED
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 md:py-24 max-w-4xl mx-auto">
        <div className="inline-flex items-center bg-white border border-[#E5E0D8] px-3.5 py-1.5 rounded-full shadow-[0_2px_8px_rgba(229,224,216,0.15)] mb-8 select-none">
          <span className="font-mono text-[10px] font-bold tracking-wider text-[#D95F4D]">
            BETA 0.1 OUT NOW
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-8 max-w-3xl">
          A raw, digital canvas for the messy middle of the creative process.
        </h1>
        <p className="text-lg md:text-xl text-[#706B5F] max-w-2xl mb-12">
          No grids to snap to. Just you, your collaborators, and your raw ideas.
        </p>

        {token ? (
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <Button
              variant="danger"
              size="lg"
              onClick={handleGetStartedRandom}
              isLoading={loading}
              className="font-mono font-bold tracking-wider py-4 px-8 text-sm uppercase flex items-center gap-2"
            >
              Get Started (Random Canvas) <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setIsModalOpen(true)}
              className="font-mono font-bold tracking-wider py-4 px-8 text-sm uppercase"
            >
              Open Custom Workspace
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push("/signup")}
              className="font-mono font-bold tracking-wider py-4 px-8 text-sm uppercase"
            >
              Get Started
            </Button>
            <span className="font-mono text-[10px] tracking-widest text-[#A19D94] uppercase">
              No account required to start
            </span>
          </div>
        )}
      </main>

      {/* Feature Showcase Grid Section */}
      <section id="features" className="border-t border-[#E5E0D8] bg-white py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Sketch Illustration */}
          <div className="border border-[#E5E0D8] bg-[#FAF8F5] p-8 rounded-2xl aspect-[4/3] flex items-center justify-center relative overflow-hidden shadow-sm">
            <div className="absolute top-4 left-4 font-mono text-[10px] text-[#A19D94] font-bold">
              SCRWAL.CANVAS
            </div>
            {/* Inline SVG rendering sketch to visually impress the user */}
            <svg
              className="w-4/5 h-4/5 text-[#1E1E1E]"
              viewBox="0 0 400 300"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              {/* wobbly circles */}
              <circle cx="120" cy="100" r="50" strokeDasharray="3 3" />
              <circle cx="123" cy="98" r="49" />
              {/* wobbly cubes */}
              <rect x="200" y="80" width="80" height="80" />
              <rect x="220" y="60" width="80" height="80" strokeDasharray="5 5" />
              <line x1="200" y1="80" x2="220" y2="60" />
              <line x1="280" y1="80" x2="300" y2="60" />
              <line x1="280" y1="160" x2="300" y2="140" />
              <line x1="200" y1="160" x2="220" y2="140" />
              {/* lines and connections */}
              <line x1="120" y1="150" x2="200" y2="120" stroke="#D95F4D" strokeWidth="2" />
              <line x1="120" y1="150" x2="240" y2="240" />
              {/* triangle */}
              <polygon points="240,240 180,200 300,180" />
            </svg>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-10">
            <div>
              <span className="font-mono text-xs text-[#D95F4D] font-bold tracking-wider block mb-2">
                01 / INTUITIVE
              </span>
              <h3 className="text-2xl font-bold mb-3">Zero friction input</h3>
              <p className="text-[#706B5F] leading-relaxed">
                Modeled after the friction of graphite on heavy-weight paper. Every stroke feels
                deliberate, not digital. Sketch ideas instantly with collaborators.
              </p>
            </div>
            <div>
              <span className="font-mono text-xs text-[#D95F4D] font-bold tracking-wider block mb-2">
                02 / INFINITE
              </span>
              <h3 className="text-2xl font-bold mb-3">Space for every tangent</h3>
              <p className="text-[#706B5F] leading-relaxed">
                The canvas expands with your thought process. Zoom in for details, pan out for the big
                picture, and draw connections across massive visual planes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Workspace Features */}
      <section className="bg-[#FAF8F5] py-20 border-t border-[#E5E0D8] px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="border border-[#E5E0D8] bg-white p-8 rounded-2xl shadow-sm flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="h-10 w-10 rounded-full bg-[#FAF8F5] border border-[#E5E0D8] flex items-center justify-center mb-6">
                <Sparkles className="h-5 w-5 text-[#D95F4D]" />
              </div>
              <h4 className="font-mono text-xs font-bold tracking-wider text-[#1E1E1E] uppercase mb-3">
                Rough Mode
              </h4>
              <p className="text-sm text-[#706B5F] leading-relaxed">
                Perfect circles are boring. Scrawl preserves the human wobble that makes your sketches
                feel alive.
              </p>
            </div>
          </div>

          <div className="border border-[#E5E0D8] bg-white p-8 rounded-2xl shadow-sm flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="h-10 w-10 rounded-full bg-[#FAF8F5] border border-[#E5E0D8] flex items-center justify-center mb-6">
                <Download className="h-5 w-5 text-[#D95F4D]" />
              </div>
              <h4 className="font-mono text-xs font-bold tracking-wider text-[#1E1E1E] uppercase mb-3">
                Quick Export
              </h4>
              <p className="text-sm text-[#706B5F] leading-relaxed">
                Take your messy ideas into polished tools. SVG and PNG exports that look like they were
                scanned from a notebook.
              </p>
            </div>
          </div>

          <div className="border border-[#E5E0D8] bg-white p-8 rounded-2xl shadow-sm flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="h-10 w-10 rounded-full bg-[#FAF8F5] border border-[#E5E0D8] flex items-center justify-center mb-6">
                <Compass className="h-5 w-5 text-[#D95F4D]" />
              </div>
              <h4 className="font-mono text-xs font-bold tracking-wider text-[#1E1E1E] uppercase mb-3">
                Collaborative
              </h4>
              <p className="text-sm text-[#706B5F] leading-relaxed">
                Share a workspace link and design together in real-time. Minimal UI overlay for maximum focus.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Manifesto Call-to-action */}
      <section id="manifesto" className="bg-[#FAF8F5] border-t border-[#E5E0D8] py-24 text-center px-6">
        <h2 className="text-3xl md:text-5xl font-extrabold mb-12">
          Your best work doesn&apos;t start in a document.
        </h2>
        <button
          onClick={() => {
            if (token) {
              setIsModalOpen(true);
            } else {
              router.push("/signup");
            }
          }}
          className="text-lg font-mono font-bold uppercase tracking-wider text-[#D95F4D] border-b-2 border-[#D95F4D] pb-1 hover:text-[#1E1E1E] hover:border-[#1E1E1E] transition-all hover:cursor-pointer"
        >
          Start Scrawlling
        </button>
      </section>

      {/* Quick Modal for Rooms */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1E1E1E]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E0D8] rounded-2xl p-6 w-full max-w-md relative shadow-2xl">
            <h3 className="text-lg font-extrabold mb-2">My Workspace Rooms</h3>
            <p className="text-xs text-[#706B5F] mb-6">
              Enter a workspace slug to open it. If it doesn&apos;t exist, it will be automatically created under your account.
            </p>

            <form onSubmit={handleCreateOrJoinRoom} className="flex flex-col gap-3">
              <Input
                label="Workspace Room Slug"
                placeholder="project-alpha"
                value={roomSlug}
                onChange={(e) => setRoomSlug(e.target.value)}
                required
              />
              {error && <p className="text-xs text-[#D95F4D]">{error}</p>}
              <div className="flex gap-2.5 mt-4 justify-end">
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={loading}>
                  Join Room
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer - Strictly contains ONLY the requested links and text */}
      <footer className="border-t border-[#E5E0D8] bg-[#FAF8F5] py-12 px-6 mt-auto text-center font-sans">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-3">
          <p className="text-xs font-mono font-bold tracking-wider text-[#706B5F] uppercase">
            SCRWAL
          </p>
          <p className="text-sm font-semibold text-[#1E1E1E]">
            made by{" "}
            <a
              href="https://github.com/Raghunandan-79"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D95F4D] hover:underline"
            >
              Raghunandan Sharma
            </a>
          </p>
          <div className="flex gap-6 mt-1 text-xs">
            <a
              href="https://github.com/Raghunandan-79"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#706B5F] hover:text-[#1E1E1E] font-medium transition-colors"
            >
              GitHub Profile
            </a>
            <a
              href="https://portfolio.raghunandan.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#706B5F] hover:text-[#1E1E1E] font-medium transition-colors"
            >
              Portfolio Website
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}