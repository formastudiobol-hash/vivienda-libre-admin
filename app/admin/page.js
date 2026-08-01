import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-3xl font-bold text-slate-800">
        Bienvenido, {user.email}
      </h1>
      <p className="text-slate-500 mt-2 max-w-lg">
        El panel está en construcción. En los próximos pasos vamos a agregar
        aquí la gestión de propiedades (con fotos), el botón de "Marcar como
        Vendida" y el calendario de feriados.
      </p>
    </div>
  );
}
