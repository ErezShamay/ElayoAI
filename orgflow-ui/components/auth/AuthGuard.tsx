"use client";

import {
  useEffect,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import AppLoadingScreen from "@/components/ui/AppLoadingScreen";
import {
  useAuth,
} from "@/contexts/AuthContext";
import { isPublicRoute } from "@/lib/navigation";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return;
    }

    const isAuthPage = pathname.startsWith("/auth");
    const isPublic = isPublicRoute(pathname);
    const preserveAuthFlow =
      pathname.startsWith("/auth/set-password")
      || pathname.startsWith("/auth/callback");

    if (!user && !isPublic) {
      router.push("/auth/login");
      return;
    }

    if (user && isAuthPage && !preserveAuthFlow) {
      router.push("/");
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return <AppLoadingScreen />;
  }

  const isAuthPage = pathname.startsWith("/auth");
  const isPublic = isPublicRoute(pathname);
  const preserveAuthFlow =
    pathname.startsWith("/auth/set-password")
    || pathname.startsWith("/auth/callback");

  if (!user && !isPublic) {
    return null;
  }

  if (user && isAuthPage && !preserveAuthFlow) {
    return null;
  }

  return <>{children}</>;
}
