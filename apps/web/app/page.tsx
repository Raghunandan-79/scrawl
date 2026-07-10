"use client";
import { useRouter } from "next/navigation";
import { useRef } from "react";

export default function Home() {
  const roomId = useRef<HTMLInputElement>(null);
  const router = useRouter();

  return (
    <div className="flex w-screen h-screen justify-center items-center">
      <div className="flex gap-2">
        <input className="border-2 p-2 rounded" ref={roomId} type="text" placeholder="Room id" />

        <button className="bg-emerald-600 p-2 rounded"
          onClick={() => {
            router.push(`/rooms/${roomId.current?.value}`);
          }}
        >
          Join Room
        </button>
      </div>
    </div>
  );
}
