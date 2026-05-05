import Link from "next/link";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";

export default function QuoteNotFound() {
  return (
    <div className="py-16">
      <EmptyState
        title="Quote not found"
        description="That quote ID doesn't exist or has been removed."
        action={
          <Link href="/quotes">
            <Button>Back to all quotes</Button>
          </Link>
        }
      />
    </div>
  );
}
