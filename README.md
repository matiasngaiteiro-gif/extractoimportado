# Extracto Importado · Manual de marca interactivo

Es una landing de una sola página que presenta la identidad, la voz y la forma de trabajo de **Extracto Importado**. Es un sitio estático (HTML, CSS y JavaScript) listo para GitHub Pages: no necesita backend ni claves de API.

Usa el mismo motor que el manual de Crisger (contenido en `data.json`, editor local, modo presentación, generador de piezas, firma de correo y kit de descargas). A eso le suma las herramientas de la primera versión del manual de Extracto:

- Catálogo con vista para anuncios pagos.
- Así sí / así no.
- Pilares de contenido.
- Textos listos para copiar.
- Canales copiables.
- Generador de brief.
- Checklist de lanzamiento.
- Buscador.

## Estructura

```
index.html      Estructura base, buscador, visor de imágenes y editor
fonts/          Gotham (licencia comercial, ver más abajo)
style.css       Diseño, colores de marca y responsive
app.js          Render desde data.json, interacciones, herramientas y editor
data.json       Todo el contenido editable del manual
media/          Logos en SVG (5 versiones en color, blanco y monocromo), maquetas, imagen para compartir
  descargas/    PNG en alta resolución, ZIP de logos, hoja membretada (Word y PDF) y manual en PDF
README.md
```

## Secciones

1. **Portada**: título, texto introductorio y enlace para explorar.
2. **Esencia**: qué es Extracto, conceptos (Precisión, Concentración y Cercanía), cifras que nos respaldan, públicos y objetivos del área.
3. **Logo**: selector de versiones (principal, vertical, compacta, logotipo e isotipo) sobre fondo claro, oscuro u oro, con escala. Incluye el espacio de protección y nueve usos incorrectos.
4. **Color**: paleta con HEX, RGB y CMYK copiables, proporción de uso, explorador de tonos y matices, y comparador de contraste.
5. **Tipografía**: lettering del logo, pesos de Gotham, Gotham en textos y jerarquía de cinco niveles.
6. **Voz y contenido**: principios, así sí / así no, vocabulario de la casa, pilares de contenido y textos listos para copiar.
7. **Producto**: best sellers con el interruptor **Vista para anuncios pagos** (oculta la equivalencia), nomenclatura y presentaciones, canales copiables, envíos, pagos y Vende Extracto.
8. **Aplicaciones**: dos tramas con el isotipo y galería de diez maquetas conceptuales con filtro por categoría y visor ampliado.
9. **Equipo**: roles, pasos para pedir una pieza, plazos, reuniones fijas, **generador de brief** (chequea la fecha contra los plazos) y **checklist de lanzamiento** de T-30 a T+30.
10. **Kit de marca**: logos en SVG y PNG, ZIP completo, paleta en CSS o texto para imprenta, pesos de Gotham, generador de piezas (publicación 1080 × 1350, cuadrado, historia y banner web 1440 × 360), firma de correo, hoja membretada y manual en PDF.

El botón **Buscar** de la cabecera (o la tecla `/`) busca en todo el manual.

## Logo

El logo principal sale del archivo oficial que nos pasaron: se vectorizó en SVG en color, en blanco y en versión monocromática. El original en PNG está en `media/descargas/png/logo-extracto-original.png`.

El **isotipo** (la E del logo dentro de una etiqueta, con un filete dorado) y las versiones **vertical** y **compacta** son una propuesta construida con la E del logo. Validalas con la diseñadora antes de producir. Para reemplazar cualquier versión, cambiá el archivo en `media/` (mismo nombre) o usá la pestaña **Logos** del editor.

## Tipografía: Gotham

El sitio usa **Gotham** (Thin a Ultra) desde la carpeta `fonts/`: Light para titulares, Book para textos y Medium para etiquetas. Si falta, usa Montserrat o Helvetica como reemplazo.

**Importante sobre la licencia:** Gotham es una tipografía comercial (Hoefler&Co). Si el repositorio es **público**, los archivos de `fonts/` quedan descargables por cualquiera, y eso requiere una licencia web de Gotham. Si la empresa no la tiene, conviene alguna de estas opciones:

- Publicar desde un repositorio **privado**. GitHub Pages desde repositorios privados requiere un plan pago.
- Borrar la carpeta `fonts/` antes de subir el sitio. En ese caso se verá con Montserrat o Helvetica.
- Comprar la licencia web.

El kit de descargas **no** ofrece los archivos de Gotham: indica que se piden al equipo de diseño.

## Publicar en GitHub Pages

1. Creá un repositorio en GitHub (por ejemplo, `extracto-manual`).
2. Descomprimí el ZIP y subí **el contenido** de la carpeta a la raíz del repositorio. `index.html` tiene que quedar en la raíz, no dentro de otra carpeta.
   - **En la web de GitHub:** usá **Add file → Upload files**, arrastrá `index.html`, `style.css`, `app.js`, `data.json`, `README.md` y las carpetas `media` y `fonts`, y confirmá con **Commit changes**.
   - **Por terminal:**
     ```bash
     git init
     git add .
     git commit -m "Manual de marca Extracto Importado"
     git branch -M main
     git remote add origin https://github.com/USUARIO/extracto-manual.git
     git push -u origin main
     ```
3. En el repositorio, abrí **Settings → Pages**.
4. En **Build and deployment → Source**, elegí **Deploy from a branch**.
5. En **Branch**, seleccioná `main` y la carpeta `/ (root)`, y guardá con **Save**.
6. Esperá uno o dos minutos. La dirección aparece arriba en esa misma pantalla (`https://USUARIO.github.io/extracto-manual/`).

Todas las rutas son relativas, así que el sitio funciona tanto en GitHub Pages como en un dominio propio.

### Revisión local

Los navegadores bloquean la lectura de `data.json` cuando se abre `index.html` con doble clic. Para probarlo en tu computadora, ejecutá esto dentro de la carpeta:

```bash
python -m http.server 8000
```

Después abrí `http://localhost:8000`.

## Editar el contenido

El botón **Editar contenido** está oculto para los visitantes. Para verlo, abrí el sitio con `?editar` al final de la dirección, por ejemplo `https://USUARIO.github.io/extracto-manual/?editar`. El botón aparece en el pie y queda recordado en ese navegador. Para ocultarlo, abrí la dirección con `?editar=0`.

El editor tiene cinco pestañas:

- **Portada:** textos generales y del kit.
- **Secciones.**
- **Bloques.**
- **Colores:** el primer color define el acento de toda la interfaz.
- **Logos.**

En **Bloques**, el campo **Lista** controla el contenido de las herramientas:

| Bloque | Formato de cada línea |
| --- | --- |
| Cifras destacadas | `Valor — Etiqueta — Detalle` |
| Tarjetas | `Título — Texto` |
| Tabla | Columnas separadas con `|`. La primera línea es el encabezado. |
| Catálogo con vista de pauta | Como la tabla. La 3.ª columna (equivalencia) se oculta en la vista para anuncios pagos. |
| Así sí / así no | `Así sí || Así no` |
| Vocabulario | Una palabra o expresión por línea |
| Pilares de contenido | `Nombre | Porcentaje | Descripción` |
| Canales copiables | `Canal | Dato para copiar | Nota` |
| Pasos de un proceso | `Título — Texto` |
| Textos para copiar | `Título — Texto` |
| Checklist de lanzamiento | `T-30 | un mes antes | tarea; tarea; tarea` |
| Usos incorrectos | Un ejemplo por línea. Reconoce: color, contorno, forma, volumen, sombra, reflejar, comprimir, expandir y rotar. |
| Jerarquía tipográfica | `Referencia — Texto de ejemplo` |

El generador de brief toma los pilares del bloque **Pilares de contenido**.

### Cómo se guardan los cambios

- Los cambios del editor se guardan solo en **ese navegador**. El sitio publicado no cambia.
- **Exportar data.json** descarga el contenido actual.
- **Importar JSON** carga un archivo guardado antes.
- **Restaurar versión publicada** borra los cambios locales.
- Las tildes del checklist y la firma de correo también quedan guardadas en el navegador de cada persona.

### Publicar una actualización

1. Editá el contenido desde el panel.
2. Pulsá **Exportar data.json**.
3. En GitHub, reemplazá `data.json` por el archivo exportado y confirmá con **Commit changes**.
4. Cuando termine la publicación, usá **Restaurar versión publicada** en tu navegador.

Las imágenes que se suben desde el editor quedan incrustadas en el JSON. Para imágenes definitivas conviene subirlas a `media/` y escribir su ruta.

## Carpeta de Google Drive (opcional)

El generador de piezas puede mostrar como fondos las imágenes y los videos de una carpeta de Google Drive compartida. Los pasos son:

1. Compartí la carpeta como **Cualquier persona con el enlace → Lector**.
2. Creá una clave de la **Google Drive API** en [console.cloud.google.com](https://console.cloud.google.com), restringida a tu sitio (`https://USUARIO.github.io/*`) y solo a esa API.
3. Pegá el enlace de la carpeta y la clave en el editor (pestaña **Portada → Google Drive**) y exportá `data.json`.

## Videos en el generador

Acepta videos MP4, WebM o MOV de hasta 50 MB y exporta un tramo de 3 a 15 segundos, sin sonido. Chrome, Edge y Safari exportan en MP4; otros navegadores, en WebM.

## Modo presentación

El botón **Presentar** pone el manual en pantalla completa y lo recorre bloque por bloque:

- **Avanzar:** flechas, barra espaciadora o deslizar en pantallas táctiles.
- **Salir:** Esc.

## Vista previa al compartir

Al compartir el enlace aparece una tarjeta con `media/og-extracto.jpg`. Para máxima compatibilidad, en `index.html` reemplazá `media/og-extracto.jpg` (dos veces) por la dirección completa publicada.

## Manual en PDF

`media/descargas/extracto-manual-de-marca.pdf` es una versión en A4 horizontal. Si cambiás el contenido, hay que generar una nueva:

1. Abrí el sitio en Chrome y elegí **Imprimir → Guardar como PDF**, con márgenes **Ninguno** y **Gráficos de fondo** activado.
2. Reemplazá el archivo en `media/descargas`.

## Si no ves los cambios

1. En la pestaña **Actions** del repositorio, esperá la tilde verde de «pages build and deployment».
2. Revisá que `index.html`, `app.js`, `style.css` y `data.json` estén en la raíz.
3. Forzá la recarga con `Ctrl + Shift + R` (Windows) o `Cmd + Shift + R` (Mac).
4. `index.html` carga `style.css` y `app.js` con un número de versión (`?v=...`). Si los modificás a mano, cambiá ese número.

## Criterios de marca

- **Colores:**
  - Oro `#C89210` (el de los filetes del logo).
  - Negro `#050505`.
  - Grafito `#3A3A38`.
  - Gris piedra `#C9C7C2`.
  - Blanco niebla `#F4F3F0`.
  - Blanco `#FFFFFF`.
- **Tipografía:** Gotham Light para titulares, Gotham Book para textos y Gotham Medium para etiquetas, botones y códigos.
- **Pauta:** en anuncios pagos no se nombran marcas originales; se comunica por código y notas.
- **Maquetas:** las diez aplicaciones son maquetas conceptuales, no fotografías de productos reales.
- **Borrador:** las decisiones de operación (roles, plazos, reuniones) son una propuesta pendiente de aprobación.
