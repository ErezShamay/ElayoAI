"use client";

import { useEffect, useState } from "react";

import {
  OFFLINE_PREP_ACTIVE_CHANGED_EVENT,
  readOfflinePrepActive,
} from "@/lib/field-reports/offline-prep-active";

export function useOfflinePrepActive(organizationId: string): boolean {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!organizationId) {
      setIsActive(false);
      return;
    }

    const sync = () => {
      setIsActive(readOfflinePrepActive(organizationId));
    };

    sync();
    window.addEventListener(OFFLINE_PREP_ACTIVE_CHANGED_EVENT, sync);

    return () => {
      window.removeEventListener(OFFLINE_PREP_ACTIVE_CHANGED_EVENT, sync);
    };
  }, [organizationId]);

  return isActive;
}
