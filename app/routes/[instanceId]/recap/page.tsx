"use client";

import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { AppShell } from "@/components/ui";
import { RecapView } from "@/components/RecapView";

function RecapContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  return (
    <RecapView
      instanceId={params.instanceId as Id<"routeInstances">}
      isSaveFlow={searchParams.get("save") === "1"}
      onClose={() => router.push("/me")}
    />
  );
}

export default function RecapPage() {
  return (
    <AppShell>
      <Suspense fallback={<p className="text-[var(--muted)]">Laster recap…</p>}>
        <RecapContent />
      </Suspense>
    </AppShell>
  );
}
