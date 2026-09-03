import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import type { DomainInfo } from "./types";

const DomainsContext = createContext<DomainInfo[]>([]);

// Fetches the domain blueprint table once from the server (single source of
// truth lives in server/domainWeights.ts) and shares it via context so no
// page needs to duplicate the weight table.
export function DomainsProvider({ children }: { children: ReactNode }) {
  const [domains, setDomains] = useState<DomainInfo[]>([]);

  useEffect(() => {
    api.getDomains().then(setDomains).catch(() => setDomains([]));
  }, []);

  return <DomainsContext.Provider value={domains}>{children}</DomainsContext.Provider>;
}

export function useDomains() {
  return useContext(DomainsContext);
}

export function useDomainName(domainId: number): string {
  const domains = useDomains();
  return domains.find((d) => d.id === domainId)?.name ?? `Domain ${domainId}`;
}
