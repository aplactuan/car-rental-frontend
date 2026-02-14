import Sidebar from "./components/Sidebar";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#F4F6F8] text-zinc-900">
      <Sidebar />
      <main className="flex-1 overflow-auto px-8 py-8">{children}</main>
    </div>
  );
}
