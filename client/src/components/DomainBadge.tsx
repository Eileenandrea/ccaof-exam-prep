import { useDomainName } from "../lib/DomainsContext";

export default function DomainBadge({ domain }: { domain: number }) {
  const name = useDomainName(domain);
  return (
    <span className="inline-block rounded-full bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1">
      {name}
    </span>
  );
}
