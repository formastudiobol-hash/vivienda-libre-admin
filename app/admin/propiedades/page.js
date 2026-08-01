"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function PropiedadesPage() {
  const [propiedades, setPropiedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [indiceFoto, setIndiceFoto] = useState({});

  function moverFoto(propiedadId, totalFotos, direccion) {
    setIndiceFoto((prev) => {
      const actual = prev[propiedadId] || 0;
      const nuevo = (actual + direccion + totalFotos) % totalFotos;
      return { ...prev, [propiedadId]: nuevo };
    });
  }

  async function cargarPropiedades() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("propiedades")
      .select(
        `
        id, codigo, titulo, tipo, operacion, precio_usd, estado, departamento,
        dormitorios, banos, superficie_m2,
        propiedad_imagenes ( url, es_portada, orden )
      `
      )
      .order("created_at", { ascending: false });

    if (!error) setPropiedades(data);
    setLoading(false);
  }

  useEffect(() => {
    cargarPropiedades();
  }, []);

  async function marcarComoVendida(id) {
    const confirmar = window.confirm(
      "¿Confirmas que esta propiedad se vendió? Dejará de mostrarse disponible en la web pública."
    );
    if (!confirmar) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("propiedades")
      .update({ estado: "Vendida" })
      .eq("id", id);

    if (error) {
      alert("Ocurrió un error al actualizar la propiedad.");
      console.error(error);
      return;
    }

    cargarPropiedades();
  }

  if (loading) {
    return <div className="p-8 text-slate-500">Cargando propiedades...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Propiedades</h1>
        <Link
          href="/admin/propiedades/nueva"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition"
        >
          + Agregar Propiedad
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {propiedades.map((p) => {
          const fotos = (p.propiedad_imagenes || [])
            .slice()
            .sort((a, b) => {
              if (a.es_portada && !b.es_portada) return -1;
              if (!a.es_portada && b.es_portada) return 1;
              return (a.orden || 0) - (b.orden || 0);
            });
          const indiceActual = indiceFoto[p.id] || 0;
          const fotoActual = fotos[indiceActual];
          const colorEstado =
            p.estado === "Disponible"
              ? "bg-green-100 text-green-700"
              : p.estado === "Reservada"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-red-100 text-red-700";

          const specs = [];
          if (p.dormitorios) specs.push(`🛏️ ${p.dormitorios}`);
          if (p.banos) specs.push(`🚿 ${p.banos}`);
          if (p.superficie_m2) specs.push(`📐 ${p.superficie_m2} m²`);

          return (
            <div
              key={p.id}
              className="bg-white rounded-2xl shadow overflow-hidden border border-slate-100"
            >
              <div className="h-40 bg-slate-200 relative">
                {fotoActual && (
                  <img
                    src={fotoActual.url}
                    alt={p.titulo}
                    className="w-full h-full object-cover"
                  />
                )}
                {fotos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => moverFoto(p.id, fotos.length, -1)}
                      className="absolute top-1/2 left-2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => moverFoto(p.id, fotos.length, 1)}
                      className="absolute top-1/2 right-2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"
                    >
                      ›
                    </button>
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                      {fotos.map((_, i) => (
                        <span
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            i === indiceActual ? "bg-white" : "bg-white/50"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-400">
                    {p.codigo}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colorEstado}`}>
                    {p.estado}
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 leading-tight">{p.titulo}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {p.departamento} · {p.tipo} · {p.operacion}
                </p>
                {specs.length > 0 && (
                  <p className="text-sm text-slate-500 mt-1">{specs.join("  ·  ")}</p>
                )}
                <p className="text-lg font-bold text-slate-800 mt-2">
                  ${Number(p.precio_usd).toLocaleString()}
                </p>

                {p.estado !== "Vendida" && (
                  <button
                    onClick={() => marcarComoVendida(p.id)}
                    className="mt-3 w-full bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold py-2 rounded-lg transition"
                  >
                    Marcar como Vendida
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {propiedades.length === 0 && (
        <p className="text-slate-400 mt-10 text-center">
          Todavía no hay propiedades cargadas.
        </p>
      )}
    </div>
  );
}
