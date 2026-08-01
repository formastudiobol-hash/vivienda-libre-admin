import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-800">Bienvenido, {user.email}</h1>
      <p className="text-slate-500 mt-2 max-w-lg">
        Desde aquí vas a poder gestionar las propiedades, sus fotos, y (pronto)
        el calendario de feriados.
      </p>
      <a
        href="/admin/propiedades"
        className="inline-block mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-lg transition"
      >
        Ir a Propiedades →
      </a>
    </div>
  );
}
