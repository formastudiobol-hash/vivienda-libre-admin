import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminLayout({ children }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-slate-800">Vivienda Libre — Panel</span>
          <Link href="/admin" className="text-slate-600 hover:text-blue-600">
            Inicio
          </Link>
          <Link href="/admin/propiedades" className="text-slate-600 hover:text-blue-600">
            Propiedades
          </Link>
        </div>
        <LogoutButton />
      </nav>
      <main>{children}</main>
    </div>
  );
}
