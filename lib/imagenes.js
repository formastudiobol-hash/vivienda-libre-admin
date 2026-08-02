// Reduce el peso de cada foto en el navegador ANTES de subirla,
// sin que se note diferencia visual en la web (mismo aspecto, mucho más liviana)
export function comprimirImagen(archivo, maxAncho = 1600, calidad = 0.8) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();

    lector.onload = (evento) => {
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;
        if (width > maxAncho) {
          height = Math.round((height * maxAncho) / width);
          width = maxAncho;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("No se pudo comprimir la imagen"));
              return;
            }
            resolve(
              new File([blob], archivo.name.replace(/\.\w+$/, ".jpg"), {
                type: "image/jpeg",
              })
            );
          },
          "image/jpeg",
          calidad
        );
      };

      img.onerror = reject;
      img.src = evento.target.result;
    };

    lector.onerror = reject;
    lector.readAsDataURL(archivo);
  });
}
