import Link from "next/link";

export default function NavLinkItem({
  href,
  label,
  isActive,
  className = "",
  onNavigate,
}: {
  href: string;
  label: string;
  isActive: boolean;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={
        isActive
          ? `of-nav-link of-nav-link-active ${className}`.trim()
          : `of-nav-link ${className}`.trim()
      }
    >
      {label}
    </Link>
  );
}
