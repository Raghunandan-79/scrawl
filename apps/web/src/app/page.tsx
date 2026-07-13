import React from "react";
import LandingClient from "../components/LandingClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scrawl - Infinite Collaborative Sketching Canvas",
  description: "A raw, digital canvas for the messy middle of the creative process. Draw wobbly circles, join custom rooms, and design together in real-time.",
};

export default function Home() {
  return <LandingClient />;
}
