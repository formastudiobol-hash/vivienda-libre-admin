"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagen } from "@/lib/imagenes";
import VistaPreviaPropiedad from "@/components/VistaPreviaPropiedad";

const TIPOS = ["Casa", "Departamento", "Terreno", "Oficina", "Local Comercial", "Edificio"];
const OPERACIONES = ["Venta", "Alquiler", "Anticretico"];
const DEPARTAMENTOS = [
  "Santa Cruz", "La Paz", "Cochabamba", "Sucre", "Tarija", "Oruro", "Potosí", "Beni", "Pando",
];
const TASA_CAMBIO_REFERENCIA = 11.84; // Solo una ayuda inicial; el campo en Bs. queda editable

export default function NuevaPropiedadPage() {
  const router = useRouter();
  const [agentes, setAgentes] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    codigo: "",
    titulo: "",
    descripcion: "",
    direccion: "",
    tipo: "Casa",
    operacion: "Venta",
    precio_usd: "",
    precio_bob: "",
    departamento: "Santa Cruz",
    ciudad: "",
    dormitorios: "",
    banos: "",
    superficie_m2: "",
    agente_id: "",
  });

  useEffect(() => {
    async function cargarAgentes() {
      const supabase = createClient();
      const { data } = await supabase
        .from("agentes")
        .select("id, nombre_completo")
        .eq("activo", true);
      setAgentes(data || []);
    }
    cargarAgentes();
  }, []);

  function actualizarCampo(campo, valor) {
    setForm((prev) => {
      const nuevo = { ...prev, [campo]: valor };
      if (campo === "precio_usd") {
        nuevo.precio_bob = valor ? Math.round(Number(valor) * TASA_CAMBIO_REFERENCIA) : "";
      }
      return nuevo;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.agente_id) {
      setError(
        "Debes asignar un agente. Si lo dejas vacío, nadie podrá agendar citas para esta propiedad."
      );
      return;
    }

    setGuardando(true);
    const supabase = createClient();

    // 1. Crear la propiedad
    const { data: propiedad, error: errorPropiedad } = await supabase
      .from("propiedades")
      .insert({
        codigo: form.codigo,
        titulo: form.titulo,
        descripcion: form.descripcion,
        direccion: form.direccion,
        tipo: form.tipo,
        operacion: form.operacion,
        precio_usd: Number(form.precio_usd),
        precio_bob: Number(form.precio_bob),
        departamento: form.departamento,
        ciudad: form.ciudad || form.departamento,
        dormitorios: form.dormitorios ? Number(form.dormitorios) : null,
        banos: form.banos ? Number(form.banos) : null,
        superficie_m2: form.superficie_m2 ? Number(form.superficie_m2) : null,
        agente_id: form.agente_id,
        estado: "Disponible",
      })
      .select()
      .single();

    if (errorPropiedad) {
      setError(
        "No se pudo guardar la propiedad. Verifica que el código no esté repetido."
      );
      setGuardando(false);
      console.error(errorPropiedad);
      return;
    }

    // 2. Comprimir y subir todas las fotos AL MISMO TIEMPO (mucho más rápido
    //    que subirlas una por una), y registrarlas con un solo insert
    if (fotos.length > 0) {
      const resultados = await Promise.all(
        fotos.map(async (archivoOriginal, i) => {
          let archivo;
          try {
            archivo = await comprimirImagen(archivoOriginal);
          } catch (e) {
            archivo = archivoOriginal; // si falla la compresión, sube la original igual
          }

          const nombreArchivo = `${propiedad.id}/${Date.now()}-${i}-${archivo.name}`;

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
            propiedad_id: propiedad.id,
            url: urlPublica.publicUrl,
            es_portada: i === 0,
            orden: i,
          };
        })
      );

      const filas = resultados.filter(Boolean);
      if (filas.length > 0) {
        await supabase.from("propiedad_imagenes").insert(filas);

        // Guardamos la URL de portada directo en "propiedades" para que el
        // listado público sea liviano (no tenga que cruzar con las fotos)
        const portada = filas.find((f) => f.es_portada);
        if (portada) {
          await supabase
            .from("propiedades")
            .update({ portada_url: portada.url })
            .eq("id", propiedad.id);
        }
      }
    }

    router.push("/admin/propiedades");
    router.refresh();
  }

  const previewUrls = fotos.map((f) => URL.createObjectURL(f));
  const portadaPreview = previewUrls[0] || "";

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Agregar Propiedad</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Código (único)
          </label>
          <input
            type="text"
            required
            placeholder="Ej. VL-1002"
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
            placeholder="Ej. Casa amplia con jardín, Zona Norte"
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
            placeholder="Ej. Amplia casa de dos plantas, con jardín, cochera para 2 autos..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
          <input
            type="text"
            value={form.direccion}
            onChange={(e) => actualizarCampo("direccion", e.target.value)}
            placeholder="Ej. Calle Los Sauces #123"
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
                <option key={t} value={t}>
                  {t}
                </option>
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
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Precio (USD)
            </label>
            <input
              type="number"
              required
              placeholder="85000"
              value={form.precio_usd}
              onChange={(e) => actualizarCampo("precio_usd", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Precio (Bs.) — editable
            </label>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Departamento
            </label>
            <select
              value={form.departamento}
              onChange={(e) => actualizarCampo("departamento", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            >
              {DEPARTAMENTOS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad</label>
            <input
              type="text"
              placeholder="Ej. Santa Cruz de la Sierra"
              value={form.ciudad}
              onChange={(e) => actualizarCampo("ciudad", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Dormitorios
            </label>
            <input
              type="number"
              placeholder="Ej. 3"
              value={form.dormitorios}
              onChange={(e) => actualizarCampo("dormitorios", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Baños
            </label>
            <input
              type="number"
              placeholder="Ej. 2"
              value={form.banos}
              onChange={(e) => actualizarCampo("banos", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Superficie (m²)
            </label>
            <input
              type="number"
              placeholder="Ej. 180"
              value={form.superficie_m2}
              onChange={(e) => actualizarCampo("superficie_m2", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Agente asignado
          </label>
          <select
            required
            value={form.agente_id}
            onChange={(e) => actualizarCampo("agente_id", e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          >
            <option value="">-- Selecciona un agente --</option>
            {agentes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre_completo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fotos</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFotos(Array.from(e.target.files))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
          <p className="text-xs text-slate-400 mt-1">
            La primera foto que subas será la portada.
          </p>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition"
        >
          {guardando ? "Guardando..." : "Guardar Propiedad"}
        </button>
      </form>

      <VistaPreviaPropiedad form={form} portadaUrl={portadaPreview} galeria={previewUrls} />
      </div>
    </div>
  );
}
