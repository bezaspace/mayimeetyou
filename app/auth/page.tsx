"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function AuthPage() {
  const { user, loading, error, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/feed");
    }
  }, [loading, user, router]);

  const handleSignIn = async () => {
    await signInWithGoogle();
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Welcome to MayIMeetYou</h1>
      <p className="mb-6">Sign up or log in with Google to continue.</p>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading}
        className="px-4 py-2 rounded-md bg-black text-white text-sm font-medium disabled:opacity-60"
      >
        {loading ? "Checking session..." : "Continue with Google"}
      </button>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}
