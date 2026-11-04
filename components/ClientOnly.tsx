"use client";

import { useEffect, useState, ReactNode } from "react";

export interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * ClientOnly wrapper component that renders children only after client-side mounting (useEffect).
 * Eliminates SSR hydration mismatch errors for client-only state such as localStorage, audio instances, and date-time.
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default ClientOnly;
