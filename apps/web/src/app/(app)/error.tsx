"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorState onRetry={retry} />;
}
