"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen flex items-center justify-center px-4 pb-20">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card/80 backdrop-blur-sm p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold mb-1">
            MI
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            MayIMeetYou
          </h1>
          <p className="text-sm text-muted-foreground">
            Polite audio introductions for meaningful connections.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            type="button"
            onClick={handleSignIn}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Checking your session..." : "Continue with Google"}
          </Button>
          {error && (
            <p className="text-xs text-red-600 text-center">{error}</p>
          )}
        </div>

        <p className="text-[11px] leading-snug text-muted-foreground text-center">
          By continuing, you confirm you are 18+ and agree to keep whispers kind,
          respectful, and spam-free.
        </p>
      </div>
    </div>
  );
}
