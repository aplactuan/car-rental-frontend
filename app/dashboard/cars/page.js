export default function CarsPage() {
  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cars</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Manage your fleet vehicles, availability, and details
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
          Add Car
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-6 py-5">
          <div className="text-sm font-semibold text-zinc-900">Car List</div>
          <div className="mt-1 text-xs text-zinc-500">0 cars registered</div>
        </div>
        <div className="flex items-center justify-center px-6 pb-10">
          <p className="text-sm text-zinc-500">
            Car management content will go here.
          </p>
        </div>
      </div>
    </div>
  );
}
