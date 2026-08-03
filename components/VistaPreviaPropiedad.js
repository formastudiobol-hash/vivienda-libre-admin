export default function VistaPreviaPropiedad({ form, portadaUrl, galeria }) {
  const specs = [
    form.dormitorios && `🛏️ ${form.dormitorios}`,
    form.banos && `🚿 ${form.banos}`,
    form.superficie_m2 && `📐 ${form.superficie_m2} m²`,
  ].filter(Boolean);

  return (
    <div className="sticky top-6 space-y-8">
      <div>
        <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
          Así se ve en el listado
        </p>
        <div className="bg-white rounded-2xl shadow border border-slate-100 overflow-hidden">
          <div className="h-36 bg-slate-200">
            {portadaUrl ? (
              <img src={portadaUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                Sin foto de portada
              </div>
            )}
          </div>
          <div className="p-4">
            <div className="text-xs font-bold text-blue-600 uppercase">
              {form.operacion || "Venta"}
            </div>
            <h3 className="font-bold text-slate-800 leading-tight mt-1">
              {form.titulo || "Título de la propiedad"}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              📍 {form.ciudad || "Ciudad"}, {form.departamento || "Departamento"}
            </p>
            <p className="text-lg font-bold text-slate-800 mt-2">
              ${form.precio_usd ? Number(form.precio_usd).toLocaleString() : "0"}
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
          Así se ve al hacer clic (detalle)
        </p>
        <div className="bg-white rounded-2xl shadow border border-slate-100 overflow-hidden">
          <div className="h-44 bg-slate-200">
            {portadaUrl ? (
              <img src={portadaUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                Sin foto de portada
              </div>
            )}
          </div>
          {galeria.length > 0 && (
            <div className="flex gap-1 p-2 overflow-x-auto">
              {galeria.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-12 h-12 object-cover rounded flex-shrink-0"
                />
              ))}
            </div>
          )}
          <div className="p-4">
            <h3 className="font-bold text-slate-800">
              {form.titulo || "Título de la propiedad"}
            </h3>
            {specs.length > 0 && (
              <p className="text-sm text-slate-500 mt-1">{specs.join("  ·  ")}</p>
            )}
            <p className="text-lg font-bold text-slate-800 mt-2">
              ${form.precio_usd ? Number(form.precio_usd).toLocaleString() : "0"}
            </p>
            <p className="text-sm text-slate-600 mt-3 whitespace-pre-line">
              {form.descripcion || "Aquí va a aparecer la descripción que escribas abajo..."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
