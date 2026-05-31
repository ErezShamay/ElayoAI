"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { toast } from "sonner";

import AdminGuard from "@/components/admin/AdminGuard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api/client";

type ManagedUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  account_status?: "pending" | "active";
  created_at?: string | null;
};

const ROLE_OPTIONS = [
  { value: "VIEWER", label: "צופה" },
  { value: "ANALYST", label: "אנליסט" },
  { value: "MANAGER", label: "מנהל" },
  { value: "ADMIN", label: "מנהל מערכת" },
] as const;

export default function AdminUsersPage() {
  return (
    <AdminGuard>
      <AdminUsersContent />
    </AdminGuard>
  );
}

function AdminUsersContent() {
  const { profile } = useAuth();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<string>("VIEWER");

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch("/admin/users");

      if (!response.ok) {
        throw new Error("טעינת המשתמשים נכשלה");
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "טעינת המשתמשים נכשלה"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      const response = await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email,
          full_name: fullName,
          role,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error?.message
          || data?.detail
          || "שליחת ההזמנה נכשלה"
        );
      }

      if (data.email_status === "SENT") {
        toast.success("ההזמנה נשלחה בהצלחה");
      } else {
        toast.warning(
          "המשתמש נוצר, אך שליחת המייל נכשלה. בדקו את הגדרות המייל."
        );
      }

      setEmail("");
      setFullName("");
      setRole("VIEWER");
      await loadUsers();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "שליחת ההזמנה נכשלה";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendInvite(user: ManagedUser) {
    if (user.account_status === "active") {
      toast.error("המשתמש כבר הפעיל את החשבון. השתמשו באיפוס סיסמה.");
      return;
    }

    try {
      setResendingUserId(user.id);
      setError("");

      const response = await apiFetch(
        `/admin/users/${user.id}/resend-invite`,
        { method: "POST" }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error?.message
          || data?.detail
          || "שליחת ההזמנה מחדש נכשלה"
        );
      }

      if (data.email_status === "SENT") {
        toast.success("ההזמנה נשלחה מחדש");
      } else {
        toast.warning("יצירת הקישור הצליחה, אך שליחת המייל נכשלה");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "שליחת ההזמנה מחדש נכשלה";
      setError(message);
      toast.error(message);
    } finally {
      setResendingUserId(null);
    }
  }

  async function handlePasswordReset(user: ManagedUser) {
    const confirmed = window.confirm(
      `לשלוח למשתמש ${user.full_name || user.email} מייל לאיפוס סיסמה?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setResettingUserId(user.id);
      setError("");

      const response = await apiFetch(
        `/admin/users/${user.id}/password-reset`,
        { method: "POST" }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error?.message
          || data?.detail
          || "שליחת איפוס הסיסמה נכשלה"
        );
      }

      if (data.email_status === "SENT") {
        toast.success("מייל איפוס סיסמה נשלח");
      } else {
        toast.warning("יצירת הקישור הצליחה, אך שליחת המייל נכשלה");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "שליחת איפוס הסיסמה נכשלה";
      setError(message);
      toast.error(message);
    } finally {
      setResettingUserId(null);
    }
  }

  async function handleDelete(user: ManagedUser) {
    if (user.id === profile?.id) {
      toast.error("לא ניתן למחוק את המשתמש שלך");
      return;
    }

    const confirmed = window.confirm(
      `למחוק את ${user.full_name || user.email}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingUserId(user.id);
      setError("");

      const response = await apiFetch(
        `/admin/users/${user.id}`,
        { method: "DELETE" }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error?.message
          || data?.detail
          || "מחיקת המשתמש נכשלה"
        );
      }

      toast.success("המשתמש נמחק");
      setUsers((current) =>
        current.filter((item) => item.id !== user.id)
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "מחיקת המשתמש נכשלה";
      setError(message);
      toast.error(message);
    } finally {
      setDeletingUserId(null);
    }
  }

  return (
    <div className="of-dashboard-page of-container mx-auto max-w-5xl space-y-10">
      <header>
        <h1 className="of-page-title text-2xl md:text-3xl">
          ניהול משתמשים
        </h1>
        <p className="of-page-desc max-w-2xl text-sm">
          הוסיפו משתמשים חדשים לארגון, שלחו להם הזמנה במייל להגדרת סיסמה,
          שלחו הזמנה מחדש למשתמשים שלא השלימו הרשמה, ואפסו סיסמאות למשתמשים
          קיימים.
        </p>
      </header>

      <section className="of-card of-card-p6">
        <h2 className="mb-4 text-xl font-semibold">
          הזמנת משתמש חדש
        </h2>

        <form
          onSubmit={handleInvite}
          className="grid gap-4 md:grid-cols-2"
        >
          <div>
            <label className="mb-2 block text-sm font-medium">
              שם מלא
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="of-input of-focus-ring w-full text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              אימייל
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="of-input of-focus-ring w-full text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              תפקיד
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="of-input of-focus-ring w-full text-sm"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              type="submit"
              variant="accent"
              disabled={submitting}
              className="w-full md:w-auto"
            >
              {submitting ? "שולח הזמנה..." : "שליחת הזמנה"}
            </Button>
          </div>
        </form>
      </section>

      <section className="of-card of-card-p6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">
            משתמשים בארגון
          </h2>
          <span className="text-sm text-zinc-500">
            {users.length} משתמשים
          </span>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-zinc-500">טוען משתמשים...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-zinc-500">
            עדיין לא הוזמנו משתמשים לארגון.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-right dark:border-zinc-700">
                  <th className="px-3 py-3 font-semibold">שם</th>
                  <th className="px-3 py-3 font-semibold">אימייל</th>
                  <th className="px-3 py-3 font-semibold">תפקיד</th>
                  <th className="px-3 py-3 font-semibold">סטטוס</th>
                  <th className="px-3 py-3 font-semibold">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="px-3 py-3">
                      {user.full_name || "—"}
                    </td>
                    <td className="px-3 py-3">{user.email}</td>
                    <td className="px-3 py-3">
                      <Badge>{user.role}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge>
                        {user.account_status === "active"
                          ? "פעיל"
                          : "ממתין להגדרה"}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={
                            resendingUserId === user.id
                            || user.account_status === "active"
                          }
                          onClick={() => void handleResendInvite(user)}
                        >
                          {resendingUserId === user.id
                            ? "שולח..."
                            : "שליחת הזמנה מחדש"}
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={resettingUserId === user.id}
                          onClick={() => void handlePasswordReset(user)}
                        >
                          {resettingUserId === user.id
                            ? "שולח..."
                            : "איפוס סיסמה"}
                        </Button>

                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={
                            deletingUserId === user.id
                            || user.id === profile?.id
                          }
                          onClick={() => void handleDelete(user)}
                        >
                          {user.id === profile?.id
                            ? "המשתמש שלך"
                            : deletingUserId === user.id
                              ? "מוחק..."
                              : "מחיקה"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
