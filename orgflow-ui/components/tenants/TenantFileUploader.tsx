"use client";

import { useRef, useState } from "react";

import Button from "@/components/ui/Button";
import { extractTenantsFromText } from "@/lib/tenants/extract";
import {
  parseExcelToText,
  tryParseExcelToTenants,
} from "@/lib/tenants/parsers";
import type { Tenant } from "@/lib/tenants/types";

type Props = {
  onTenants: (tenants: Tenant[]) => void;
};

export default function TenantFileUploader({ onTenants }: Props) {
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setStatus("קורא את הקובץ...");
    try {
      const name = file.name.toLowerCase();
      if (
        !name.endsWith(".xlsx") &&
        !name.endsWith(".xls") &&
        !name.endsWith(".csv")
      ) {
        setError("פורמט לא נתמך. השתמש ב-Excel או CSV.");
        return;
      }

      setStatus("מנתח גיליון Excel...");
      const direct = await tryParseExcelToTenants(file);
      if (direct && direct.length > 0) {
        setStatus(`נמצאו ${direct.length} דיירים`);
        onTenants(direct);
        return;
      }

      setStatus("מחלץ נתונים בעזרת AI...");
      const text = await parseExcelToText(file);
      const result = await extractTenantsFromText(text);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (!result.tenants.length) {
        setError("לא נמצאו דיירים בקובץ");
        return;
      }
      setStatus(`נמצאו ${result.tenants.length} דיירים`);
      onTenants(result.tenants);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בעיבוד הקובץ");
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 3000);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      className={`rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
        dragOver
          ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-900"
          : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <p className="text-lg font-medium">גרור קובץ Excel לכאן</p>
      <p className="mt-2 text-sm text-zinc-500">
        או לחץ לבחירת קובץ (.xlsx, .xls, .csv)
      </p>

      <Button
        type="button"
        className="mt-6"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? "מעבד..." : "בחר קובץ"}
      </Button>

      {status && <p className="mt-4 text-sm text-emerald-600">{status}</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}
