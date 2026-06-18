import Link from "next/link";

export default function NavLinkItem({
  href,
  label,
  isActive,
  className = "",
}: {
  href: string;
  label: string;
  isActive: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
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
