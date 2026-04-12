"use client";
// Redirige al dashboard — punto de entrada legacy (Vite). Next.js usa app/(app)/page.tsx
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const Index = () => {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard"); }, [router]);
  return null;
};

export default Index;
