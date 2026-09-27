# Manual Extracto Importado

Manual interactivo de marca y comunicación de **Extracto Importado**. Es un sitio estático (HTML, CSS y JS) que no necesita build ni dependencias.

## Estructura

```
index.html            Página del manual
assets/css/styles.css Estilos (tema claro y oscuro)
assets/js/main.js     Interacciones: menú, buscador, brief, checklist, copiar
assets/img/           Favicon y logo
.nojekyll             Evita que GitHub Pages procese el sitio con Jekyll
```

## Publicarlo con GitHub Pages

1. Creá un repositorio nuevo, por ejemplo `manual-extracto`.
2. Subí todo el contenido de esta carpeta a la raíz del repositorio (**Add file → Upload files**).
3. Andá a **Settings → Pages**.
4. En **Source**, elegí **Deploy from a branch**, rama `main` y carpeta `/ (root)`, y guardá.
5. En uno o dos minutos queda online en `https://<usuario>.github.io/manual-extracto/`.

## Cargar el logo oficial

Guardá el logo en **negro con fondo transparente** como `assets/img/logo.png`. El manual lo detecta solo:

- Si el archivo existe, reemplaza el wordmark provisorio en el menú y en la sección Logo. En el fondo negro se invierte a blanco automáticamente.
- Si no existe, se muestra la reconstrucción tipográfica.

## Editar contenido

- **Textos de las secciones:** están en `index.html`.
- **Datos que se generan con código:** están en `assets/js/main.js`. Son estos:
  - `sw`: colores de la paleta.
  - `pil`: pilares de contenido y porcentajes.
  - `phases`: checklist de lanzamiento.
  - `snips`: textos listos para copiar.

## Notas

- Las tildes del checklist y el tema elegido se guardan en el navegador de cada persona (`localStorage`). No se comparten entre usuarios.
- Las tipografías se cargan desde Google Fonts.
- Versión 1, septiembre de 2026. Borrador pendiente de aprobación.
