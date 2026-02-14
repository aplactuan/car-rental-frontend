export default function TransactionsPage() {
  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="mt-2 text-sm text-zinc-500">
            View and manage rental transactions and billing
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-6 py-5">
          <div className="text-sm font-semibold text-zinc-900">
            Transaction List
          </div>
          <div className="mt-1 text-xs text-zinc-500">0 transactions</div>
        </div>
        <div className="flex items-center justify-center px-6 pb-10">
          <p className="text-sm text-zinc-500">
            Transaction history and management will go here.
          </p>
        </div>
      </div>
    </div>
  );
}
