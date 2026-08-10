import Sidebar from "./components/Sidebar";

export default function DashboardLayout({ children }) {
  return (
    <div className="relative flex min-h-screen bg-zinc-50 text-zinc-900">
      <Sidebar />
      <main className="relative z-10 min-w-0 flex-1 overflow-x-hidden px-4 pb-6 pt-20 sm:px-6 sm:pb-8 lg:px-8 lg:py-8">
        <div className="mx-auto w-full min-w-0 max-w-[1600px] [&>div]:!pr-0">{children}</div>
      </main>
    </div>
  );
}
