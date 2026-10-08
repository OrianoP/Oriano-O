import { CheckoutSkeleton } from "@/components/CheckoutForm";

export default function Loading() {
  return (
    <div className="paper-grain pt-[calc(5.5rem+env(safe-area-inset-top))]">
      <CheckoutSkeleton />
    </div>
  );
}
