export default function TransactionsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        View and manage rental transactions and billing.
      </p>
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Transaction history and management will go here.
        </p>
      </div>
    </div>
  );
}
