"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import LoadingState from "@/components/ui/LoadingState";
import { useEffectiveRole } from "@/hooks/useEffectiveRole";
import {
  canResidentAccessRoute,
  residentDeniedRouteRedirect,
} from "@/lib/auth/resident-route-guard";

type ResidentRouteGuardProps = {
  children: React.ReactNode;
};

export default function ResidentRouteGuard({
  children,
}: ResidentRouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const role = useEffectiveRole();
  const allowed = canResidentAccessRoute(role, pathname);

  useEffect(() => {
    if (!allowed) {
      router.replace(residentDeniedRouteRedirect());
    }
  }, [allowed, router]);

  if (!allowed) {
    return (
      <div className="of-dashboard-page">
        <LoadingState message="מעביר לאזור האישי..." />
      </div>
    );
  }

  return <>{children}</>;
}
