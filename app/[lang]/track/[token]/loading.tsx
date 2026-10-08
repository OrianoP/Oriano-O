/** Tracking page placeholder: same layout as the tracker, full height so the footer stays out of view. */
export default function Loading() {
  return (
    <div className="paper-grain min-h-[100dvh] pt-[calc(5.5rem+env(safe-area-inset-top))]" aria-busy="true">
      <div className="mx-auto max-w-3xl space-y-5 px-4 sm:px-6">
        <div className="img-skeleton h-4 w-40 rounded" />
        <div className="img-skeleton h-24 w-4/5 rounded-2xl" />
        <div className="img-skeleton h-28 rounded-3xl" />
        <div className="img-skeleton h-32 rounded-3xl" />
        <div className="img-skeleton h-40 rounded-3xl" />
      </div>
    </div>
  );
}
