"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ChevronDown, Loader2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useIsPlatformAdmin } from "@/hooks/useEffectiveRole";

type OrganizationLike = {
  id: string;
  organization_name?: string;
  name?: string;
  contact_email?: string;
};

function organizationLabel(organization: OrganizationLike): string {
  return (
    organization.organization_name
    || organization.name
    || organization.contact_email
    || "לקוח"
  );
}

export default function WorkspaceContextBar() {
  const {
    organizations,
    currentOrgId,
    profile,
    loading,
    switchOrganization,
  } = useAuth();
  const isPlatformAdminUser = useIsPlatformAdmin();
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeOrgId = currentOrgId ?? profile?.organization_id ?? null;

  const currentOrganization = useMemo(
    () =>
      organizations.find((organization) => organization.id === activeOrgId)
      ?? organizations[0]
      ?? null,
    [activeOrgId, organizations]
  );

  const canSwitch =
    isPlatformAdminUser
    && organizations.length > 1
    && !loading;

  const label = currentOrganization
    ? organizationLabel(currentOrganization)
    : null;

  const switching = switchingOrgId !== null;

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        rootRef.current
        && !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  async function handleSwitch(organizationId: string) {
    if (
      !organizationId
      || organizationId === activeOrgId
      || switchingOrgId
    ) {
      return;
    }

    setSwitchingOrgId(organizationId);
    setOpen(false);

    try {
      await switchOrganization(organizationId);
    } finally {
      setSwitchingOrgId(null);
    }
  }

  if (loading) {
    return (
      <div
        className="min-w-0 flex-1"
        aria-hidden
      >
        <div className="h-7 w-40 max-w-[50vw] animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
    );
  }

  if (!label) {
    return <div className="min-w-0 flex-1" aria-hidden />;
  }

  const nameClassName = `
    truncate
    text-xl
    font-semibold
    text-zinc-800
    dark:text-zinc-100
  `;

  return (
    <div
      ref={rootRef}
      className="relative min-w-0 flex-1"
    >
      {canSwitch ? (
        <button
          type="button"
          disabled={switching}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((current) => !current)}
          className="
            of-focus-ring
            flex
            max-w-full
            min-w-0
            items-center
            gap-1.5
            rounded-lg
            text-start
            disabled:opacity-60
          "
        >
          {switching ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-zinc-400" />
          ) : null}
          <span className={nameClassName} title={label}>
            {label}
          </span>
          <ChevronDown
            className={`
              h-4
              w-4
              shrink-0
              text-zinc-400
              transition
              ${open ? "rotate-180" : ""}
            `}
          />
        </button>
      ) : (
        <p className={`${nameClassName} max-w-full`} title={label}>
          {label}
        </p>
      )}

      {canSwitch && open ? (
        <ul
          role="listbox"
          className="
            absolute
            start-0
            top-full
            z-50
            mt-2
            max-h-64
            min-w-[12rem]
            overflow-auto
            rounded-2xl
            border
            border-zinc-200
            bg-white
            py-2
            shadow-lg
            dark:border-zinc-700
            dark:bg-zinc-900
          "
        >
          {organizations.map((organization) => {
            const organizationLabelText = organizationLabel(organization);
            const selected = organization.id === activeOrgId;

            return (
              <li key={organization.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => void handleSwitch(organization.id)}
                  className={`
                    block
                    w-full
                    truncate
                    px-4
                    py-2.5
                    text-start
                    text-sm
                    transition
                    hover:bg-zinc-50
                    dark:hover:bg-zinc-800
                    ${selected
                      ? "font-semibold text-[var(--of-color-accent)]"
                      : "text-zinc-700 dark:text-zinc-200"
                    }
                  `}
                >
                  {organizationLabelText}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
