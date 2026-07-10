"use client";
import { useRouter } from "next/navigation";
import { useRef, useEffect } from "react";

export default function Home() {
  const roomId = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/signin");
    }
  }, [router]);

  return (
    <div className="flex w-screen h-screen justify-center items-center">
      <div className="flex gap-2">
        <input className="border-2 p-2 rounded" ref={roomId} type="text" placeholder="Room id" />

        <button className="bg-emerald-600 p-2 rounded"
          onClick={() => {
            router.push(`/room/${roomId.current?.value}`);
          }}
        >
          Join Room
        </button>
      </div>
    </div>
  );
}
