/** Shown while a page is fetching from the POS: dark top like the header, warm skeleton below. */
export default function Loading() {
  return (
    <div className="min-h-[100dvh] pt-[calc(5.5rem+env(safe-area-inset-top))]" aria-busy="true">
      <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
        <div className="img-skeleton h-10 w-56 rounded-xl" />
        <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
          <div className="space-y-5">
            <div className="img-skeleton h-56 rounded-3xl" />
            <div className="img-skeleton h-48 rounded-3xl" />
          </div>
          <div className="img-skeleton h-72 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
