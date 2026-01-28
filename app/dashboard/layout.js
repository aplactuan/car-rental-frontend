import Sidebar from "./components/Sidebar";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <Sidebar />
      <main className="flex-1 overflow-auto px-6 py-8">{children}</main>
    </div>
  );
}
