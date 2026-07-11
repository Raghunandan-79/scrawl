"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { BACKEND_URL } from "./config";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { LogOut, ArrowRight, User, Plus, Compass, Sparkles, Download, Trash } from "lucide-react";

const getUserIdFromToken = (token: string): string | null => {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.userId || null;
  } catch (e) {
    return null;
  }
};

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [roomSlug, setRoomSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("token");
    setToken(t);
  }, []);

  const fetchRooms = async () => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) return;
    setLoadingRooms(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/v1/room/my-rooms`, {
        headers: { token: storedToken }
      });
      setRooms(res.data?.rooms || []);
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleDeleteRoom = async (roomId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this workspace and all its drawings?")) {
      return;
    }
    const storedToken = localStorage.getItem("token");
    if (!storedToken) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/v1/room/delete-room/${roomId}`, {
        headers: { token: storedToken }
      });
      fetchRooms();
    } catch (err: any) {
      console.error("Failed to delete room:", err);
      alert(err.response?.data?.message || "Could not delete room.");
    }
  };

  useEffect(() => {
    if (isModalOpen && token) {
      fetchRooms();
    }
  }, [isModalOpen, token]);

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
        const room = joinResponse.data.room;
        const currentUserId = getUserIdFromToken(storedToken);
        
        if (room.adminId === currentUserId) {
          // Room exists and user is owner -> redirect to slug (Edit mode)
          router.push(`/canvas/${room.slug}`);
          setIsModalOpen(false);
        } else {
          // Room exists but belongs to someone else -> redirect to numeric ID (Read-only mode)
          router.push(`/canvas/${room.id}`);
          setIsModalOpen(false);
        }
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
          setIsModalOpen(false);
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
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push("/signup")}
                className="font-mono font-bold tracking-wider py-4 px-8 text-sm uppercase"
              >
                Get Started
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push("/canvas/guest")}
                className="font-mono font-bold tracking-wider py-4 px-8 text-sm uppercase bg-white border border-[#E5E0D8]"
              >
                Try as Guest
              </Button>
            </div>
            <span className="font-mono text-[10px] tracking-widest text-[#A19D94] uppercase">
              Free local workspace • One canvas per device
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
          <div className="bg-white border border-[#E5E0D8] rounded-2xl p-6 w-full max-w-lg relative shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <h3 className="text-lg font-extrabold mb-1">My Workspace Pages</h3>
            <p className="text-xs text-[#706B5F] mb-6">
              Create new whiteboards or open and delete pages under your account.
            </p>

            {/* List of active rooms */}
            <div className="flex-1 overflow-y-auto mb-6 pr-1 space-y-2.5 max-h-[35vh] scrollbar-thin">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A19D94] block mb-2">
                All Pages ({rooms.length})
              </label>
              {loadingRooms ? (
                <div className="py-8 text-center text-xs font-mono text-[#A19D94]">
                  Loading your whiteboards...
                </div>
              ) : rooms.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-[#E5E0D8] rounded-xl text-xs font-mono text-[#A19D94] bg-[#FAF8F5]">
                  No whiteboards created yet.
                </div>
              ) : (
                rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#E5E0D8] bg-[#FAF8F5] hover:bg-white hover:border-[#1E1E1E] transition-all group cursor-pointer"
                    onClick={() => {
                      router.push(`/canvas/${room.slug}`);
                      setIsModalOpen(false);
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-[#1E1E1E] font-mono">
                        {room.slug}
                      </span>
                      <span className="text-[10px] text-[#A19D94] font-mono">
                        Created {new Date(room.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[#706B5F] hover:text-[#D95F4D] hover:bg-[#FDF3F2] rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDeleteRoom(room.id, e)}
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-[#E5E0D8] pt-5">
              <form onSubmit={handleCreateOrJoinRoom} className="flex flex-col gap-3">
                <Input
                  label="Create or Join Custom Room Slug"
                  placeholder="Enter page slug (e.g. wireframe-design)"
                  value={roomSlug}
                  onChange={(e) => setRoomSlug(e.target.value)}
                  required
                />
                {error && <p className="text-xs text-[#D95F4D]">{error}</p>}
                <div className="flex gap-2.5 mt-2 justify-end">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                    Close
                  </Button>
                  <Button variant="primary" size="sm" type="submit" isLoading={loading}>
                    Open Canvas Page
                  </Button>
                </div>
              </form>
            </div>
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