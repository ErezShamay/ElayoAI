"use client";

import { useEffect } from "react";

import { initCapacitorApp } from "@/lib/capacitor/init";

/** מאתחל Capacitor פעם אחת בעת טעינת האפליקציה (native בלבד). */
export default function CapacitorBootstrap() {
  useEffect(() => {
    void initCapacitorApp();
  }, []);

  return null;
}
