"use client";

import {
  useEffect,
} from "react";

import {
  useRouter,
} from "next/navigation";

import AppLoadingScreen from "@/components/ui/AppLoadingScreen";
import {
  useAuth,
} from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/auth/permissions";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isAdmin(profile?.role)) {
      router.replace("/");
    }
  }, [loading, profile?.role, router]);

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (!isAdmin(profile?.role)) {
    return null;
  }

  return <>{children}</>;
}
