"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagen } from "@/lib/imagenes";

const TIPOS = ["Casa", "Departamento", "Terreno", "Oficina", "Local Comercial", "Edificio"];
const OPERACIONES = ["Venta", "Alquiler", "Anticretico"];
const DEPARTAMENTOS = [
  "Santa Cruz", "La Paz", "Cochabamba", "Sucre", "Tarija", "Oruro", "Potosí", "Beni", "Pando",
];

export default function EditarPropiedadPage({ params }) {
  const { id } = params;
  const router = useRouter();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errorCarga, setErrorCarga] = useState("");
  const [fotos, setFotos] = useState([]);
  const [nuevasFotos, setNuevasFotos] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [form, setForm] = useState(null);

  useEffect(() => {
    async function cargar() {
      const supabase = createClient();

      const [{ data: propiedad, error: errorProp }, { data: listaAgentes }] = await Promise.all([
        supabase
          .from("propiedades")
          .select("*, propiedad_imagenes(id, url, es_portada, orden)")
          .eq("id", id)
          .single(),
        supabase.from("agentes").select("id, nombre_completo").eq("activo", true),
      ]);

      if (errorProp || !propiedad) {
        setErrorCarga("No se pudo cargar esta propiedad.");
        setCargando(false);
        return;
      }

      setAgentes(listaAgentes || []);
      setForm({
        codigo: propiedad.codigo,
        titulo: propiedad.titulo,
        descripcion: propiedad.descripcion || "",
        direccion: propiedad.direccion || "",
        tipo: propiedad.tipo,
        operacion: propiedad.operacion,
        precio_usd: propiedad.precio_usd,
        precio_bob: propiedad.precio_bob,
        departamento: propiedad.departamento,
        ciudad: propiedad.ciudad,
        dormitorios: propiedad.dormitorios || "",
        banos: propiedad.banos || "",
        superficie_m2: propiedad.superficie_m2 || "",
        agente_id: propiedad.agente_id || "",
      });
      setFotos(
        (propiedad.propiedad_imagenes || []).slice().sort((a, b) => {
          if (a.es_portada && !b.es_portada) return -1;
          if (!a.es_portada && b.es_portada) return 1;
          return (a.orden || 0) - (b.orden || 0);
        })
      );
      setCargando(false);
    }
    cargar();
  }, [id]);

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function marcarComoPortada(fotoId) {
    const supabase = createClient();
    await supabase.from("propiedad_imagenes").update({ es_portada: false }).eq("propiedad_id", id);
    await supabase.from("propiedad_imagenes").update({ es_portada: true }).eq("id", fotoId);
    setFotos((prev) => prev.map((f) => ({ ...f, es_portada: f.id === fotoId })));
  }

  async function borrarFoto(fotoId) {
    if (!window.confirm("¿Borrar esta foto?")) return;
    const supabase = createClient();
    await supabase.from("propiedad_imagenes").delete().eq("id", fotoId);
    setFotos((prev) => prev.filter((f) => f.id !== fotoId));
  }

  async function handleGuardar(e) {
    e.preventDefault();
    setError("");

    if (!form.agente_id) {
      setError("Debes asignar un agente.");
      return;
    }

    setGuardando(true);
    const supabase = createClient();

    const { error: errorUpdate } = await supabase
      .from("propiedades")
      .update({
        codigo: form.codigo,
        titulo: form.titulo,
        descripcion: form.descripcion,
        direccion: form.direccion,
        tipo: form.tipo,
        operacion: form.operacion,
        precio_usd: Number(form.precio_usd),
        precio_bob: Number(form.precio_bob),
        departamento: form.departamento,
        ciudad: form.ciudad,
        dormitorios: form.dormitorios ? Number(form.dormitorios) : null,
        banos: form.banos ? Number(form.banos) : null,
        superficie_m2: form.superficie_m2 ? Number(form.superficie_m2) : null,
        agente_id: form.agente_id,
      })
      .eq("id", id);

    if (errorUpdate) {
      setError("No se pudo guardar. Verifica que el código no esté repetido.");
      setGuardando(false);
      console.error(errorUpdate);
      return;
    }

    if (nuevasFotos.length > 0) {
      const inicioOrden = fotos.length;
      const resultados = await Promise.all(
        nuevasFotos.map(async (archivoOriginal, i) => {
          let archivo;
          try {
            archivo = await comprimirImagen(archivoOriginal);
          } catch {
            archivo = archivoOriginal;
          }
          const nombreArchivo = `${id}/${Date.now()}-${i}-${archivo.name}`;
          const { error: errorSubida } = await supabase.storage
            .from("imagenes-propiedades")
            .upload(nombreArchivo, archivo);
          if (errorSubida) {
            console.error("Error al subir foto:", errorSubida);
            return null;
          }
          const { data: urlPublica } = supabase.storage
            .from("imagenes-propiedades")
            .getPublicUrl(nombreArchivo);
          return {
            propiedad_id: id,
            url: urlPublica.publicUrl,
            es_portada: fotos.length === 0 && i === 0,
            orden: inicioOrden + i,
          };
        })
      );
      const filas = resultados.filter(Boolean);
      if (filas.length > 0) {
        await supabase.from("propiedad_imagenes").insert(filas);
      }
    }

    router.push("/admin/propiedades");
    router.refresh();
  }

  async function handleEliminar() {
    if (
      !window.confirm(
        "¿Eliminar esta propiedad por completo? Sus fotos y esta información no se podrán recuperar."
      )
    )
      return;

    const supabase = createClient();
    const { error: errorDelete } = await supabase.from("propiedades").delete().eq("id", id);

    if (errorDelete) {
      alert("No se pudo eliminar la propiedad.");
      console.error(errorDelete);
      return;
    }

    router.push("/admin/propiedades");
    router.refresh();
  }

  if (cargando) return <div className="p-8 text-slate-500">Cargando...</div>;
  if (errorCarga) return <div className="p-8 text-red-600">{errorCarga}</div>;

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        Editar Propiedad <span className="text-slate-400 font-normal">— {form.codigo}</span>
      </h1>

      {/* Galería: portada + complementarias */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <h2 className="font-semibold text-slate-700 mb-1">Fotos</h2>
        <p className="text-xs text-slate-400 mb-3">
          La foto marcada "PORTADA" es la que se ve primero en la web. Las demás son
          complementarias (dormitorio, baño, etc.) y se ven al entrar al detalle.
        </p>

        {fotos.length === 0 && (
          <p className="text-slate-400 text-sm mb-3">Todavía no hay fotos.</p>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
          {fotos.map((f) => (
            <div key={f.id} className="relative rounded-lg overflow-hidden border border-slate-200">
              <img src={f.url} alt="" className="w-full h-24 object-cover" />
              {f.es_portada && (
                <span className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  PORTADA
                </span>
              )}
              <div className="absolute bottom-1 inset-x-1 flex gap-1">
                {!f.es_portada && (
                  <button
                    type="button"
                    onClick={() => marcarComoPortada(f.id)}
                    className="flex-1 bg-white/90 hover:bg-white text-[10px] font-semibold px-1 py-0.5 rounded"
                  >
                    Hacer portada
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => borrarFoto(f.id)}
                  className="bg-red-600/90 hover:bg-red-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded"
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </div>

        <label className="block text-sm font-medium text-slate-700 mb-1">
          Agregar más fotos complementarias
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setNuevasFotos(Array.from(e.target.files))}
          className="w-full border border-slate-300 rounded-lg px-3 py-2"
        />
      </div>

      {/* Datos de la propiedad */}
      <form onSubmit={handleGuardar} className="bg-white rounded-2xl shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Código (único)</label>
          <input
            type="text"
            required
            value={form.codigo}
            onChange={(e) => actualizarCampo("codigo", e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
          <input
            type="text"
            required
            value={form.titulo}
            onChange={(e) => actualizarCampo("titulo", e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Descripción (se muestra al abrir el detalle de la propiedad)
          </label>
          <textarea
            rows={4}
            value={form.descripcion}
            onChange={(e) => actualizarCampo("descripcion", e.target.value)}
            placeholder="Ej. Amplia casa de dos plantas, con jardín, cochera para 2 autos y a 5 minutos del colegio..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
          <input
            type="text"
            value={form.direccion}
            onChange={(e) => actualizarCampo("direccion", e.target.value)}
            placeholder="Ej. Calle Los Sauces #123, entre 3er y 4to anillo"
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
            <select
              value={form.tipo}
              onChange={(e) => actualizarCampo("tipo", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Operación</label>
            <select
              value={form.operacion}
              onChange={(e) => actualizarCampo("operacion", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            >
              {OPERACIONES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Precio (USD)</label>
            <input
              type="number"
              required
              value={form.precio_usd}
              onChange={(e) => actualizarCampo("precio_usd", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Precio (Bs.)</label>
            <input
              type="number"
              value={form.precio_bob}
              onChange={(e) => actualizarCampo("precio_bob", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Departamento</label>
            <select
              value={form.departamento}
              onChange={(e) => actualizarCampo("departamento", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            >
              {DEPARTAMENTOS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad</label>
            <input
              type="text"
              value={form.ciudad}
              onChange={(e) => actualizarCampo("ciudad", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dormitorios</label>
            <input
              type="number"
              value={form.dormitorios}
              onChange={(e) => actualizarCampo("dormitorios", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Baños</label>
            <input
              type="number"
              value={form.banos}
              onChange={(e) => actualizarCampo("banos", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Superficie (m²)</label>
            <input
              type="number"
              value={form.superficie_m2}
              onChange={(e) => actualizarCampo("superficie_m2", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Agente asignado</label>
          <select
            required
            value={form.agente_id}
            onChange={(e) => actualizarCampo("agente_id", e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          >
            <option value="">-- Selecciona un agente --</option>
            {agentes.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre_completo}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition"
          >
            {guardando ? "Guardando..." : "Guardar Cambios"}
          </button>
          <button
            type="button"
            onClick={handleEliminar}
            className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold px-5 rounded-lg transition"
          >
            Eliminar
          </button>
        </div>
      </form>
    </div>
  );
}
