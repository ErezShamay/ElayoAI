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
import {
  useIsAdmin,
} from "@/hooks/useEffectiveRole";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuth();
  const isAdminUser = useIsAdmin();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isAdminUser) {
      router.replace("/");
    }
  }, [loading, isAdminUser, router]);

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (!isAdminUser) {
    return null;
  }

  return <>{children}</>;
}
