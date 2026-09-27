/* Extracto Importado · Manual de marca interactivo
   Basado en el motor del manual de Crisger
   Aplicación estática: lee data.json, renderiza la landing y ofrece un editor local (localStorage). */
'use strict';

const STORAGE_KEY = 'extracto-manual-v1';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clone = x => JSON.parse(JSON.stringify(x));
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Utilidad para crear nodos ---------- */
function h(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'style' && typeof value === 'object') { for (const [k, v] of Object.entries(value)) k.startsWith('--') ? node.style.setProperty(k, v) : (node.style[k] = v); }
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (key in node && !key.includes('-') && key !== 'list') node[key] = value;
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}
const icon = path => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', path);
  svg.append(p);
  return svg;
};
const ICONS = {
  prev: 'M15 5l-7 7 7 7', next: 'M9 5l7 7-7 7', copy: 'M9 9h10v10H9zM5 15V5h10',
  expand: 'M4 10V4h6M20 14v6h-6M4 4l6 6M20 20l-6-6', down: 'M12 5v14M5 12l7 7 7-7',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14', upload: 'M12 20V9M7 14l5-5 5 5M5 4h14'
};

/* ---------- Estado ---------- */
let original = null;
let data = null;
const ui = {
  logoVariant: 'principal', logoBg: 'claro', logoScale: 70,
  clearVariant: 'principal', toneIndex: 0, toneAmount: 35,
  contrastMode: 'dark', filter: 'Todas', patternIndex: 0, revealAll: false
};
const editorState = { tab: 'general', si: 0, mi: 0 };
let galleryEntries = [];
let lightboxList = [];
let lightboxIndex = 0;
let lightboxOpener = null;
let revealObserver = null;
let liveObserver = null;

const LOGO_VARIANTS = [['principal', 'Principal'], ['vertical', 'Vertical'], ['compacto', 'Compacta'], ['logotipo', 'Logotipo'], ['isotipo', 'Isotipo']];
const LOGO_BGS = [['claro', 'Claro'], ['oscuro', 'Oscuro'], ['ambar', 'Oro']];
const DEFAULT_LOGO = 'media/logo-extracto.svg';
const KINDS = [
  ['standard', 'Texto e imagen'], ['essence', 'Historia y conceptos'], ['feature', 'Maqueta destacada'],
  ['showcase', 'Aplicación de galería'], ['logo', 'Sistema de logos'], ['clearspace', 'Espacio de protección'],
  ['incorrect', 'Usos incorrectos'], ['patterns', 'Carrusel de patrones'], ['palette', 'Paleta'],
  ['tints', 'Tonos y matices'], ['contrast', 'Contraste y jerarquía'], ['type-logo', 'Tipografía del logo'],
  ['type-display', 'Pesos de Gotham'], ['type-body', 'Gotham en textos'], ['type-scale', 'Jerarquía tipográfica'],
  ['stats', 'Cifras destacadas'], ['cards', 'Tarjetas'], ['table', 'Tabla'], ['catalog', 'Catálogo con vista de pauta'],
  ['tone', 'Así sí / así no'], ['lexicon', 'Vocabulario'], ['pillars', 'Pilares de contenido'], ['contacts', 'Canales copiables'],
  ['flow', 'Pasos de un proceso'], ['snippets', 'Textos para copiar'], ['brief', 'Generador de brief'], ['checklist', 'Checklist de lanzamiento']
];
const NEW_KINDS = ['stats', 'cards', 'table', 'catalog', 'tone', 'lexicon', 'pillars', 'contacts', 'flow', 'snippets', 'brief', 'checklist'];
const GENERATED = new Set(['logo', 'clearspace', 'incorrect', 'patterns', 'palette', 'tints', 'contrast', 'type-logo', 'type-display', 'type-scale', ...NEW_KINDS]);
const WIDE = new Set(['incorrect', 'patterns', 'palette', 'tints', 'contrast', 'type-display', 'type-scale', ...NEW_KINDS.filter(k => k !== 'lexicon')]);
const ITEMS_INTERNAL = new Set(['incorrect', 'patterns', 'contrast', 'type-scale', 'essence', ...NEW_KINDS]);
const THEMES = [['light', 'Blanco cálido'], ['white', 'Blanco'], ['dark', 'Negro']];

const safeId = id => String(id || '').trim().replace(/[^a-z0-9-]/gi, '-').toLowerCase() || 'seccion';
const logoAsset = (variant, bg) => data.logos?.[variant]?.[bg] || data.logos?.principal?.[bg] || DEFAULT_LOGO;
const pad2 = n => String(n).padStart(2, '0');

/* ---------- Titulares animados palabra por palabra ---------- */
function splitWords(node, text, { emLast = false, offset = 0 } = {}) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  node.setAttribute('aria-label', words.join(' '));
  words.forEach((word, i) => {
    const inner = emLast && i === words.length - 1 ? h('span', {}, h('em', { text: word })) : h('span', { text: word });
    node.append(h('span', { class: 'w', 'aria-hidden': 'true', style: { '--i': i + offset } }, inner));
    if (i < words.length - 1) node.append(' ');
  });
  return node;
}

/* ---------- Nombre de marca: «Extracto Importado» se destaca en negrita dentro de los textos ---------- */
const BRAND_RE = /(Extracto Importado)/;
function brandify(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (BRAND_RE.test(n.nodeValue) && !n.parentElement.closest('script, style, textarea, code, .brand-word, h1, h2, h3, strong, b, .w, .tag, button, a, label, option, td, th')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const frag = document.createDocumentFragment();
    node.nodeValue.split(BRAND_RE).forEach(part => {
      if (!part) return;
      frag.append(part === 'Extracto Importado' ? h('strong', { class: 'brand-word', text: part }) : document.createTextNode(part));
    });
    node.replaceWith(frag);
  }
}

/* ---------- Color ---------- */
const isHex = v => /^#[0-9a-f]{6}$/i.test(String(v || ''));
function hexToRgb(hex) { const v = hex.replace('#', ''); return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16)); }
function luminance(hex) {
  return hexToRgb(hex).map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; })
    .reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrastRatio(a, b) { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); }
const inkFor = hex => (isHex(hex) && contrastRatio(hex, '#000000') >= contrastRatio(hex, '#FFFFFF') ? '#000000' : '#FFFFFF');
function mixHex(hex, target, amount) {
  if (!isHex(hex)) return hex;
  const a = hexToRgb(hex), t = hexToRgb(target);
  return '#' + a.map((v, i) => Math.round(v * (1 - amount) + t[i] * amount).toString(16).padStart(2, '0')).join('').toUpperCase();
}
function brandColor(matchHex, fallbackIndex) {
  const found = data.palette.find(c => String(c.hex).toUpperCase() === matchHex);
  return found?.hex || data.palette[fallbackIndex]?.hex || matchHex;
}

/* ---------- Mensajes y portapapeles ---------- */
function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('show'), 2600);
}
async function copyText(value, label = value, origin = null) {
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
    else {
      const area = h('textarea', { value, style: { position: 'fixed', opacity: '0' } });
      document.body.append(area); area.select(); document.execCommand('copy'); area.remove();
    }
    toast(`${label} copiado`);
    if (origin) { origin.querySelector('.copied-flag')?.remove(); const flag = h('span', { class: 'copied-flag', 'aria-hidden': 'true', text: '✓ Copiado' }); origin.append(flag); setTimeout(() => flag.remove(), 1400); }
  } catch { toast(`Copiá manualmente: ${value}`); }
}

/* ---------- Persistencia ---------- */
function fingerprint(obj) {
  const str = JSON.stringify(obj);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36) + str.length.toString(36);
}
function save() {
  try {
    // Se guarda junto con la huella de la versión publicada sobre la que se editó.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ base: fingerprint(original), savedAt: Date.now(), data }));
    hideLocalNotice();
  } catch {
    toast('Sin espacio en el navegador. Usá imágenes más livianas y exportá el JSON.');
  }
  updateEditBadge();
}
function hasLocalChanges() {
  try { return !!localStorage.getItem(STORAGE_KEY) && JSON.stringify(data) !== JSON.stringify(original); } catch { return false; }
}
function updateEditBadge() { const b = $('#editBadge'); if (b) b.hidden = !hasLocalChanges(); }

/* Aviso cuando se muestran cambios guardados en este navegador en lugar de la versión publicada. */
function hideLocalNotice() { $('#localNotice')?.remove(); }
function usePublished() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* sin acceso */ }
  data = clone(original);
  hideLocalNotice(); render(); updateEditBadge();
  toast('Mostrando la versión publicada');
}
function showLocalNotice(outdated) {
  hideLocalNotice();
  try { if (!outdated && sessionStorage.getItem('extracto-notice-hidden')) return; } catch { /* sin acceso */ }
  const box = h('div', { class: `local-notice${outdated ? ' is-outdated' : ''}`, id: 'localNotice', role: 'status' }, [
    h('p', {}, [
      h('strong', { text: outdated ? 'Hay una versión publicada más nueva.' : 'Estás viendo cambios guardados en este navegador.' }),
      h('span', { text: outdated
        ? ' Este navegador todavía muestra cambios hechos con el editor sobre una versión anterior.'
        : ' Otras personas ven la versión publicada.' })
    ]),
    h('div', { class: 'local-notice-actions' }, [
      h('button', { type: 'button', class: 'btn btn-small btn-primary', text: 'Ver versión publicada', onclick: usePublished }),
      h('button', { type: 'button', class: 'btn btn-small btn-ghost', text: outdated ? 'Mantener mis cambios' : 'Ocultar', onclick: () => {
        if (outdated) save();
        else { try { sessionStorage.setItem('extracto-notice-hidden', '1'); } catch { /* sin acceso */ } }
        hideLocalNotice();
      } })
    ])
  ]);
  document.body.append(box);
}

function validate(x) {
  return x && typeof x === 'object' && typeof x.heroTitle === 'string' && Array.isArray(x.palette) &&
    x.logos && typeof x.logos === 'object' && Array.isArray(x.sections) &&
    x.sections.every(s => s && typeof s.title === 'string' && Array.isArray(s.modules) &&
      s.modules.every(m => m && typeof m.title === 'string'));
}
function normalize(x) {
  const d = clone(x);
  for (const key of ['brand', 'descriptor', 'version', 'heroTitle', 'heroText', 'heroLabel', 'heroCta', 'location', 'footerText']) d[key] = d[key] ?? '';
  d.brand ||= 'Extracto Importado';
  d.heroLabel ||= 'Manual de marca';
  d.heroCta ||= 'Explorar el manual';
  d.kit = { kicker: 'Descargas', title: 'Kit de marca', lead: '', zip: '', note: '', letterheadDocx: '', letterheadPdf: '', manualPdf: '', ...(d.kit || {}) };
  d.drive = { folder: '', apiKey: '', ...(d.drive || {}) };
  d.logos ||= {};
  for (const [v] of LOGO_VARIANTS) { d.logos[v] ||= {}; for (const [b] of LOGO_BGS) d.logos[v][b] ||= ''; }
  d.palette = d.palette.filter(c => c && typeof c === 'object').map(c => ({ name: c.name || 'Color', hex: isHex(c.hex) ? c.hex.toUpperCase() : '#888888', rgb: c.rgb || '', cmyk: c.cmyk || '' }));
  d.sections.forEach((s, i) => {
    s.id = safeId(s.id || `seccion-${i + 1}`);
    s.kicker ??= ''; s.lead ??= ''; s.note ??= ''; s.navLabel ||= s.title;
    s.theme = THEMES.some(([t]) => t === s.theme) ? s.theme : ['light', 'white', 'dark'][i % 3];
    s.modules.forEach((m, j) => {
      m.id ||= `${s.id}-${j + 1}`; m.body ??= ''; m.media ??= ''; m.note ??= '';
      m.items = Array.isArray(m.items) ? m.items.map(String) : [];
      m.kind = KINDS.some(([k]) => k === m.kind) ? m.kind : 'standard';
    });
  });
  // Evita ids repetidos, necesarios para anclas únicas.
  const seen = new Set();
  d.sections.forEach(s => { let id = s.id, n = 2; while (seen.has(id)) id = `${s.id}-${n++}`; s.id = id; seen.add(id); });
  return d;
}

/* ---------- Render principal ---------- */
function render() {
  const scrollY = window.scrollY;
  const orange = isHex(data.palette[0]?.hex) ? data.palette[0].hex : '#C89210';
  document.documentElement.style.setProperty('--orange', orange);
  document.documentElement.style.setProperty('--accent-rgb', hexToRgb(orange).join(', '));
  document.title = `${data.brand} · ${data.heroLabel}`;
  for (const id of ['#navLogo', '#footerLogo', '#lightboxLogo']) { $(id).src = logoAsset('principal', 'oscuro'); $(id).alt = data.brand; }
  $('#navLabel').textContent = data.heroLabel;
  $('#navVersion').textContent = data.version;
  const footerText = $('#footerText'); footerText.replaceChildren(); splitWords(footerText, data.footerText);
  $('#footerVersion').textContent = `${data.heroLabel} · ${data.version}`;
  $('#footerLocation').textContent = [data.descriptor, data.location].filter(Boolean).join(' · ');

  const list = $('#navList');
  list.replaceChildren(...data.sections.map(s => h('li', {}, h('a', { href: `#${s.id}`, text: s.navLabel || s.title }))), h('li', { class: 'nav-indicator', 'aria-hidden': 'true' }));
  activeId = null;

  const main = $('#main');
  main.replaceChildren(renderHero(), ...data.sections.map((s, i) => renderSection(s, i)), renderKit());
  brandify(main); brandify($('#footer'));
  prepareReveals(main);
  measureHeader();
  updateActiveNav();
  if (ui.revealAll) window.scrollTo(0, scrollY);
  updateEditBadge();
}
let renderTimer = null;
function scheduleRender(delay = 220) { clearTimeout(renderTimer); renderTimer = setTimeout(render, delay); }

function renderHero() {
  const words = String(data.heroTitle || '').trim().split(/\s+/);
  const last = words.pop() || '';
  const firstSection = data.sections[0]?.id || 'main';
  return h('section', { class: 'hero', id: 'inicio', 'aria-labelledby': 'heroTitle' }, [
    h('div', { class: 'hero-inner' }, [
      h('p', { class: 'hero-label' }, [h('span', { text: data.heroLabel }), h('span', { class: 'dot', 'aria-hidden': 'true' }), h('span', { text: `Versión ${data.version}` })]),
      splitWords(h('h1', { id: 'heroTitle' }), [...words, last].join(' '), { emLast: true }),
      h('p', { class: 'hero-text', text: data.heroText })
    ]),
    h('div', { class: 'hero-bottom' }, [
      h('span', { class: 'hero-location' }, [h('b', { text: data.descriptor }), h('span', { text: data.location })]),
      h('a', { class: 'hero-cta', href: `#${firstSection}` }, [h('span', { text: data.heroCta }), h('b', { class: 'cta-icon' }, icon(ICONS.down))])
    ])
  ]);
}

function renderSection(s, index) {
  const headId = `${s.id}-title`;
  const sec = h('section', { class: `chapter theme-${s.theme}`, id: s.id, 'aria-labelledby': headId, tabindex: '-1' });
  const head = h('header', { class: 'chapter-head reveal' }, [
    h('div', {}, [h('span', { class: 'kicker', text: s.kicker }), splitWords(h('h2', { id: headId }), s.title)]),
    h('div', { class: 'chapter-lead' }, [h('p', { text: s.lead }), s.note ? h('p', { class: 'chapter-note', text: s.note }) : null])
  ]);
  sec.append(head);
  const showcases = s.modules.filter(m => m.kind === 'showcase');
  const others = s.modules.filter(m => m.kind !== 'showcase');
  const body = h('div', { class: 'chapter-body' });
  others.forEach((m, i) => body.append(renderModule(s, m, i)));
  if (showcases.length) body.append(renderGallery(showcases));
  sec.append(body);
  return sec;
}

function moduleNumber(s, i) {
  const base = String(s.kicker || '').split('·')[0].trim();
  return `${/^\d+$/.test(base) ? base : pad2(data.sections.indexOf(s) + 1)}.${pad2(i + 1)}`;
}

function renderModule(s, m, i) {
  if (m.kind === 'feature') return renderFeature(m);
  const wide = WIDE.has(m.kind) || (m.kind === 'standard' && !m.media);
  const article = h('article', { class: `module kind-${m.kind} ${wide ? 'is-wide' : 'is-split'} reveal`, id: `bloque-${safeId(m.id)}` });
  const copy = h('div', { class: 'module-copy' }, [
    h('span', { class: 'module-number', text: moduleNumber(s, i) }),
    h('h3', { text: m.title }),
    m.body ? h('p', { class: 'module-body', text: m.body }) : null
  ]);
  if (m.items.length && !ITEMS_INTERNAL.has(m.kind)) copy.append(h('ul', { class: 'module-list stagger' }, m.items.map(x => h('li', { text: x }))));
  if (m.note) copy.append(h('p', { class: 'module-note', text: m.note }));
  const visual = h('div', { class: 'module-visual' });
  const renderers = {
    logo: renderLogoDemo, clearspace: renderClearspace, incorrect: renderIncorrect, patterns: renderPatterns,
    palette: renderPalette, tints: renderToneLab, contrast: renderContrast, 'type-logo': renderTypeLogo,
    'type-display': renderTypeDisplay, 'type-body': renderTypeBody, 'type-scale': renderTypeScale, essence: renderImage,
    stats: renderStats, cards: renderCards, table: renderTable, catalog: renderCatalog, tone: renderTone, lexicon: renderLexicon,
    pillars: renderPillars, contacts: renderContacts, flow: renderFlow, snippets: renderSnippets, brief: renderBrief, checklist: renderChecklist
  };
  (renderers[m.kind] || renderImage)(visual, m);
  if (!visual.childNodes.length) visual.classList.add('is-empty');
  if (i % 2 === 1 && !wide) article.classList.add('reverse');
  article.append(copy, visual);
  if (m.kind === 'essence' && m.items.length) {
    article.append(h('ol', { class: 'concepts stagger' }, m.items.map((item, n) =>
      h('li', { class: 'concept' }, [h('span', { text: pad2(n + 1) }), h('strong', { text: item })]))));
  }
  return article;
}

function renderImage(host, m) {
  if (!m.media) return;
  const isMockup = /mockup-/.test(m.media) || m.kind === 'essence';
  const btn = h('button', { class: 'media-button', type: 'button', 'aria-label': `Ampliar imagen: ${m.title}`, onclick: e => openLightbox([m], 0, e.currentTarget) }, [
    h('img', { src: m.media, alt: isMockup ? `Maqueta conceptual: ${m.title}` : `Ejemplo visual: ${m.title}`, loading: 'lazy', decoding: 'async' }),
    h('span', { class: 'media-zoom' }, icon(ICONS.expand))
  ]);
  host.append(h('figure', { class: 'media-figure' }, [btn, h('figcaption', { text: isMockup ? 'Maqueta conceptual · ampliar' : `Ejemplo de uso · ${m.title}` })]));
}

function renderFeature(m) {
  const figure = h('figure', { class: 'feature reveal', id: `bloque-${safeId(m.id)}` });
  const button = h('button', { class: 'feature-media', type: 'button', 'aria-label': `Ampliar maqueta: ${m.title}`, onclick: e => openLightbox([m], 0, e.currentTarget) }, [
    m.media ? h('img', { src: m.media, alt: `Maqueta conceptual: ${m.title}`, loading: 'lazy', decoding: 'async' }) : null
  ]);
  figure.append(button, h('figcaption', {}, [
    h('span', { class: 'tag', text: m.note || 'Maqueta conceptual' }),
    h('strong', { text: m.title }),
    m.body ? h('p', { text: m.body }) : null
  ]));
  return figure;
}

/* ---------- Logo ---------- */
function segmented(label, options, current, onPick) {
  const group = h('div', { class: 'segmented', role: 'group', 'aria-label': label });
  for (const [value, text] of options) {
    group.append(h('button', { type: 'button', text, 'aria-pressed': String(value === current), onclick: e => {
      $$('button', group).forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
      onPick(value);
    } }));
  }
  return h('div', { class: 'control' }, [h('span', { class: 'control-label', text: label }), group]);
}
function renderLogoDemo(host) {
  const panel = h('div', { class: 'logo-demo' });
  const stage = h('div', { class: 'logo-stage' });
  const file = h('code', { class: 'logo-file' });
  const download = h('a', { class: 'btn btn-small btn-outline', href: '#kit' }, [icon(ICONS.download), 'Ir al kit de descargas']);
  const range = h('input', { type: 'range', min: 25, max: 100, value: ui.logoScale, id: 'logoScale' });
  const out = h('output', { for: 'logoScale', text: `${ui.logoScale}%` });
  function draw() {
    const src = logoAsset(ui.logoVariant, ui.logoBg);
    stage.className = `logo-stage bg-${ui.logoBg} v-${ui.logoVariant}`;
    stage.style.setProperty('--scale', ui.logoScale / 100);
    const label = LOGO_VARIANTS.find(v => v[0] === ui.logoVariant)?.[1] || '';
    const bgLabel = LOGO_BGS.find(v => v[0] === ui.logoBg)?.[1] || '';
    stage.replaceChildren(h('img', { src, alt: `Logo ${data.brand}, versión ${label.toLowerCase()} sobre fondo ${bgLabel.toLowerCase()}` }),
      h('span', { class: 'stage-tag', text: `${label} · fondo ${bgLabel.toLowerCase()}` }));
    file.textContent = src.startsWith('data:') ? 'Imagen cargada desde el editor' : src;
  }
  range.addEventListener('input', () => { ui.logoScale = Number(range.value); out.textContent = `${range.value}%`; stage.style.setProperty('--scale', ui.logoScale / 100); });
  const controls = h('div', { class: 'logo-controls' }, [
    segmented('Versión', LOGO_VARIANTS, ui.logoVariant, v => { ui.logoVariant = v; draw(); }),
    segmented('Fondo', LOGO_BGS, ui.logoBg, v => { ui.logoBg = v; draw(); }),
    h('div', { class: 'control' }, [h('label', { class: 'control-label', for: 'logoScale', text: 'Escala' }), h('div', { class: 'range-row' }, [range, out])]),
    h('div', { class: 'logo-file-row' }, [file, download])
  ]);
  panel.append(stage, controls);
  host.append(panel);
  draw();
}

function renderClearspace(host, m) {
  const panel = h('div', { class: 'clearspace' });
  const stage = h('div', { class: 'clearspace-stage' });
  function draw() {
    stage.replaceChildren(h('div', { class: `cs-box v-${ui.clearVariant}` }, [
      ...['tl', 'tr', 'bl', 'br'].map(pos => h('span', { class: `cs-x ${pos}`, 'aria-hidden': 'true', text: 'x' })),
      h('img', { src: logoAsset(ui.clearVariant, 'claro'), alt: `Espacio de protección alrededor del logo ${data.brand}, versión ${ui.clearVariant}` })
    ]));
  }
  panel.append(segmented('Versión', LOGO_VARIANTS, ui.clearVariant, v => { ui.clearVariant = v; draw(); }), stage);
  const legend = h('div', { class: 'cs-legend' }, [
    h('span', {}, [h('i', { class: 'swatch-zone', 'aria-hidden': 'true' }), 'Zona libre (x)']),
    h('span', {}, [h('i', { class: 'swatch-logo', 'aria-hidden': 'true' }), 'Área del logo'])
  ]);
  panel.append(legend);
  if (m.media) {
    panel.append(h('button', { class: 'btn btn-small btn-outline', type: 'button', onclick: e => openLightbox([{ ...m, title: `${m.title} · referencia del manual`, category: 'Manual original' }], 0, e.currentTarget) },
      [icon(ICONS.expand), 'Ver referencia del manual']));
  }
  host.append(panel);
  draw();
}

const ERROR_RULES = [
  [/color/i, 'color'], [/contorno|borde|outline/i, 'outline'], [/forma/i, 'shape'], [/volumen|3d/i, 'volume'],
  [/sombra/i, 'shadow'], [/reflej|espejo/i, 'reflect'], [/compri/i, 'compress'], [/expan|estir/i, 'expand'], [/rot|gir/i, 'rotate']
];
function renderIncorrect(host, m) {
  const fallback = ERROR_RULES.map(r => r[1]);
  const logo = logoAsset('principal', 'claro');
  const grid = h('div', { class: 'incorrect-grid stagger' });
  host.append(h('p', { class: 'incorrect-hint', text: 'Pasá el cursor o tocá un ejemplo para compararlo con el logo correcto.' }));
  grid.append(h('div', { class: 'incorrect-card is-correct' }, [
    h('div', { class: 'incorrect-stage' }, h('img', { src: logo, alt: 'Logo original sin alteraciones' })),
    h('p', { class: 'incorrect-caption' }, [h('span', { class: 'mark ok', 'aria-hidden': 'true', text: '✓' }), h('strong', { text: 'Uso correcto' })])
  ]));
  m.items.forEach((label, i) => {
    const style = ERROR_RULES.find(([re]) => re.test(label))?.[1] || fallback[i % fallback.length];
    const stage = h('div', { class: 'incorrect-stage' }, [
      h('div', { class: `error-logo error-${style}` }, h('img', { src: logo, alt: `Ejemplo incorrecto: ${label}` }))
    ]);
    const toggle = card => { const on = card.classList.toggle('show-correct'); card.setAttribute('aria-pressed', String(on)); };
    grid.append(h('div', { class: 'incorrect-card', role: 'button', tabindex: '0', 'aria-pressed': 'false', 'aria-label': `${label}. Activá para ver el logo correcto.`, style: { '--i': i },
      onclick: e => toggle(e.currentTarget), onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e.currentTarget); } } }, [stage,
      h('p', { class: 'incorrect-caption' }, [h('span', { class: 'mark no', 'aria-hidden': 'true', text: '×' }), h('strong', { text: label })])]));
  });
  host.append(grid);
}

/* ---------- Recursos: patrones ---------- */
function buildPattern(i) {
  const iso = logoAsset('isotipo', i === 0 ? 'oscuro' : 'ambar');
  const stage = h('div', { class: `pattern-stage pattern-${i}`, 'aria-hidden': 'true' });
  if (i === 0) {
    for (let n = 0; n < 12 * 10; n++) stage.append(h('img', { src: iso, alt: '', style: { '--d': `${(((n % 12) + Math.floor(n / 12)) * 0.16).toFixed(2)}s` } }));
  } else {
    for (let r = 0; r < 10; r++) {
      const row = h('div', { class: 'pattern-row' });
      for (let c = 0; c < 20; c++) row.append(h('img', { src: iso, alt: '', class: (r + c) % 2 ? 'soft' : '' }));
      stage.append(row);
    }
  }
  return stage;
}
function renderPatterns(host, m) {
  const labels = m.items.length ? m.items : ['Trama de etiquetas', 'Ritmo alternado'];
  const total = labels.length;
  const track = h('div', { class: 'pattern-track', tabindex: '0', role: 'region', 'aria-roledescription': 'carrusel', 'aria-label': 'Patrones con el isotipo. Usá las flechas para recorrerlos.' });
  const cards = labels.map((label, i) => h('figure', { class: 'pattern-card', 'aria-roledescription': 'diapositiva', 'aria-label': `${i + 1} de ${total}: ${label}` }, [
    buildPattern(i % 2),
    h('figcaption', {}, [h('strong', { text: label }), h('span', { text: `${pad2(i + 1)} / ${pad2(total)}` })])
  ]));
  track.append(...cards);
  const count = h('span', { class: 'carousel-count', 'aria-live': 'polite' });
  const dots = h('div', { class: 'carousel-dots' }, labels.map((label, i) => h('button', { type: 'button', 'aria-label': `Ir a ${label}`, onclick: () => go(i) })));
  const prev = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Patrón anterior', onclick: () => go(current() - 1) }, icon(ICONS.prev));
  const next = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Patrón siguiente', onclick: () => go(current() + 1) }, icon(ICONS.next));
  function current() {
    const left = track.scrollLeft;
    let best = 0, dist = Infinity;
    cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft - track.offsetLeft - left); if (d < dist) { dist = d; best = i; } });
    return best;
  }
  function go(i) {
    const n = Math.max(0, Math.min(total - 1, i));
    track.scrollTo({ left: cards[n].offsetLeft - track.offsetLeft, behavior: reduceMotion() ? 'auto' : 'smooth' });
  }
  function update() {
    const n = current(); ui.patternIndex = n;
    count.textContent = `${pad2(n + 1)} / ${pad2(total)} · ${labels[n]}`;
    prev.disabled = n === 0; next.disabled = n === total - 1;
    $$('button', dots).forEach((d, i) => d.setAttribute('aria-current', String(i === n)));
  }
  let raf = 0;
  track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current() + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(current() - 1); }
  });
  host.append(h('div', { class: 'carousel' }, [track, h('div', { class: 'carousel-footer' }, [count, dots, h('div', { class: 'carousel-arrows' }, [prev, next])])]));
  requestAnimationFrame(() => { if (ui.patternIndex) track.scrollLeft = cards[Math.min(ui.patternIndex, total - 1)].offsetLeft - track.offsetLeft; update(); });
}

/* ---------- Color ---------- */
function renderPalette(host) {
  const grid = h('div', { class: 'palette-bento stagger' });
  data.palette.forEach((c, i) => {
    const ink = inkFor(c.hex);
    grid.append(h('button', { type: 'button', class: `palette-tile tile-${i}${i === 0 ? ' is-main' : ''}`, style: { background: c.hex, color: ink },
      'aria-label': `Copiar HEX ${c.hex} de ${c.name}`, onclick: e => copyText(c.hex, c.hex, e.currentTarget) }, [
      h('span', { class: 'tile-top' }, [h('strong', { text: c.name }), h('span', { class: 'tile-copy' }, [icon(ICONS.copy), 'Copiar'])]),
      h('span', { class: 'tile-codes' }, [
        h('b', { class: 'tile-hex', text: c.hex }),
        c.rgb ? h('span', { text: `RGB ${c.rgb}` }) : null,
        c.cmyk ? h('span', { text: `CMYK ${c.cmyk}` }) : null
      ])
    ]));
  });
  const orange = brandColor('#C89210', 0), black = brandColor('#000000', 1);
  [['Resplandor dorado', `linear-gradient(135deg, ${orange} 0%, ${black} 100%)`, `${orange} → ${black}`],
   ['Degradado profundo', `linear-gradient(90deg, ${black} 0%, ${black} 20%, ${orange} 100%)`, `${black} → ${orange}`]].forEach(([name, bg, codes], i) => {
    grid.append(h('button', { type: 'button', class: `palette-tile gradient-tile g-${i}`, style: { background: bg, color: '#FFFFFF' },
      'aria-label': `Copiar CSS del ${name.toLowerCase()}`, onclick: e => copyText(bg, 'Degradado', e.currentTarget) }, [
      h('span', { class: 'tile-top' }, [h('strong', { text: name }), h('span', { class: 'tile-copy' }, [icon(ICONS.copy), 'Copiar CSS'])]),
      h('span', { class: 'tile-codes' }, [h('b', { class: 'tile-hex', text: i ? 'Negro → oro' : 'Oro → negro' }), h('span', { text: codes })])
    ]));
  });
  host.append(grid);
}

function renderToneLab(host) {
  const choices = data.palette.filter(c => !['#FFFFFF', '#F4F3F0'].includes(c.hex.toUpperCase()));
  const base = choices.length ? choices : data.palette;
  if (ui.toneIndex >= base.length) ui.toneIndex = 0;
  const lab = h('div', { class: 'tone-lab' });
  const picker = h('div', { class: 'tone-picker', role: 'group', 'aria-label': 'Color base' });
  const result = h('div', { class: 'tone-result' });
  const range = h('input', { type: 'range', min: 10, max: 80, step: 5, value: ui.toneAmount, id: 'toneAmount' });
  const out = h('output', { for: 'toneAmount', text: `${ui.toneAmount}%` });
  base.forEach((c, i) => picker.append(h('button', { type: 'button', class: 'tone-pick', 'aria-pressed': String(i === ui.toneIndex), onclick: e => {
    ui.toneIndex = i; $$('button', picker).forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); draw();
  } }, [h('i', { style: { background: c.hex }, 'aria-hidden': 'true' }), h('span', { text: c.name })])));
  range.addEventListener('input', () => { ui.toneAmount = Number(range.value); out.textContent = `${range.value}%`; draw(); });
  lab.append(h('div', { class: 'tone-toolbar' }, [
    h('div', { class: 'control' }, [h('span', { class: 'control-label', text: 'Color base' }), picker]),
    h('div', { class: 'control' }, [h('label', { class: 'control-label', for: 'toneAmount', text: 'Intensidad de la mezcla' }), h('div', { class: 'range-row' }, [range, out])])
  ]), result);
  function draw() {
    const color = base[ui.toneIndex]?.hex || '#C89210';
    const amount = ui.toneAmount / 100;
    // El negro no admite tonos (mezclado con negro sigue siendo negro): solo se muestran sus matices, que forman la escala de grises.
    const isBlack = luminance(color) < 0.005;
    const modes = isBlack ? [['Matices', '#FFFFFF', 'Negro mezclado con blanco: escala de grises']] : [['Matices', '#FFFFFF', 'Base mezclada con blanco'], ['Tonos', '#000000', 'Base mezclada con negro']];
    result.classList.toggle('is-single', isBlack);
    result.replaceChildren(...modes.map(([name, target, desc]) => {
      const steps = [0, 0.2, 0.4, 0.6, 0.8].map(t => mixHex(color, target, t));
      const current = mixHex(color, target, amount);
      return h('div', { class: 'tone-panel' }, [
        h('div', { class: 'tone-head' }, [h('strong', { text: name }), h('span', { text: desc })]),
        h('div', { class: 'tone-ramp' }, steps.map((hex, n) => h('button', { type: 'button', class: 'tone-swatch', style: { background: hex, color: inkFor(hex), '--i': n },
          'aria-label': `Copiar ${hex}`, title: `Copiar ${hex}`, onclick: e => copyText(hex, hex, e.currentTarget) }, h('span', { text: n ? `${n * 20}%` : 'Base' })))),
        h('button', { type: 'button', class: 'tone-current', style: { background: current, color: inkFor(current) }, onclick: e => copyText(current, current, e.currentTarget) }, [
          h('span', { text: `${ui.toneAmount}% · ${name === 'Matices' ? 'matiz' : 'tono'}` }), h('b', { text: current }), h('small', {}, [icon(ICONS.copy), 'Copiar'])
        ])
      ]);
    }));
  }
  host.append(lab);
  draw();
}

function renderContrast(host, m) {
  const [kicker = 'Perfumes de equivalencia', title = 'La precisión de un original.', body = 'Extractos de alta concentración.', accent = 'Envíos a todo el país'] = m.items;
  const P = { orange: brandColor('#C89210', 0), black: brandColor('#000000', 1), graphite: brandColor('#3A3A38', 2), gray: brandColor('#C9C7C2', 3), warm: brandColor('#F4F3F0', 4), white: brandColor('#FFFFFF', 5) };
  const modes = {
    light: { label: 'Claro', bg: P.warm, title: P.black, text: P.graphite, accent: P.orange, accentInk: P.black, ref: P.warm },
    dark: { label: 'Oscuro', bg: P.black, title: P.white, text: P.gray, accent: P.orange, accentInk: P.black, ref: P.black },
    orange: { label: 'Oro', bg: P.orange, title: P.black, text: P.black, accent: P.black, accentInk: P.white, ref: P.orange },
    gradient: { label: 'Degradado', bg: `linear-gradient(100deg, ${P.black} 0%, ${P.black} 34%, ${P.orange} 100%)`, title: P.white, text: P.warm, accent: P.orange, accentInk: P.black, ref: P.black }
  };
  const tabs = h('div', { class: 'segmented', role: 'group', 'aria-label': 'Fondo de la aplicación' });
  const stage = h('div', { class: 'contrast-stage' });
  const legend = h('ul', { class: 'contrast-legend' });
  const rating = r => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA grande' : 'Insuficiente');
  function draw(key) {
    ui.contrastMode = key;
    const mode = modes[key];
    $$('button', tabs).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === key)));
    stage.className = `contrast-stage mode-${key}`;
    stage.style.background = mode.bg;
    stage.style.setProperty('--c-title', mode.title);
    stage.style.setProperty('--c-text', mode.text);
    stage.style.setProperty('--c-accent', mode.accent);
    stage.style.setProperty('--c-accent-ink', mode.accentInk);
    stage.replaceChildren(
      h('span', { class: 'c-kicker', text: kicker }),
      h('strong', { class: 'c-title', text: title }),
      h('p', { class: 'c-body', text: body }),
      h('div', { class: 'c-accent' }, [h('b', { text: '01' }), h('span', { text: accent })])
    );
    const rows = [
      ['Titular', 'Gotham Light', mode.title],
      ['Texto', 'Gotham Book', mode.text],
      ['Acento', 'Gotham Medium', mode.accent]
    ];
    legend.replaceChildren(...rows.map(([role, font, color]) => {
      const r = contrastRatio(color, mode.ref);
      return h('li', {}, [
        h('i', { style: { background: color }, 'aria-hidden': 'true' }),
        h('span', {}, [h('strong', { text: role }), h('small', { text: `${font} · ${color}` })]),
        h('b', { text: `${r.toFixed(1)}:1`, title: rating(r) }), h('em', { text: rating(r) })
      ]);
    }), ...(key === 'gradient' ? [h('li', { class: 'legend-note', text: 'En el degradado, el contraste se mide sobre el tramo negro, donde se ubica el texto.' })] : []));
  }
  Object.entries(modes).forEach(([key, mode]) => tabs.append(h('button', { type: 'button', text: mode.label, 'data-mode': key, onclick: () => draw(key) })));
  host.append(h('div', { class: 'contrast-demo' }, [h('div', { class: 'control' }, [h('span', { class: 'control-label', text: 'Fondo' }), tabs]), h('div', { class: 'contrast-layout' }, [stage, legend])]));
  draw(ui.contrastMode);
}

/* ---------- Tipografía ---------- */
function renderTypeLogo(host) {
  host.append(h('div', { class: 'type-card type-logo' }, [
    h('span', { class: 'type-eyebrow', text: 'Archivo original del logotipo' }),
    h('div', { class: 'type-logo-stage' }, h('img', { src: logoAsset('logotipo', 'claro'), alt: `Logotipo ${data.brand}, archivo original` })),
    h('div', { class: 'type-logo-dark' }, h('img', { src: logoAsset('logotipo', 'oscuro'), alt: '' })),
    h('p', { class: 'type-caption', text: 'El lettering se aplica siempre desde el archivo del logo. No se escribe con una fuente.' })
  ]));
}
function renderTypeDisplay(host) {
  const weights = [[300, 'Light', 'Titulares y frases de campaña'], [500, 'Medium', 'Etiquetas, botones y códigos'], [700, 'Bold', 'Destacados y precios']];
  host.append(h('div', { class: 'type-weights stagger' }, weights.map(([w, name, use]) => h('div', { class: 'weight-card', style: { fontWeight: w } }, [
    h('div', { class: 'weight-head' }, [h('span', { text: `Gotham ${name}` }), h('span', { text: String(w) })]),
    h('div', { class: 'weight-aa', text: 'Aa' }),
    h('div', { class: 'weight-alpha' }, ['ABCDEFGHIJKLMN', h('br'), 'ÑOPQRSTUVWXYZ']),
    h('div', { class: 'weight-alpha lower' }, ['abcdefghijklmn', h('br'), 'ñopqrstuvwxyz']),
    h('div', { class: 'weight-num', text: '0123456789 ¿?¡!&@%' }),
    h('p', { class: 'weight-use', text: use })
  ]))));
}
function renderTypeBody(host) {
  host.append(h('div', { class: 'type-card type-inter' }, [
    h('div', { class: 'inter-top' }, [h('span', { class: 'inter-aa', text: 'Aa' }), h('div', {}, [h('span', { class: 'type-eyebrow', text: 'Gotham · Book 400' }), h('div', { class: 'inter-alpha', text: 'Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Ññ Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz' }), h('div', { class: 'inter-num', text: '0 1 2 3 4 5 6 7 8 9' })])]),
    h('div', { class: 'inter-samples' }, [
      h('div', {}, [h('small', { text: 'Párrafo · 17 / 28 px' }), h('p', { class: 'inter-lg', text: data.heroText })]),
      h('div', {}, [h('small', { text: 'Texto de apoyo · 14 / 22 px' }), h('p', { class: 'inter-sm', text: data.sections[0]?.lead || data.heroText })])
    ])
  ]));
}
function renderTypeScale(host, m) {
  const classes = ['scale-h1', 'scale-h2', 'scale-h3', 'scale-lead', 'scale-body'];
  const rows = (m.items.length ? m.items : ['H1 — La precisión de un original']).map((line, i) => {
    const [meta, sample] = line.includes(' — ') ? line.split(' — ') : [line, line];
    const cls = classes[Math.min(i, classes.length - 1)];
    const tag = cls === 'scale-body' ? 'p' : 'span';
    return h('div', { class: 'scale-row' }, [h('span', { class: 'scale-meta', text: meta.trim() }), h(tag, { class: `scale-sample ${cls}`, text: sample.trim() })]);
  });
  host.append(h('div', { class: 'type-scale stagger' }, rows));
}

/* ---------- Bloques del manual de Extracto (fusión con la versión 1) ---------- */
const splitDash = line => { const parts = String(line).split(' — '); return parts.map(x => x.trim()); };
const splitBar = line => String(line).split('|').map(x => x.trim());

function renderStats(host, m) {
  host.append(h('div', { class: `stat-grid stagger n-${Math.min(m.items.length, 4)}` }, m.items.map(line => {
    const [value, label = '', detail = ''] = splitDash(line);
    return h('div', { class: 'stat' }, [h('strong', { class: 'stat-value', text: value }), h('span', { class: 'stat-label', text: label }), detail ? h('p', { class: 'stat-detail', text: detail }) : null]);
  })));
}
function renderCards(host, m) {
  host.append(h('div', { class: `info-grid stagger n-${Math.min(m.items.length, 4)}` }, m.items.map(line => {
    const [title, text = ''] = splitDash(line);
    return h('div', { class: 'info-card' }, [h('strong', { text: title }), text ? h('p', { text }) : null]);
  })));
}
function buildTable(m, { eqCol = -1 } = {}) {
  const [head = '', ...rows] = m.items;
  const cols = splitBar(head);
  const cell = (tag, text, i) => h(tag, { class: [i === 0 && m.kind === 'catalog' ? 'code' : '', i === eqCol ? 'eq' : ''].filter(Boolean).join(' ') || undefined, text });
  return h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
    h('thead', {}, h('tr', {}, cols.map((c, i) => cell('th', c, i)))),
    h('tbody', {}, rows.map(r => h('tr', {}, splitBar(r).map((c, i) => cell('td', c, i)))))
  ]));
}
function renderTable(host, m) { host.append(buildTable(m)); }
function renderCatalog(host, m) {
  const wrap = h('div', { class: 'catalog' });
  const input = h('input', { type: 'checkbox', id: `pauta-${safeId(m.id)}`, class: 'switch-input' });
  const note = h('p', { class: 'catalog-note', 'aria-live': 'polite' });
  const sync = () => {
    wrap.classList.toggle('is-pauta', input.checked);
    note.textContent = input.checked ? 'Así se comunica en la pauta: código y notas, sin la marca original.' : 'Vista del sitio: con la equivalencia visible.';
  };
  input.addEventListener('change', sync);
  wrap.append(h('div', { class: 'catalog-bar' }, [h('label', { class: 'switch', for: input.id }, [input, h('span', { class: 'switch-track', 'aria-hidden': 'true' }), 'Vista para anuncios pagos']), note]), buildTable(m, { eqCol: 2 }));
  host.append(wrap); sync();
}
function renderTone(host, m) {
  host.append(h('div', { class: 'tone-list stagger' }, m.items.map(line => {
    const [ok, no = ''] = String(line).split('||').map(x => x.trim());
    return h('div', { class: 'tone-row' }, [
      h('div', { class: 'tone-ok' }, [h('span', { class: 'tone-tag', text: 'Así sí' }), h('p', { text: ok })]),
      h('div', { class: 'tone-no' }, [h('span', { class: 'tone-tag', text: 'Así no' }), h('p', { text: no })])
    ]);
  })));
}
function renderLexicon(host, m) {
  host.append(h('ul', { class: 'lexicon stagger' }, m.items.map(w => h('li', { text: w }))));
}
function renderPillars(host, m) {
  const rows = m.items.map(splitBar).map(([name, pct = '0', desc = '']) => ({ name, pct: Number(String(pct).replace(/[^\d.]/g, '')) || 0, desc }));
  const max = Math.max(1, ...rows.map(r => r.pct));
  const total = rows.reduce((a, r) => a + r.pct, 0);
  host.append(h('div', { class: 'pillars stagger' }, [
    ...rows.map(r => h('div', { class: 'pillar' }, [
      h('div', { class: 'pillar-name' }, [h('strong', { text: r.name }), r.desc ? h('span', { text: r.desc }) : null]),
      h('div', { class: 'pillar-bar', role: 'img', 'aria-label': `${r.name}: ${r.pct}%` }, h('i', { style: { width: `${(r.pct / max) * 100}%` } })),
      h('b', { class: 'pillar-pct', text: `${r.pct}%` })
    ])),
    h('p', { class: 'pillar-foot', text: `Total ${total}% · las barras se comparan contra el pilar más grande.` })
  ]));
}
function renderContacts(host, m) {
  host.append(h('div', { class: 'contact-grid stagger' }, m.items.map(line => {
    const [label, value = '', note = ''] = splitBar(line);
    return h('button', { type: 'button', class: 'contact', 'aria-label': `Copiar ${label}: ${value}`, onclick: e => copyText(value, label, e.currentTarget) }, [
      h('span', { class: 'contact-label', text: label }), h('strong', { text: value }), note ? h('span', { class: 'contact-note', text: note }) : null,
      h('span', { class: 'contact-copy' }, [icon(ICONS.copy), 'Copiar'])
    ]);
  })));
}
function renderFlow(host, m) {
  host.append(h('ol', { class: 'flow stagger' }, m.items.map((line, i) => {
    const [title, text = ''] = splitDash(line);
    return h('li', {}, [h('span', { class: 'flow-n', text: `Paso ${i + 1}` }), h('strong', { text: title }), text ? h('p', { text }) : null]);
  })));
}
function renderSnippets(host, m) {
  host.append(h('div', { class: 'snippet-grid stagger' }, m.items.map(line => {
    const [title, text = ''] = splitDash(line);
    return h('article', { class: 'snippet' }, [
      h('header', {}, [h('strong', { text: title }), h('button', { type: 'button', class: 'btn btn-small btn-outline', onclick: e => copyText(text, 'Texto', e.currentTarget) }, [icon(ICONS.copy), 'Copiar'])]),
      h('p', { text })
    ]);
  })));
}

/* Generador de brief: arma el pedido y chequea la fecha contra los plazos del área */
const brief = { pieza: 'Carrusel guía de regalo Día de la Madre', tipo: 'std', formato: 'Carrusel 1080 × 1350', pilar: '', fecha: '', codigos: 'N100, N36, N194',
  objetivo: 'Que elijan un perfume de regalo según cómo es su mamá y lleven dos con la promo.',
  textos: 'Tapa: ¿Cómo es tu mamá?\nN100, la dulce · N36, la intensa · N194, la luminosa\nCierre: Uno para ella, uno para vos.',
  referencias: 'Fondo claro, frascos con sombra suave. Sin nombres de marcas originales.' };
const BRIEF_TIPOS = [['std', 'Pieza nueva · 3 días hábiles', 3], ['tpl', 'Adaptación de plantilla · 24 h', 1], ['urg', 'Urgencia · usa cupo', 0]];
const BRIEF_FORMATOS = ['Publicación 1080 × 1350', 'Carrusel 1080 × 1350', 'Historia o reel 1080 × 1920', 'Anuncio Meta', 'Banner web 1440 × 360', 'Pieza para revendedores'];
function addBusinessDays(d, n) { const r = new Date(d); let a = 0; while (a < n) { r.setDate(r.getDate() + 1); const w = r.getDay(); if (w !== 0 && w !== 6) a++; } return r; }
const isoDate = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fmtDate = s => { if (!s) return 'sin definir'; const [y, mo, d] = s.split('-'); return `${d}/${mo}/${y}`; };
function renderBrief(host) {
  const pillarModule = data.sections.flatMap(s => s.modules).find(x => x.kind === 'pillars');
  const pilares = pillarModule ? pillarModule.items.map(l => splitBar(l)[0]) : ['General'];
  if (!pilares.includes(brief.pilar)) brief.pilar = pilares[0];
  const today = new Date(); today.setHours(12, 0, 0, 0);
  if (!brief.fecha) brief.fecha = isoDate(addBusinessDays(today, 4));
  const out = h('pre', { class: 'brief-out' });
  const status = h('p', { class: 'brief-status', role: 'status' });
  const draw = () => {
    const tipo = BRIEF_TIPOS.find(t => t[0] === brief.tipo) || BRIEF_TIPOS[0];
    const due = new Date(`${brief.fecha}T12:00:00`), min = addBusinessDays(today, tipo[2]);
    if (!brief.fecha) { status.className = 'brief-status'; status.textContent = ''; }
    else if (tipo[0] === 'urg') { status.className = 'brief-status is-warn'; status.textContent = 'Urgencia: descuenta 1 del cupo de 2 por semana y necesita el visto de Matías.'; }
    else if (due < min) { status.className = 'brief-status is-bad'; status.textContent = `La fecha no llega al plazo. Lo más temprano posible es el ${fmtDate(isoDate(min))}, o pedilo como urgencia.`; }
    else { status.className = 'brief-status is-ok'; status.textContent = 'La fecha entra en el plazo.'; }
    out.textContent = `BRIEF · ${brief.pieza || 'Sin nombre'}\nTipo: ${tipo[1]}\nFormato: ${brief.formato}\nPilar: ${brief.pilar}\nEntrega: ${fmtDate(brief.fecha)}\nCódigos: ${brief.codigos || '—'}\n\nOBJETIVO\n${brief.objetivo || '—'}\n\nTEXTOS\n${brief.textos || '—'}\n\nREFERENCIAS\n${brief.referencias || '—'}\n\nRecordatorio: en anuncios pagos, solo código y notas.`;
  };
  const fieldEl = (label, key, { type = 'text', options = null, multiline = false, wide = false } = {}) => {
    const id = `brief-${key}`;
    let el;
    if (options) { el = h('select', { id }, options.map(([v, t]) => h('option', { value: v, text: t }))); }
    else el = h(multiline ? 'textarea' : 'input', { id, type: multiline ? undefined : type, rows: multiline ? 3 : undefined });
    el.value = brief[key];
    el.addEventListener(options || type === 'date' ? 'change' : 'input', () => { brief[key] = el.value; draw(); });
    if (type === 'date') el.addEventListener('input', () => { brief[key] = el.value; draw(); });
    return h('div', { class: `tpl-field${wide ? ' is-wide' : ''}` }, [h('label', { for: id, text: label }), el]);
  };
  const form = h('div', { class: 'brief-form' }, [
    fieldEl('Pieza', 'pieza'),
    fieldEl('Tipo de pedido', 'tipo', { options: BRIEF_TIPOS.map(t => [t[0], t[1]]) }),
    fieldEl('Formato', 'formato', { options: BRIEF_FORMATOS.map(f => [f, f]) }),
    fieldEl('Pilar', 'pilar', { options: pilares.map(p => [p, p]) }),
    fieldEl('Fecha de entrega', 'fecha', { type: 'date' }),
    fieldEl('Códigos', 'codigos'),
    fieldEl('Objetivo', 'objetivo', { wide: true }),
    fieldEl('Textos', 'textos', { multiline: true, wide: true }),
    fieldEl('Referencias o notas', 'referencias', { wide: true })
  ]);
  host.append(h('div', { class: 'brief kit-card' }, [
    form,
    h('div', { class: 'brief-side' }, [status, out, h('div', { class: 'tpl-actions' }, [
      h('button', { type: 'button', class: 'btn btn-primary', onclick: e => copyText(out.textContent, 'Brief', e.currentTarget) }, [icon(ICONS.copy), 'Copiar brief'])
    ])])
  ]));
  draw();
}

/* Checklist de lanzamiento: las tildes se guardan en este navegador */
function renderChecklist(host, m) {
  const KEY = `extracto-checklist-${safeId(m.id)}`;
  let state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* sin datos */ }
  const phases = m.items.map(splitBar).map(([t, when = '', tasks = '']) => ({ t, when, tasks: tasks.split(';').map(x => x.trim()).filter(Boolean) }));
  const count = h('span', { class: 'check-count' });
  const bar = h('i');
  const boxes = [];
  const update = () => {
    const n = boxes.filter(b => b.checked).length;
    count.textContent = `${n} de ${boxes.length} tareas`;
    bar.style.width = `${boxes.length ? (n / boxes.length) * 100 : 0}%`;
  };
  const list = h('div', { class: 'checklist stagger' }, phases.map((p, i) => h('div', { class: 'check-phase' }, [
    h('div', { class: 'check-when' }, [h('strong', { text: p.t }), h('span', { text: p.when })]),
    h('ul', {}, p.tasks.map((task, j) => {
      const k = `${i}-${j}`;
      const box = h('input', { type: 'checkbox', id: `ck-${safeId(m.id)}-${k}`, checked: !!state[k] });
      box.addEventListener('change', () => { state[k] = box.checked; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sin acceso */ } update(); });
      boxes.push(box);
      return h('li', {}, h('label', { for: box.id }, [box, h('span', { text: task })]));
    }))
  ])));
  host.append(h('div', { class: 'check-wrap' }, [
    h('div', { class: 'check-top' }, [count, h('div', { class: 'check-progress' }, bar), h('button', { type: 'button', class: 'btn btn-small btn-ghost', text: 'Destildar todo', onclick: () => {
      boxes.forEach(b => { b.checked = false; }); state = {}; try { localStorage.removeItem(KEY); } catch { /* sin acceso */ } update();
    } })]),
    list
  ]));
  update();
}

/* ---------- Buscador ---------- */
function searchIndex() {
  const entries = [];
  for (const s of data.sections) {
    entries.push({ href: `#${s.id}`, section: s.navLabel || s.title, title: s.title, text: `${s.lead} ${s.note}` });
    for (const m of s.modules) entries.push({ href: m.kind === 'showcase' ? `#${s.id}` : `#bloque-${safeId(m.id)}`, section: s.navLabel || s.title, title: m.title, text: `${m.body} ${m.note} ${m.items.join(' ')}` });
  }
  entries.push({ href: '#kit', section: data.kit.title, title: data.kit.title, text: `${data.kit.lead} plantillas generador piezas firma de correo hoja membretada logos descargas paleta tipografías` });
  return entries;
}
const fold = v => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function initSearch() {
  const dlg = $('#search'), input = $('#searchInput'), list = $('#searchResults');
  let opener = null;
  const draw = () => {
    const q = fold(input.value.trim());
    if (!q) { list.replaceChildren(h('li', { class: 'search-empty', text: 'Escribí una palabra: envíos, logo, N100, brief, dorado…' })); return; }
    const hits = searchIndex().map(e => {
      const t = fold(e.title), x = fold(e.text);
      const score = (t.includes(q) ? 3 : 0) + (x.includes(q) ? 1 : 0);
      let snippet = '';
      const at = x.indexOf(q);
      if (at >= 0) { const raw = e.text; snippet = (at > 40 ? '…' : '') + raw.slice(Math.max(0, at - 40), at + q.length + 70).trim() + '…'; }
      return { ...e, score, snippet };
    }).filter(e => e.score).sort((a, b) => b.score - a.score).slice(0, 12);
    list.replaceChildren(...(hits.length ? hits.map(e => h('li', {}, h('a', { href: e.href, onclick: () => dlg.close() }, [
      h('span', { class: 'search-sec', text: e.section }), h('strong', { text: e.title }), e.snippet ? h('span', { class: 'search-snip', text: e.snippet }) : null
    ]))) : [h('li', { class: 'search-empty', text: 'Sin resultados. Probá con otra palabra.' })]));
  };
  $('#searchBtn').addEventListener('click', e => { opener = e.currentTarget; dlg.showModal(); document.documentElement.classList.add('modal-open'); input.select(); draw(); });
  $('#searchClose').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => { document.documentElement.classList.remove('modal-open'); if (!dlg.returnFocusSkip) opener?.focus({ preventScroll: true }); });
  input.addEventListener('input', draw);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { const first = $('a', list); if (first) { e.preventDefault(); first.click(); } } });
  document.addEventListener('keydown', e => {
    if ((e.key === '/' || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) && !e.target.matches?.('input, textarea, select, [contenteditable]') && !document.querySelector('dialog[open]')) { e.preventDefault(); $('#searchBtn').click(); }
  });
}

/* ---------- Galería ---------- */
function renderGallery(items) {
  const wrap = h('div', { class: 'gallery reveal' });
  const categories = ['Todas', ...new Set(items.map(m => m.category || 'Otras'))];
  if (!categories.includes(ui.filter)) ui.filter = 'Todas';
  const filters = h('div', { class: 'gallery-filters', role: 'group', 'aria-label': 'Filtrar aplicaciones por categoría' });
  const grid = h('ul', { class: 'gallery-grid stagger' });
  const status = h('p', { class: 'sr-only', 'aria-live': 'polite' });
  const cards = items.map(m => {
    const btn = h('button', { type: 'button', class: 'gallery-card', 'aria-label': `Ampliar ${m.title}` , onclick: e => openLightbox(galleryEntries, galleryEntries.indexOf(m), e.currentTarget) }, [
      h('span', { class: 'gallery-media' }, [
        m.media ? h('img', { src: m.media, alt: `Maqueta conceptual: ${m.title}`, loading: 'lazy', decoding: 'async' }) : null,
        h('span', { class: 'media-zoom' }, icon(ICONS.expand))
      ]),
      h('span', { class: 'gallery-caption' }, [h('span', { class: 'tag', text: m.category || 'Otras' }), h('strong', { text: m.title }), m.body ? h('span', { class: 'gallery-text', text: m.body }) : null])
    ]);
    return { li: h('li', {}, btn), m };
  });
  function apply(category, announce) {
    ui.filter = category;
    galleryEntries = category === 'Todas' ? items : items.filter(m => (m.category || 'Otras') === category);
    $$('button', filters).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === category)));
    const visible = cards.filter(c => galleryEntries.includes(c.m)).map(c => c.li);
    visible.forEach((li, i) => li.style.setProperty('--i', i));
    wrap.classList.toggle('is-filtering', !!announce);
    grid.replaceChildren(...visible);
    if (announce) status.textContent = `${galleryEntries.length} ${galleryEntries.length === 1 ? 'aplicación' : 'aplicaciones'} en ${category.toLowerCase()}`;
  }
  categories.forEach(cat => {
    const n = cat === 'Todas' ? items.length : items.filter(m => (m.category || 'Otras') === cat).length;
    filters.append(h('button', { type: 'button', 'data-cat': cat, onclick: () => apply(cat, true) }, [cat, h('span', { class: 'count', text: n })]));
  });
  wrap.append(filters, grid, status);
  apply(ui.filter, false);
  return wrap;
}

/* ---------- Kit de marca (descargas) ---------- */
const fileName = src => String(src || '').split('/').pop();
function pngFor(src) {
  // Las exportaciones PNG en alta resolución viven en media/descargas/png con el mismo nombre que el SVG.
  return /^media\/[^/]+\.svg$/.test(src) ? `media/descargas/png/${fileName(src).replace('.svg', '.png')}` : '';
}
function downloadBlob(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = h('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function paletteCSS() {
  const slug = n => n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const vars = data.palette.map(c => `  --extracto-${slug(c.name)}: ${c.hex}; /* RGB ${c.rgb} · CMYK ${c.cmyk} */`).join('\n');
  const o = brandColor('#C89210', 0), k = brandColor('#000000', 1);
  return `/* ${data.brand} · Paleta de marca · ${data.version} */\n:root {\n${vars}\n  --extracto-resplandor: linear-gradient(135deg, ${o} 0%, ${k} 100%);\n}\n`;
}
function paletteTXT() {
  return `${data.brand} · Paleta de marca · ${data.version}\n\n` + data.palette.map(c => `${c.name}\n  HEX  ${c.hex}\n  RGB  ${c.rgb}\n  CMYK ${c.cmyk}\n`).join('\n');
}
function renderKit() {
  const k = data.kit;
  const sec = h('section', { class: 'chapter theme-light kit', id: 'kit', 'aria-labelledby': 'kit-title', tabindex: '-1' });
  sec.append(h('header', { class: 'chapter-head reveal' }, [
    h('div', {}, [h('span', { class: 'kicker', text: k.kicker }), splitWords(h('h2', { id: 'kit-title' }), k.title)]),
    h('div', { class: 'chapter-lead' }, [h('p', { text: k.lead }), k.note ? h('p', { class: 'chapter-note', text: k.note }) : null])
  ]));
  const body = h('div', { class: 'chapter-body kit-body' });
  // Paquete completo
  if (k.zip) body.append(h('div', { class: 'kit-hero reveal' }, [
    h('div', {}, [h('strong', { text: 'Paquete de logos' }), h('p', { text: '5 versiones en color, en blanco y monocromáticas, en SVG y PNG de alta resolución con fondo transparente, más el archivo original.' })]),
    h('a', { class: 'btn btn-primary', href: k.zip, download: fileName(k.zip) }, [icon(ICONS.download), 'Descargar ZIP'])
  ]));
  // Logos
  const grid = h('div', { class: 'kit-logos stagger' });
  LOGO_VARIANTS.forEach(([v, label]) => {
    grid.append(h('article', { class: 'kit-card' }, [
      h('h3', { text: label }),
      h('div', { class: 'kit-variants' }, LOGO_BGS.map(([bg, bgLabel]) => {
        const src = logoAsset(v, bg); const png = pngFor(src);
        const svgName = src.startsWith('data:') ? `extracto-${v}-${bg}.svg` : fileName(src);
        return h('div', { class: `kit-variant bg-${bg}` }, [
          h('img', { src, alt: `${label} para fondo ${bgLabel.toLowerCase()}`, loading: 'lazy' }),
          h('div', { class: 'kit-links' }, [
            h('span', { text: `Fondo ${bgLabel.toLowerCase()}` }),
            h('a', { href: src, download: svgName, 'aria-label': `Descargar SVG de ${label}, fondo ${bgLabel.toLowerCase()}`, text: 'SVG' }),
            png ? h('a', { href: png, download: fileName(png), 'aria-label': `Descargar PNG de ${label}, fondo ${bgLabel.toLowerCase()}`, text: 'PNG' }) : null
          ])
        ]);
      }))
    ]));
  });
  body.append(h('div', { class: 'reveal' }, [h('h3', { class: 'kit-subtitle', text: 'Logos' }), grid]));
  // Colores y tipografías
  const fonts = [['Gotham Light', 300], ['Gotham Book', 400], ['Gotham Medium', 500], ['Gotham Bold', 700]];
  body.append(h('div', { class: 'kit-row reveal' }, [
    h('article', { class: 'kit-card kit-colors' }, [
      h('h3', { text: 'Paleta' }),
      h('div', { class: 'kit-swatches' }, data.palette.map(c => h('i', { style: { background: c.hex }, title: `${c.name} ${c.hex}` }))),
      h('p', { text: 'Códigos HEX, RGB y CMYK listos para diseño, web e imprenta.' }),
      h('div', { class: 'kit-actions' }, [
        h('button', { type: 'button', class: 'btn btn-small btn-outline', onclick: () => { downloadBlob(paletteCSS(), 'extracto-paleta.css', 'text/css'); toast('Paleta descargada'); } }, [icon(ICONS.download), 'CSS para web']),
        h('button', { type: 'button', class: 'btn btn-small btn-outline', onclick: () => { downloadBlob(paletteTXT(), 'extracto-paleta.txt', 'text/plain'); toast('Paleta descargada'); } }, [icon(ICONS.download), 'Texto para imprenta'])
      ])
    ]),
    h('article', { class: 'kit-card kit-fonts' }, [
      h('h3', { text: 'Tipografías' }),
      h('ul', {}, fonts.map(([name, w]) => h('li', {}, [
        h('span', { style: { fontWeight: w }, text: name }),
        h('span', { class: 'font-license', text: 'Licencia de la marca' })
      ]))),
      h('p', { text: 'Gotham es una tipografía con licencia comercial: los archivos se piden al equipo de diseño y no se reenvían fuera de la empresa. El lettering del logo no se reescribe con una fuente: se usa siempre el archivo del logo.' })
    ])
  ]));
  body.append(renderTemplates());
  sec.append(body);
  return sec;
}

/* ---------- Plantillas de uso rápido ---------- */
const TPL_FORMATS = {
  post: { label: 'Publicación', size: '1080 × 1350', w: 1080, h: 1350 },
  square: { label: 'Cuadrado', size: '1080 × 1080', w: 1080, h: 1080 },
  story: { label: 'Historia', size: '1080 × 1920', w: 1080, h: 1920 },
  banner: { label: 'Banner web', size: '1440 × 360', w: 1440, h: 360 }
};
const tplFam = () => (tpl.format === 'square' ? 'post' : tpl.format);
const F_SERIF = '"Gotham", "Montserrat", "Helvetica Neue", Arial, sans-serif';
const F_SANS = '"Gotham", "Montserrat", "Helvetica Neue", Arial, sans-serif';
const TPL_STYLES = {
  negro: { label: 'Negro', bg: '#000000', glow: true, title: '#FFFFFF', text: '#C9C7C2', tag: '#E3C27A', bar: '#C89210', logo: 'oscuro', iso: 'oscuro', isoAlpha: 0.1, cta: '#C89210', ctaInk: '#000000', shade: '0,0,0' },
  ambar: { label: 'Oro', bg: '#C89210', glow: false, title: '#000000', text: '#000000', tag: '#000000', bar: '#000000', logo: 'ambar', iso: 'ambar', isoAlpha: 0.14, cta: '#000000', ctaInk: '#FFFFFF', shade: '200,146,16' },
  claro: { label: 'Claro', bg: '#F4F3F0', glow: false, title: '#000000', text: '#3A3A38', tag: '#000000', bar: '#C89210', logo: 'claro', iso: 'claro', isoAlpha: 0.08, cta: '#000000', ctaInk: '#FFFFFF', shade: '244,243,240' }
};
const TPL_LAYOUTS = [['clasica', 'Clásica'], ['centrada', 'Centrada'], ['panel', 'Panel']];
const tpl = {
  format: 'post', style: 'negro', layout: 'clasica',
  tag: 'EXTRACTO N100', title: 'Dulce, cálido y persistente.',
  text: 'Notas de pera, iris y praliné. Frasco de 100 ml. Envíos a todo el país.',
  cta: '', pattern: true,
  image: null, video: null, imageName: '', zoom: 1, ox: 0, oy: 0, shade: 60,
  showLogo: true, clipStart: 0, clipLength: 8
};
const imgCache = new Map();
function loadImg(src) {
  if (!imgCache.has(src)) imgCache.set(src, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }));
  return imgCache.get(src);
}
const setLS = (ctx, px) => { if ('letterSpacing' in ctx) ctx.letterSpacing = `${px.toFixed(1)}px`; };
function wrapLines(ctx, text, maxW) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = []; let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function fitTitle(ctx, text, maxW, size, maxLines, minSize) {
  let s = size, lines;
  do {
    ctx.font = `300 ${s}px ${F_SERIF}`; setLS(ctx, -0.015 * s);
    lines = wrapLines(ctx, text, maxW);
    s -= 4;
  } while ((lines.length > maxLines || lines.some(l => ctx.measureText(l).width > maxW)) && s > minSize);
  return { lines, size: s + 4 };
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
/* Bloque de texto: etiqueta, titular, texto y botón, anclado arriba, abajo o al centro. */
function textBlock(ctx, S, o) {
  const parts = [];
  if (tpl.tag) parts.push({ type: 'tag', h: o.tagSize, gap: o.tagSize * 0.95 });
  if (tpl.title) { const t = fitTitle(ctx, tpl.title, o.w, o.titleSize, o.maxLines, o.titleSize * 0.5); parts.push({ type: 'title', h: t.lines.length * t.size, t, gap: o.titleSize * 0.34 }); }
  if (tpl.text && o.textLines) {
    ctx.font = `400 ${o.textSize}px ${F_SANS}`; setLS(ctx, 0);
    const lines = wrapLines(ctx, tpl.text, o.w).slice(0, o.textLines);
    parts.push({ type: 'text', h: lines.length * o.textSize * 1.45, lines, gap: o.textSize * 1.1 });
  }
  if (tpl.cta && o.ctaSize) parts.push({ type: 'cta', h: o.ctaSize * 2.3, gap: 0 });
  const total = parts.reduce((a, p, i) => a + p.h + (i < parts.length - 1 ? p.gap : 0), 0);
  let y = o.bottom !== undefined ? o.bottom - total : o.center !== undefined ? o.center - total / 2 : o.top;
  const ax = o.align === 'center' ? o.x + o.w / 2 : o.align === 'right' ? o.x + o.w : o.x;
  ctx.textBaseline = 'alphabetic';
  for (const p of parts) {
    if (p.type === 'tag') {
      ctx.font = `500 ${o.tagSize}px ${F_SANS}`; setLS(ctx, 0.18 * o.tagSize);
      const tw = ctx.measureText(tpl.tag).width, barW = o.tagSize * 1.3, gap = o.tagSize * 0.5, full = barW + gap + tw;
      const sx = o.align === 'center' ? ax - full / 2 : o.align === 'right' ? ax - full : ax;
      ctx.fillStyle = S.bar; ctx.fillRect(sx, y + o.tagSize * 0.44, barW, Math.max(3, o.tagSize * 0.14));
      ctx.fillStyle = S.tag; ctx.textAlign = 'left'; ctx.fillText(tpl.tag, sx + barW + gap, y + o.tagSize * 0.8);
    } else if (p.type === 'title') {
      ctx.font = `300 ${p.t.size}px ${F_SERIF}`; setLS(ctx, -0.015 * p.t.size);
      ctx.fillStyle = S.title; ctx.textAlign = o.align;
      p.t.lines.forEach((l, i) => ctx.fillText(l, ax, y + p.t.size * 0.8 + i * p.t.size));
    } else if (p.type === 'text') {
      ctx.font = `400 ${o.textSize}px ${F_SANS}`; setLS(ctx, 0);
      ctx.fillStyle = S.text; ctx.textAlign = o.align;
      p.lines.forEach((l, i) => ctx.fillText(l, ax, y + o.textSize * 1.05 + i * o.textSize * 1.45));
    } else if (p.type === 'cta') {
      ctx.font = `500 ${o.ctaSize}px ${F_SANS}`; setLS(ctx, 0);
      const tw = ctx.measureText(tpl.cta).width, bw = tw + o.ctaSize * 2.2, bh = o.ctaSize * 2.3;
      const bx = o.align === 'center' ? ax - bw / 2 : o.align === 'right' ? ax - bw : ax;
      ctx.fillStyle = S.cta; roundRect(ctx, bx, y, bw, bh, bh / 2); ctx.fill();
      ctx.fillStyle = S.ctaInk; ctx.textAlign = 'center'; ctx.fillText(tpl.cta, bx + bw / 2, y + bh / 2 + o.ctaSize * 0.36);
    }
    y += p.h + p.gap;
  }
  ctx.textAlign = 'left'; setLS(ctx, 0);
}
function drawCover(ctx, img, x, y, w, h) {
  // Sirve tanto para imágenes como para el cuadro actual de un video
  const iw = img.videoWidth || img.naturalWidth || img.width, ih = img.videoHeight || img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih) * tpl.zoom;
  const dw = iw * scale, dh = ih * scale;
  let dx = x + (w - dw) / 2 + tpl.ox * w, dy = y + (h - dh) / 2 + tpl.oy * h;
  dx = Math.min(x, Math.max(x + w - dw, dx)); dy = Math.min(y, Math.max(y + h - dh, dy));
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(img, dx, dy, dw, dh); ctx.restore();
}
function drawPattern(ctx, iso, S, W, H, region) {
  const { x, y, w, h } = region;
  const t = Math.min(w, h) * (tplFam() === 'banner' ? 0.3 : 0.1), th = t * iso.height / iso.width, gap = t * 0.1;
  const maxD = Math.hypot(w, h) * (tplFam() === 'banner' ? 0.45 : 0.62);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (let yy = y + h - th; yy > y - th; yy -= th + gap) for (let xx = x + w - t; xx > x - t; xx -= t + gap) {
    const a = S.isoAlpha * Math.max(0, 1 - Math.hypot(x + w - xx, y + h - yy) / maxD);
    if (a > 0.004) { ctx.globalAlpha = a; ctx.drawImage(iso, xx, yy, t, th); }
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
/* Área de la imagen y del panel según estructura y formato */
function panelGeometry(W, H) {
  if (tpl.layout !== 'panel') return null;
  const fmt = tplFam();
  if (fmt === 'story') return { panel: { x: 0, y: H * 0.56, w: W, h: H * 0.44 }, image: { x: 0, y: 0, w: W, h: H * 0.56 } };
  if (fmt === 'banner') return { panel: { x: W * 0.52, y: 0, w: W * 0.48, h: H }, image: { x: 0, y: 0, w: W * 0.52, h: H } };
  const pw = fmt === 'post' ? W * 0.5 : W * 0.42;
  return { panel: { x: 0, y: 0, w: pw, h: H }, image: { x: pw, y: 0, w: W - pw, h: H } };
}
async function drawTemplate(canvas) {
  const F = TPL_FORMATS[tpl.format];
  let S = TPL_STYLES[tpl.style];
  const W = F.w, H = F.h;
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  const ctx = canvas.getContext('2d');
  if (!drawTemplate.fonts) drawTemplate.fonts = Promise.all([document.fonts.load('300 40px "Gotham"'), document.fonts.load('500 40px "Gotham"'), document.fonts.load('400 20px "Gotham"')]).catch(() => {});
  await drawTemplate.fonts;
  ctx.clearRect(0, 0, W, H);
  // Con imagen de fondo a pantalla completa, los textos se ajustan para leerse sobre el velo
  if ((tpl.image || tpl.video) && tpl.layout !== 'panel') {
    if (tpl.style === 'negro') S = { ...S, text: '#E6E6E6', tag: '#FFFFFF' };
    if (tpl.style === 'ambar') S = { ...S, title: '#FFFFFF', text: '#FFFFFF', tag: '#FFFFFF', bar: '#FFFFFF', cta: '#FFFFFF', ctaInk: '#000000' };
    if (tpl.style === 'claro') S = { ...S, text: '#000000' };
  }
  const [logo, iso] = await Promise.all([loadImg(logoAsset('principal', S.logo)), loadImg(logoAsset('isotipo', S.iso))]);
  const img = tpl.video || tpl.image;
  const geo = panelGeometry(W, H);
  const u = Math.min(W, H) / 1080;
  // 1. Fondo de color
  ctx.fillStyle = S.bg; ctx.fillRect(0, 0, W, H);
  // 2. Imagen (toda la pieza, o solo el área de imagen en la estructura Panel)
  const imgArea = geo ? geo.image : { x: 0, y: 0, w: W, h: H };
  if (img) {
    drawCover(ctx, img, imgArea.x, imgArea.y, imgArea.w, imgArea.h);
    if (!geo) {
      // Velo para asegurar la lectura del texto, con el color del fondo elegido
      const a = tpl.shade / 100;
      if (tpl.style === 'ambar') {
        ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(200,146,16,${0.35 + a * 0.55})`; ctx.fillRect(0, 0, W, H); ctx.restore();
      }
      const tint = tpl.style === 'ambar' ? '0,0,0' : S.shade;
      if (tpl.layout === 'centrada') {
        ctx.fillStyle = `rgba(${tint},${a * 0.7})`; ctx.fillRect(0, 0, W, H);
        const r = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.55);
        r.addColorStop(0, `rgba(${tint},${Math.min(0.9, a * 1.1)})`); r.addColorStop(1, `rgba(${tint},0)`);
        ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
      } else {
        const g = tplFam() === 'banner' ? ctx.createLinearGradient(W, 0, W * 0.3, 0) : ctx.createLinearGradient(0, H, 0, H * 0.25);
        g.addColorStop(0, `rgba(${tint},${Math.min(0.95, a * 1.25)})`); g.addColorStop(1, `rgba(${tint},${a * 0.15})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
    }
  } else if (S.glow && !geo) {
    const g = ctx.createRadialGradient(W, H, 0, W, H, Math.max(W, H) * 0.95);
    g.addColorStop(0, 'rgba(200,146,16,0.62)'); g.addColorStop(0.38, 'rgba(200,146,16,0.2)'); g.addColorStop(0.7, 'rgba(200,146,16,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // 3. Panel sólido
  if (geo) {
    const p = geo.panel;
    ctx.fillStyle = S.bg; ctx.fillRect(p.x, p.y, p.w, p.h);
    if (!img) { // sin imagen, el área de imagen muestra la trama sobre el color opuesto
      ctx.fillStyle = tpl.style === 'negro' ? '#C89210' : '#000000'; ctx.fillRect(imgArea.x, imgArea.y, imgArea.w, imgArea.h);
    }
  }
  // 4. Trama del isotipo
  // Sobre una foto la trama recarga la pieza: solo se aplica en el panel o en fondos lisos
  if (tpl.pattern && (geo || !img)) drawPattern(ctx, iso, S, W, H, geo ? geo.panel : { x: 0, y: 0, w: W, h: H });
  // 5. Logo y textos
  const logoW = hgt => hgt * logo.width / logo.height;
  const drawLogo = (x, y, hgt) => { if (tpl.showLogo) ctx.drawImage(logo, x, y, logoW(hgt), hgt); };
  const L = tpl.layout, f = tplFam();
  if (L === 'panel') {
    const p = geo.panel, m = (f === 'banner' ? 40 : 72 * u), lh = f === 'banner' ? 30 : 44 * u;
    if (f === 'banner') {
      drawLogo(p.x + p.w - m - logoW(lh), p.y + p.h - m - lh, lh);
      textBlock(ctx, S, { x: p.x + m, w: p.w - 2 * m, align: 'right', top: m, titleSize: 44, maxLines: 2, tagSize: 18, textSize: 0, textLines: 0, ctaSize: 0 });
    } else {
      drawLogo(p.x + m, p.y + m, lh);
      textBlock(ctx, S, { x: p.x + m, w: p.w - 2 * m, align: 'left', bottom: p.y + p.h - m, titleSize: (f === 'story' ? 96 : f === 'video' ? 64 : 72) * (f === 'video' ? 1 : u), maxLines: 4, tagSize: (f === 'video' ? 22 : 26 * u), textSize: f === 'video' ? 24 : 28 * u, textLines: f === 'story' ? 3 : 4, ctaSize: f === 'video' ? 22 : 26 * u });
    }
  } else if (L === 'centrada') {
    const lh = f === 'banner' ? 30 : (f === 'video' ? 46 : 50 * u);
    if (f === 'banner') {
      drawLogo(W - 40 - logoW(lh), H - 40 - lh, lh);
      textBlock(ctx, S, { x: W * 0.2, w: W * 0.6, align: 'center', center: H / 2 - 10, titleSize: 56, maxLines: 2, tagSize: 18, textSize: 0, textLines: 0, ctaSize: 0 });
    } else {
      drawLogo(W / 2 - logoW(lh) / 2, (f === 'story' ? 150 : 80) * (f === 'video' ? 1 : u), lh);
      const m = (f === 'video' ? 260 : 110 * u);
      textBlock(ctx, S, { x: m, w: W - 2 * m, align: 'center', center: H / 2 + (f === 'story' ? 40 : 30) * u, titleSize: (f === 'story' ? 120 : f === 'video' ? 84 : 100) * (f === 'video' ? 1 : u), maxLines: 4, tagSize: f === 'video' ? 26 : 30 * u, textSize: f === 'video' ? 28 : 32 * u, textLines: 3, ctaSize: f === 'video' ? 26 : 30 * u });
    }
  } else { // clásica
    if (f === 'post') { const m = 88 * u; drawLogo(m, m, 46 * u); textBlock(ctx, S, { x: m, w: W - 2 * m, align: 'left', bottom: H - m, titleSize: 96 * u, maxLines: 4, tagSize: 29 * u, textSize: 32 * u, textLines: 3, ctaSize: 28 * u }); }
    else if (f === 'story') { const m = 96 * u; drawLogo(m, 150 * u, 54 * u); textBlock(ctx, S, { x: m, w: W - 2 * m, align: 'left', bottom: H - 300 * u, titleSize: 116 * u, maxLines: 5, tagSize: 35 * u, textSize: 38 * u, textLines: 4, ctaSize: 34 * u }); }
    else if (f === 'banner') { const m = 56; drawLogo(W - m - logoW(34), H - m - 34, 34); textBlock(ctx, S, { x: W * 0.4, w: W * 0.6 - m, align: 'right', bottom: H - m - 34 - 34, titleSize: 64, maxLines: 2, tagSize: 19, textSize: 0, textLines: 0, ctaSize: 0 }); }
    else { const m = 72; drawLogo(m, m, 48); textBlock(ctx, S, { x: m, w: W * 0.42, align: 'left', bottom: H - m, titleSize: 60, maxLines: 2, tagSize: 18, textSize: 24, textLines: 2, ctaSize: 22 }); }
  }
}
const escapeHTML = v => String(v || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function signatureHTML(f) {
  const logoUrl = new URL('media/descargas/png/logo-extracto.png', location.href).href;
  const name = escapeHTML(f.name || 'Nombre Apellido'), role = escapeHTML(f.role || 'Cargo');
  const phone = escapeHTML(f.phone || '+54 000 000-0000'), mail = escapeHTML(f.mail || 'nombre@empresa.com');
  const brand = escapeHTML([data.brand, data.descriptor, data.location].filter(Boolean).join(' · '));
  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#000000"><tr>`
    + `<td style="padding:4px 18px 4px 0;border-right:3px solid #C89210;vertical-align:middle"><img src="${logoUrl}" width="150" alt="${escapeHTML(data.brand)}" style="display:block;width:150px;height:auto;border:0"></td>`
    + `<td style="padding:4px 0 4px 18px;vertical-align:middle"><div style="font-size:15px;line-height:20px;font-weight:bold;color:#000000">${name}</div>`
    + `<div style="font-size:13px;line-height:18px;font-weight:bold;color:#3A3A38">${role}</div>`
    + `<div style="font-size:12px;line-height:18px;color:#3A3A38;padding-top:8px">${phone}<br><a href="mailto:${mail}" style="color:#3A3A38;text-decoration:none">${mail}</a><br>${brand}</div></td></tr></table>`;
}
function renderTemplates() {
  const wrap = h('div', { class: 'kit-templates reveal', id: 'plantillas' });
  wrap.append(h('h3', { class: 'kit-subtitle', text: 'Plantillas de uso rápido' }),
    h('p', { class: 'kit-intro', text: 'Piezas listas para usar: escribí el texto, elegí el formato y descargá. El sistema aplica colores, tipografías y logo según el manual.' }));
  // Generador de piezas
  const VIDEO_MAX_MB = 50;      // peso máximo del video de origen
  const CLIP_MAX_S = 15;        // duración máxima de la pieza exportada
  const CLIP_MIN_S = 3;
  const OUT_MAX_MB = 12;        // tope orientativo del archivo exportado
  const canvas = h('canvas', { class: 'tpl-canvas', role: 'img', 'aria-label': 'Vista previa de la pieza' });
  const status = h('span', { class: 'tpl-size' });
  let timer = 0, exporting = false, loopId = 0, drawing = false;
  const hasMedia = () => !!(tpl.image || tpl.video);
  const syncTools = () => {
    const F = TPL_FORMATS[tpl.format];
    status.textContent = `${F.label} · ${F.size} px${tpl.video ? ` · video de ${tpl.clipLength} s` : ''}`;
    canvas.classList.toggle('is-draggable', hasMedia());
    imgTools.hidden = !hasMedia();
    videoTools.hidden = !tpl.video;
    exportBtn.hidden = !tpl.video;
    quickVideo.hidden = !tpl.video;
  };
  const redraw = (delay = 60) => {
    if (tpl.video && !tpl.video.paused) { syncTools(); return; } // el bucle del video ya redibuja
    clearTimeout(timer); timer = setTimeout(async () => { await drawTemplate(canvas); syncTools(); }, delay);
  };
  // Bucle de vista previa del video: repite el tramo elegido
  const startLoop = () => {
    cancelAnimationFrame(loopId);
    const v = tpl.video; if (!v) return;
    const tick = async () => {
      if (tpl.video !== v) return;
      if (!exporting && v.currentTime >= tpl.clipStart + tpl.clipLength) v.currentTime = tpl.clipStart;
      if (!drawing) { drawing = true; await drawTemplate(canvas); drawing = false; }
      loopId = requestAnimationFrame(tick);
    };
    v.play().catch(() => {});
    loopId = requestAnimationFrame(tick);
  };
  const stopVideo = () => { cancelAnimationFrame(loopId); if (tpl.video) { tpl.video.pause(); URL.revokeObjectURL(tpl.video.src); } tpl.video = null; };
  const input = (label, key, multiline, placeholder = '') => {
    const id = `tpl-${key}`;
    const el = h(multiline ? 'textarea' : 'input', { id, rows: multiline ? 3 : undefined, maxlength: multiline ? 180 : 70, placeholder });
    el.value = tpl[key];
    el.addEventListener('input', () => { tpl[key] = el.value; redraw(); });
    return h('div', { class: 'tpl-field' }, [h('label', { for: id, text: label }), el]);
  };
  const check = (label, key) => {
    const el = h('input', { type: 'checkbox', id: `tpl-${key}`, checked: tpl[key] });
    el.addEventListener('change', () => { tpl[key] = el.checked; redraw(0); });
    return h('label', { class: 'tpl-check', for: `tpl-${key}` }, [el, label]);
  };
  const markThumbs = name => $$('.tpl-thumb', wrap).forEach(t => t.setAttribute('aria-pressed', String(t.title === name)));
  const resetFraming = name => { tpl.zoom = 1; tpl.ox = 0; tpl.oy = 0; zoom.value = 100; zoomOut.textContent = '100%'; imgName.textContent = name; tpl.imageName = name; markThumbs(name); };
  // Imagen de fondo
  const setImage = async (src, name) => {
    try { const im = await loadImg(src); stopVideo(); tpl.image = im; resetFraming(name); redraw(0); }
    catch { toast('No se pudo cargar la imagen. Probá con JPG, PNG o WebP.'); }
  };
  // Video de fondo, con límites de peso y duración
  const setVideo = (src, name, bytes) => new Promise(resolve => {
    if (bytes && bytes > VIDEO_MAX_MB * 1024 * 1024) { toast(`El video pesa más de ${VIDEO_MAX_MB} MB. Usá uno más corto o comprimido.`); return resolve(false); }
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.src = src;
    v.onloadeddata = () => {
      stopVideo(); tpl.image = null; tpl.video = v; resetFraming(name);
      const d = v.duration || CLIP_MAX_S;
      tpl.clipLength = Math.max(CLIP_MIN_S, Math.min(CLIP_MAX_S, Math.floor(d), tpl.clipLength || 8));
      tpl.clipStart = 0;
      clipLen.max = Math.max(CLIP_MIN_S, Math.min(CLIP_MAX_S, Math.floor(d))); clipLen.value = tpl.clipLength; clipLenOut.textContent = `${tpl.clipLength} s`;
      clipStart.max = Math.max(0, Math.floor(d - tpl.clipLength)); clipStart.value = 0; clipStartOut.textContent = '0 s';
      clipStart.disabled = d <= tpl.clipLength;
      durInfo.textContent = `Video de ${d.toFixed(1)} s. Se exporta un tramo de hasta ${CLIP_MAX_S} s, sin sonido.`;
      syncTools(); startLoop(); resolve(true);
    };
    v.onerror = () => { toast('No se pudo leer el video. Probá con MP4 (H.264) o WebM.'); resolve(false); };
  });
  const handleFile = file => {
    if (!file) return;
    if (file.type.startsWith('video/')) setVideo(URL.createObjectURL(file), file.name, file.size);
    else setImage(URL.createObjectURL(file), file.name);
  };
  const upload = h('input', { type: 'file', accept: 'image/*,video/mp4,video/webm,video/quicktime', class: 'sr-only' });
  upload.addEventListener('change', () => { handleFile(upload.files?.[0]); upload.value = ''; });
  const thumbs = h('div', { class: 'tpl-thumbs', role: 'group', 'aria-label': 'Usar una maqueta del manual como fondo' },
    data.sections.flatMap(sx => sx.modules).filter(m => m.kind === 'showcase' && m.media).map(m =>
      h('button', { type: 'button', class: 'tpl-thumb', 'aria-pressed': 'false', title: m.title, 'aria-label': `Usar ${m.title} como fondo`, onclick: () => setImage(m.media, m.title) }, h('img', { src: m.media, alt: '', loading: 'lazy' }))));
  // Carpeta de Google Drive
  const driveBox = h('div', { class: 'tpl-drive' });
  const driveCfg = () => {
    const raw = String(data.drive?.folder || '').trim();
    const id = (raw.match(/folders\/([\w-]+)/) || raw.match(/[?&]id=([\w-]+)/) || [null, raw])[1];
    return { id, key: String(data.drive?.apiKey || '').trim() };
  };
  const loadDrive = async () => {
    const { id, key } = driveCfg();
    if (!id || !key) {
      driveBox.replaceChildren(h('p', { class: 'tpl-help', text: 'Google Drive todavía no está conectado. Se configura desde el editor (pestaña Portada → Google Drive).' }));
      return;
    }
    driveBox.replaceChildren(h('p', { class: 'tpl-help', text: 'Cargando la carpeta de Drive…' }));
    try {
      const q = encodeURIComponent(`'${id}' in parents and trashed = false`);
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,thumbnailLink,size)&orderBy=createdTime%20desc&pageSize=60&supportsAllDrives=true&includeItemsFromAllDrives=true&key=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      const files = ((await res.json()).files || []).filter(f => /^(image|video)\//.test(f.mimeType));
      if (!files.length) { driveBox.replaceChildren(h('p', { class: 'tpl-help', text: 'La carpeta de Drive no tiene imágenes ni videos todavía.' })); return; }
      const grid = h('div', { class: 'tpl-thumbs' }, files.map(f => {
        const isVideo = f.mimeType.startsWith('video/');
        return h('button', { type: 'button', class: `tpl-thumb${isVideo ? ' is-video' : ''}`, 'aria-pressed': 'false', title: f.name, 'aria-label': `Usar ${f.name} de Drive como fondo${isVideo ? ' (video)' : ''}`, onclick: async e => {
          const btn = e.currentTarget;
          if (isVideo && Number(f.size) > VIDEO_MAX_MB * 1024 * 1024) { toast(`Ese video pesa más de ${VIDEO_MAX_MB} MB.`); return; }
          btn.classList.add('is-loading');
          try {
            const r = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&supportsAllDrives=true&key=${encodeURIComponent(key)}`);
            if (!r.ok) throw new Error(r.status);
            const blobUrl = URL.createObjectURL(await r.blob());
            if (isVideo) await setVideo(blobUrl, f.name, Number(f.size)); else await setImage(blobUrl, f.name);
          } catch { toast('No se pudo descargar el archivo de Drive. Revisá que la carpeta esté compartida.'); }
          btn.classList.remove('is-loading');
        } }, f.thumbnailLink ? h('img', { src: f.thumbnailLink, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : h('span', { class: 'tpl-thumb-name', text: f.name }));
      }));
      driveBox.replaceChildren(grid, h('button', { type: 'button', class: 'btn btn-small btn-ghost', text: 'Actualizar carpeta', onclick: loadDrive }));
    } catch {
      driveBox.replaceChildren(h('p', { class: 'tpl-help', text: 'No se pudo leer la carpeta de Drive. Verificá que esté compartida como «Cualquier persona con el enlace» y que la clave sea correcta.' }),
        h('button', { type: 'button', class: 'btn btn-small btn-ghost', text: 'Reintentar', onclick: loadDrive }));
    }
  };
  // Encuadre, velo y tramo de video
  const imgName = h('span', { class: 'tpl-size' });
  const range = (id, min, max, value, unit, onInput) => {
    const el = h('input', { type: 'range', min, max, value, id });
    const out = h('output', { for: id, text: `${value}${unit}` });
    el.addEventListener('input', () => { out.textContent = `${el.value}${unit}`; onInput(Number(el.value)); });
    return [el, out];
  };
  const [zoom, zoomOut] = range('tpl-zoom', 100, 250, 100, '%', v => { tpl.zoom = v / 100; redraw(0); });
  const [shade, shadeOut] = range('tpl-shade', 0, 90, tpl.shade, '%', v => { tpl.shade = v; redraw(0); });
  const [clipStart, clipStartOut] = range('tpl-clip-start', 0, 0, 0, ' s', v => { tpl.clipStart = v; if (tpl.video) tpl.video.currentTime = v; });
  const [clipLen, clipLenOut] = range('tpl-clip-len', CLIP_MIN_S, CLIP_MAX_S, tpl.clipLength, ' s', v => {
    tpl.clipLength = v;
    const d = tpl.video?.duration || v;
    clipStart.max = Math.max(0, Math.floor(d - v)); if (tpl.clipStart > clipStart.max) { tpl.clipStart = Number(clipStart.max); clipStart.value = tpl.clipStart; clipStartOut.textContent = `${tpl.clipStart} s`; }
    clipStart.disabled = d <= v; syncTools();
  });
  const ctrl = (label, id, pair) => h('div', { class: 'control' }, [h('label', { class: 'control-label', for: id, text: label }), h('div', { class: 'range-row' }, pair)]);
  const durInfo = h('p', { class: 'tpl-help' });
  const videoTools = h('div', { class: 'tpl-videotools', hidden: true }, [ctrl('Inicio del tramo', 'tpl-clip-start', [clipStart, clipStartOut]), ctrl('Duración de la pieza', 'tpl-clip-len', [clipLen, clipLenOut]), durInfo]);
  const imgTools = h('div', { class: 'tpl-imgtools', hidden: true }, [
    h('div', { class: 'tpl-imgname' }, [imgName, h('button', { type: 'button', class: 'btn btn-small btn-ghost', text: 'Quitar fondo', onclick: () => { stopVideo(); tpl.image = null; tpl.imageName = ''; markThumbs(''); redraw(0); } })]),
    ctrl('Zoom', 'tpl-zoom', [zoom, zoomOut]), ctrl('Velo para el texto', 'tpl-shade', [shade, shadeOut]), videoTools,
    h('p', { class: 'tpl-help', text: 'Arrastrá el fondo en la vista previa para encuadrarlo.' })
  ]);
  // Arrastrar para encuadrar
  let drag = null;
  canvas.addEventListener('pointerdown', e => { if (!hasMedia() || exporting) return; drag = { x: e.clientX, y: e.clientY, ox: tpl.ox, oy: tpl.oy }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect();
    tpl.ox = Math.max(-1, Math.min(1, drag.ox + (e.clientX - drag.x) / r.width));
    tpl.oy = Math.max(-1, Math.min(1, drag.oy + (e.clientY - drag.y) / r.height));
    redraw(0);
  });
  ['pointerup', 'pointercancel'].forEach(ev => canvas.addEventListener(ev, () => { drag = null; }));
  // Descargas
  const fileBase = () => `extracto-${tpl.format}-${tpl.layout}-${tpl.style}`;
  const saveBlob = (blob, name) => { const url = URL.createObjectURL(blob); const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); };
  const savePNG = () => canvas.toBlob(blob => { saveBlob(blob, `${fileBase()}.png`); toast(tpl.video ? 'Cuadro actual descargado en PNG' : 'Pieza descargada'); }, 'image/png');
  // MP4 solo si el navegador codifica en H.264 (el formato que aceptan todas las redes); si no, WebM
  const pickMime = () => ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1.4D401F', 'video/mp4;codecs=avc1.42E01E', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
  const exportVideo = async () => {
    const v = tpl.video; if (!v || exporting) return;
    const mime = pickMime();
    if (!mime || !canvas.captureStream) { toast('Este navegador no permite exportar video. Probá con Chrome o Edge actualizados.'); return; }
    exporting = true; cancelAnimationFrame(loopId); exportBtn.disabled = quickVideo.disabled = true;
    const label = exportBtn.lastChild;
    const F = TPL_FORMATS[tpl.format];
    // Tasa de bits calculada para que la pieza no supere el tope de peso
    const bits = Math.min(8_000_000, Math.floor(OUT_MAX_MB * 8 * 1024 * 1024 / tpl.clipLength * 0.9));
    try {
      v.pause(); v.currentTime = tpl.clipStart;
      await new Promise(r => { v.onseeked = () => { v.onseeked = null; r(); }; });
      await drawTemplate(canvas);
      const stream = canvas.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bits });
      const chunks = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      const done = new Promise(r => { rec.onstop = r; });
      rec.start(250);
      await v.play();
      const t0 = performance.now(), total = tpl.clipLength * 1000;
      await new Promise(resolve => {
        const frame = async () => {
          const el = performance.now() - t0;
          label.textContent = `Exportando… ${Math.min(99, Math.round(el / total * 100))}%`;
          await drawTemplate(canvas);
          if (el >= total || v.ended) resolve(); else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      rec.stop(); await done; stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunks, { type: mime.split(';')[0] });
      const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
      saveBlob(blob, `${fileBase()}.${ext}`);
      toast(`Video exportado: ${(blob.size / 1024 / 1024).toFixed(1)} MB · ${tpl.clipLength} s · ${F.size}${ext === 'webm' ? ' · formato WebM' : ''}`);
    } catch { toast('No se pudo exportar el video.'); }
    exporting = false; exportBtn.disabled = quickVideo.disabled = false; label.textContent = 'Exportar video';
    v.currentTime = tpl.clipStart; startLoop();
  };
  const download = h('button', { type: 'button', class: 'btn btn-primary', onclick: savePNG }, [icon(ICONS.download), 'Descargar PNG']);
  const exportBtn = h('button', { type: 'button', class: 'btn btn-primary', hidden: true, onclick: exportVideo }, [icon(ICONS.download), 'Exportar video']);
  const quickVideo = h('button', { type: 'button', class: 'btn btn-small btn-primary', hidden: true, onclick: exportVideo }, [icon(ICONS.download), 'Exportar video']);
  const step = (n, title, children) => h('div', { class: 'tpl-step' }, [h('span', { class: 'tpl-step-n', text: n }), h('div', { class: 'tpl-step-body' }, [h('strong', { class: 'tpl-step-title', text: title }), ...children])]);
  wrap.append(h('article', { class: 'kit-card tpl-card' }, [
    h('div', { class: 'tpl-controls' }, [
      h('h4', { text: 'Piezas para redes y web' }),
      step('1', 'Formato y estructura', [
        segmented('Formato', Object.entries(TPL_FORMATS).map(([k, f]) => [k, f.label]), tpl.format, v => { tpl.format = v; redraw(0); }),
        segmented('Estructura', TPL_LAYOUTS, tpl.layout, v => { tpl.layout = v; redraw(0); }),
        segmented('Color', Object.entries(TPL_STYLES).map(([k, st]) => [k, st.label]), tpl.style, v => { tpl.style = v; redraw(0); })
      ]),
      step('2', 'Fondo: imagen o video (opcional)', [
        h('div', { class: 'tpl-upload' }, [h('label', { class: 'btn btn-small btn-outline file-button' }, [icon(ICONS.upload), 'Subir imagen o video', upload]),
          h('span', { class: 'tpl-help', text: `Videos de hasta ${VIDEO_MAX_MB} MB; se exportan tramos de ${CLIP_MIN_S} a ${CLIP_MAX_S} s.` })]),
        h('span', { class: 'control-label', text: 'Maquetas del manual' }), thumbs,
        h('span', { class: 'control-label', text: 'Carpeta de Google Drive' }), driveBox,
        imgTools
      ]),
      step('3', 'Textos y logo', [
        input('Etiqueta', 'tag'), input('Titular', 'title'), input('Texto', 'text', true), input('Botón (opcional)', 'cta', false, 'Por ejemplo: Comprá online'),
        h('div', { class: 'tpl-checks' }, [check('Mostrar logo', 'showLogo'), check('Trama del isotipo', 'pattern')])
      ]),
      h('div', { class: 'tpl-actions' }, [download, exportBtn, status])
    ]),
    h('div', { class: 'tpl-preview' }, [canvas, h('div', { class: 'tpl-quick' }, [h('button', { type: 'button', class: 'btn btn-small btn-primary', onclick: savePNG }, [icon(ICONS.download), 'Descargar PNG']), quickVideo])])
  ]));
  loadDrive();
  // Firma de correo
  let sig = { name: '', role: '', phone: '', mail: '' };
  try { sig = { ...sig, ...JSON.parse(localStorage.getItem('extracto-firma') || '{}') }; } catch { /* sin datos guardados */ }
  const preview = h('div', { class: 'sig-preview' });
  const drawSig = () => { preview.innerHTML = signatureHTML(sig); try { localStorage.setItem('extracto-firma', JSON.stringify(sig)); } catch { /* sin acceso */ } };
  const sigField = (label, key, placeholder, type = 'text') => {
    const el = h('input', { id: `sig-${key}`, type, placeholder, value: sig[key] });
    el.addEventListener('input', () => { sig[key] = el.value; drawSig(); });
    return h('div', { class: 'tpl-field' }, [h('label', { for: `sig-${key}`, text: label }), el]);
  };
  const copySig = async () => {
    const html = signatureHTML(sig);
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([preview.innerText], { type: 'text/plain' }) })]);
    } catch {
      const range = document.createRange(); range.selectNodeContents(preview);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range); document.execCommand('copy'); sel.removeAllRanges();
    }
    toast('Firma copiada: pegala en la configuración de tu correo');
  };
  wrap.append(h('article', { class: 'kit-card sig-card' }, [
    h('div', { class: 'tpl-controls' }, [
      h('h4', { text: 'Firma de correo' }),
      h('div', { class: 'sig-grid' }, [sigField('Nombre y apellido', 'name', 'Nombre Apellido'), sigField('Cargo', 'role', 'Cargo'), sigField('Teléfono', 'phone', '+54 000 000-0000', 'tel'), sigField('Correo', 'mail', 'nombre@empresa.com', 'email')]),
      h('div', { class: 'tpl-actions' }, [
        h('button', { type: 'button', class: 'btn btn-primary', onclick: copySig }, [icon(ICONS.copy), 'Copiar firma']),
        h('button', { type: 'button', class: 'btn btn-outline', onclick: () => downloadBlob(`<!doctype html><meta charset="utf-8">${signatureHTML(sig)}`, 'extracto-firma.html', 'text/html') }, [icon(ICONS.download), 'Descargar HTML'])
      ]),
      h('p', { class: 'tpl-help', text: 'Copiá la firma y pegala en Gmail (Configuración → Firma) o en Outlook (Configuración → Correo → Firmas). El logo se carga desde el sitio publicado.' })
    ]),
    h('div', { class: 'sig-stage' }, [h('span', { class: 'tpl-size', text: 'Vista previa' }), preview])
  ]));
  // Documentos listos
  const k = data.kit;
  const doc = (title, text, links) => h('article', { class: 'kit-card doc-card' }, [h('h4', { text: title }), h('p', { text }),
    h('div', { class: 'kit-actions' }, links.filter(l => l[1]).map(([label, href]) => h('a', { class: 'btn btn-small btn-outline', href, download: fileName(href) }, [icon(ICONS.download), label])))]);
  wrap.append(h('div', { class: 'kit-row' }, [
    doc('Hoja membretada', 'Formato A4 con el logo, el filete dorado y los datos de la marca. En Word para escribir; en PDF para imprimir.', [['Word (.docx)', k.letterheadDocx], ['PDF', k.letterheadPdf]]),
    doc('Manual en PDF', 'Una versión del manual para enviar a imprentas o proveedores. También podés imprimir esta página: el diseño se adapta solo.', [['Descargar PDF', k.manualPdf]])
  ]));
  requestAnimationFrame(() => { redraw(); drawSig(); });
  return wrap;
}

/* ---------- Modo presentación ---------- */
const pres = { on: false, i: 0, fs: false };
function presSteps() {
  return [$('#inicio'), ...$$('.chapter').flatMap(sec => [sec, ...$$(':scope > .chapter-body > *', sec)])].filter(Boolean);
}
function presLabel(step) {
  if (step.id === 'inicio') return 'Portada';
  const sec = step.closest('.chapter');
  if (sec?.id === 'kit') return data.kit.title;
  const s = data.sections.find(x => x.id === sec?.id);
  const title = step.matches('.chapter') ? '' : (step.querySelector('h3, figcaption strong')?.textContent || (step.matches('.gallery') ? 'Galería' : ''));
  return [s?.navLabel || s?.title, title].filter(Boolean).join(' · ');
}
function presGo(i) {
  const steps = presSteps();
  pres.i = Math.max(0, Math.min(steps.length - 1, i));
  const step = steps[pres.i];
  step.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  $('#presenterLabel').textContent = presLabel(step);
  $('#presenterCount').textContent = `${pres.i + 1} / ${steps.length}`;
  $('#presenterPrev').disabled = pres.i === 0;
  $('#presenterNext').disabled = pres.i === steps.length - 1;
}
function presNearest() {
  const steps = presSteps();
  let best = 0;
  steps.forEach((st, i) => { if (st.getBoundingClientRect().top <= window.innerHeight * 0.35) best = i; });
  return best;
}
async function presStart() {
  pres.on = true;
  document.documentElement.classList.add('presenting');
  $('#presenter').hidden = false;
  pres.fs = false;
  try { if (document.documentElement.requestFullscreen) { await document.documentElement.requestFullscreen(); pres.fs = true; } } catch { /* pantalla completa no disponible */ }
  presGo(presNearest());
  $('#presenterNext').focus({ preventScroll: true });
  toast(matchMedia('(pointer: coarse)').matches ? 'Deslizá hacia los costados o usá los botones para avanzar' : 'Usá las flechas o la barra espaciadora para avanzar · Esc para salir');
}
function presStop() {
  if (!pres.on) return;
  pres.on = false;
  document.documentElement.classList.remove('presenting');
  $('#presenter').hidden = true;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  measureHeader();
  $('#presentBtn').focus({ preventScroll: true });
}
function initPresenter() {
  $('#presentBtn').addEventListener('click', presStart);
  $('#presenterNext').addEventListener('click', () => presGo(pres.i + 1));
  $('#presenterPrev').addEventListener('click', () => presGo(pres.i - 1));
  $('#presenterExit').addEventListener('click', presStop);
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && pres.on && pres.fs) presStop(); });
  document.addEventListener('keydown', e => {
    if (!pres.on || $('#lightbox').open || $('#editor').open) return;
    const t = e.target;
    const typing = t.matches?.('input, textarea, select, [contenteditable], .pattern-track');
    if (e.key === 'Escape') { e.preventDefault(); presStop(); return; }
    if (typing && ['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(e.key) || (e.key === ' ' && !t.matches?.('button, a'))) { e.preventDefault(); presGo(pres.i + 1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); presGo(pres.i - 1); }
    else if (e.key === 'Home') { e.preventDefault(); presGo(0); }
    else if (e.key === 'End') { e.preventDefault(); presGo(Infinity); }
  });
  let sx = 0, sy = 0;
  document.addEventListener('touchstart', e => { sx = e.changedTouches[0].clientX; sy = e.changedTouches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!pres.on || e.target.closest('.pattern-track, .gallery-filters, .site-nav, dialog')) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) presGo(pres.i + (dx < 0 ? 1 : -1));
  }, { passive: true });
}

/* ---------- Visor ---------- */
function openLightbox(list, index, opener) {
  const entries = list.filter(m => m.media);
  if (!entries.length) return;
  lightboxList = entries;
  lightboxIndex = Math.max(0, Math.min(index, entries.length - 1));
  lightboxOpener = opener || document.activeElement;
  drawLightbox();
  const dlg = $('#lightbox');
  if (!dlg.open) dlg.showModal();
  document.documentElement.classList.add('modal-open');
  $('#lightboxClose').focus();
}
function drawLightbox(direction = 0) {
  const m = lightboxList[lightboxIndex];
  const img = $('#lightboxImg');
  img.classList.remove('loaded', 'from-right', 'from-left');
  if (direction) { void img.offsetWidth; img.classList.add(direction > 0 ? 'from-right' : 'from-left'); }
  img.onload = () => img.classList.add('loaded');
  img.src = m.media;
  img.alt = /mockup-/.test(m.media) ? `Maqueta conceptual: ${m.title}` : m.title;
  $('#lightboxTitle').textContent = m.title;
  $('#lightboxText').textContent = m.body || '';
  brandify($('#lightbox .lightbox-caption'));
  $('#lightboxCategory').textContent = m.category || (m.kind === 'essence' || /mockup-/.test(m.media) ? 'Maqueta conceptual' : 'Referencia');
  const multi = lightboxList.length > 1;
  $('#lightboxCount').textContent = multi ? `${pad2(lightboxIndex + 1)} / ${pad2(lightboxList.length)}` : '';
  $('#lightboxPrev').hidden = $('#lightboxNext').hidden = !multi;
  $('#lightboxPrev').disabled = lightboxIndex === 0;
  $('#lightboxNext').disabled = lightboxIndex === lightboxList.length - 1;
}
function stepLightbox(delta) {
  const n = lightboxIndex + delta;
  if (n < 0 || n >= lightboxList.length) return;
  lightboxIndex = n; drawLightbox(delta);
}
function initLightbox() {
  const dlg = $('#lightbox');
  $('#lightboxClose').addEventListener('click', () => dlg.close());
  $('#lightboxPrev').addEventListener('click', () => stepLightbox(-1));
  $('#lightboxNext').addEventListener('click', () => stepLightbox(1));
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.classList.contains('lightbox-body')) dlg.close(); });
  dlg.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); stepLightbox(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); stepLightbox(1); }
  });
  dlg.addEventListener('close', () => {
    document.documentElement.classList.remove('modal-open');
    lightboxOpener?.focus?.({ preventScroll: true });
  });
  let sx = 0, sy = 0;
  dlg.addEventListener('touchstart', e => { sx = e.changedTouches[0].clientX; sy = e.changedTouches[0].clientY; }, { passive: true });
  dlg.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) stepLightbox(dx < 0 ? 1 : -1);
    else if (dy > 110 && Math.abs(dy) > Math.abs(dx) * 1.5) dlg.close();
  }, { passive: true });
}

/* ---------- Navegación, progreso y animaciones ---------- */
function measureHeader() {
  document.documentElement.style.setProperty('--header-h', `${$('#header').offsetHeight}px`);
}
let activeId = null;
function updateActiveNav() {
  const offset = $('#header').offsetHeight + window.innerHeight * 0.3;
  let current = null;
  for (const s of data?.sections || []) {
    const node = document.getElementById(s.id);
    if (node && node.getBoundingClientRect().top <= offset) current = s.id;
  }
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  if (atBottom && data?.sections.length) current = data.sections.at(-1).id;
  if (current === activeId) return;
  activeId = current;
  requestAnimationFrame(moveIndicator);
  $$('#navList a').forEach(a => {
    const on = a.hash === `#${current}`;
    a.classList.toggle('active', on);
    if (on) {
      a.setAttribute('aria-current', 'true');
      const nav = $('#siteNav');
      if (nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: a.offsetLeft - nav.clientWidth / 2 + a.offsetWidth / 2, behavior: reduceMotion() ? 'auto' : 'smooth' });
    } else a.removeAttribute('aria-current');
  });
}
function moveIndicator() {
  const indicator = $('.nav-indicator');
  const link = $('#navList a.active');
  if (!indicator) return;
  if (!link) { indicator.classList.remove('on'); return; }
  const pad = parseFloat(getComputedStyle(link).paddingLeft) || 12;
  indicator.style.width = `${link.offsetWidth - pad * 2}px`;
  indicator.style.transform = `translateX(${link.parentElement.offsetLeft + pad}px)`;
  indicator.classList.add('on');
}
function parallax() {
  if (reduceMotion()) return;
  const vh = window.innerHeight;
  const hero = $('.hero-decor');
  if (hero && window.scrollY < vh * 1.2) hero.style.setProperty('--hero-py', `${window.scrollY * 0.25}px`);
  for (const img of $$('.feature-media img:not(.feature-badge), .media-button img')) {
    const r = img.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) continue;
    const progress = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
    img.style.setProperty('--py', `${(progress * -24).toFixed(1)}px`);
  }
}
function onScroll() {
  const root = document.documentElement;
  const max = Math.max(1, root.scrollHeight - root.clientHeight);
  $('#progress span').style.transform = `scaleX(${Math.min(1, window.scrollY / max)})`;
  $('#backToTop').classList.toggle('visible', window.scrollY > window.innerHeight * 0.9);
  $('#backToTop').style.setProperty('--p', Math.min(1, window.scrollY / max).toFixed(3));
  parallax();
  $('#header').classList.toggle('scrolled', window.scrollY > 10);
  updateActiveNav();
}
function prepareReveals(root) {
  revealObserver?.disconnect();
  $$('.stagger').forEach(group => [...group.children].forEach((child, i) => child.style.setProperty('--i', Math.min(i, 14))));
  liveObserver?.disconnect();
  if ('IntersectionObserver' in window) {
    liveObserver = new IntersectionObserver(entries => entries.forEach(e => e.target.classList.toggle('is-live', e.isIntersecting)), { threshold: 0.15 });
    $$('.pattern-stage', root).forEach(st => liveObserver.observe(st));
  }
  const targets = [...$$('.reveal', root), ...$$('.footer .reveal')];
  if (ui.revealAll || !('IntersectionObserver' in window) || reduceMotion()) { targets.forEach(x => x.classList.add('in-view')); return; }
  document.documentElement.classList.add('js-reveal');
  revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('in-view'); revealObserver.unobserve(entry.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  targets.forEach(x => revealObserver.observe(x));
}
function initNavigation() {
  let ticking = false;
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); } }, { passive: true });
  window.addEventListener('resize', () => { measureHeader(); onScroll(); moveIndicator(); });
  $('#backToTop').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
    $('.header-logo').focus({ preventScroll: true });
  });
  // Anclas internas: desplazamiento suave y foco en la sección de destino.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    const target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', a.hash === '#inicio' ? location.pathname + location.search : a.hash);
    const focusTarget = target.matches('[tabindex]') ? target : target.querySelector('h1, h2');
    focusTarget?.setAttribute('tabindex', focusTarget.getAttribute('tabindex') || '-1');
    focusTarget?.focus({ preventScroll: true });
  });
}

/* ---------- Editor ---------- */
function field(host, label, value, change, opts = {}) {
  const id = `f-${Math.random().toString(36).slice(2, 9)}`;
  const input = h(opts.multiline ? 'textarea' : 'input', { id, rows: opts.rows || (opts.multiline ? 4 : undefined), placeholder: opts.placeholder || '' });
  input.value = value ?? '';
  if (opts.readonly) input.readOnly = true;
  input.addEventListener('input', () => change(input.value));
  host.append(h('div', { class: 'editor-field' }, [h('label', { for: id, text: label }), input, opts.help ? h('small', { text: opts.help }) : null]));
  return input;
}
function selectField(host, label, options, value, change) {
  const id = `s-${Math.random().toString(36).slice(2, 9)}`;
  const select = h('select', { id }, options.map(([v, t]) => h('option', { value: String(v), text: t })));
  select.value = String(value);
  select.addEventListener('change', () => change(select.value));
  host.append(h('div', { class: 'editor-field' }, [h('label', { for: id, text: label }), select]));
  return select;
}
function actionRow(host, buttons) {
  host.append(h('div', { class: 'row-actions' }, buttons.filter(Boolean).map(([title, action, variant = 'btn-ghost', disabled = false]) =>
    h('button', { type: 'button', class: `btn btn-small ${variant}`, text: title, onclick: action, disabled }))));
}
function group(host, title) { const box = h('fieldset', { class: 'editor-group' }, h('legend', { text: title })); host.append(box); return box; }
function edit(fn, delay) { fn(); save(); scheduleRender(delay); }
function structural(fn) { fn(); save(); render(); renderEditor(); }

async function fileToDataURL(file, { maxWidth = 1800, keepOriginal = false } = {}) {
  if (keepOriginal || file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
  }
  const bmp = await createImageBitmap(file);
  const factor = Math.min(1, maxWidth / bmp.width);
  const canvas = h('canvas', { width: Math.round(bmp.width * factor), height: Math.round(bmp.height * factor) });
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.82);
}
function mediaField(host, label, value, onChange, { onRestore, keepOriginal, previewBg } = {}) {
  const box = h('div', { class: 'media-field' });
  const preview = h('div', { class: `media-preview ${previewBg ? `bg-${previewBg}` : ''}` });
  const drawPreview = src => preview.replaceChildren(src ? h('img', { src, alt: '' }) : h('span', { text: 'Sin imagen' }));
  drawPreview(value);
  box.append(h('span', { class: 'media-label', text: label }), preview);
  const pathInput = field(box, 'Ruta del archivo', value && value.startsWith('data:') ? '' : value, v => { onChange(v.trim()); drawPreview(v.trim()); },
    { placeholder: value?.startsWith('data:') ? 'Imagen incrustada desde el editor' : 'media/archivo.webp' });
  const upload = h('input', { type: 'file', accept: 'image/*', class: 'sr-only' });
  upload.addEventListener('change', async () => {
    const file = upload.files?.[0]; if (!file) return;
    try {
      const url = await fileToDataURL(file, { keepOriginal });
      onChange(url); drawPreview(url); pathInput.value = ''; pathInput.placeholder = 'Imagen incrustada desde el editor';
      toast('Imagen actualizada');
    } catch { toast('No se pudo procesar la imagen'); }
    upload.value = '';
  });
  box.append(h('div', { class: 'row-actions' }, [
    h('label', { class: 'btn btn-small btn-outline file-button' }, ['Subir imagen', upload]),
    onRestore ? h('button', { type: 'button', class: 'btn btn-small btn-ghost', text: 'Restaurar', onclick: () => { const v = onRestore(); drawPreview(v); pathInput.value = v; } }) : null
  ]));
  host.append(box);
}

function renderEditor() {
  const host = $('#editorFields');
  host.replaceChildren();
  $$('.editor-tabs [role=tab]').forEach(b => { const on = b.dataset.tab === editorState.tab; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
  const tab = editorState.tab;

  if (tab === 'general') {
    const g = group(host, 'Portada');
    field(g, 'Etiqueta del manual', data.heroLabel, v => edit(() => { data.heroLabel = v; }));
    field(g, 'Versión', data.version, v => edit(() => { data.version = v; }));
    field(g, 'Título de portada', data.heroTitle, v => edit(() => { data.heroTitle = v; }), { help: 'La última palabra se destaca en dorado.' });
    field(g, 'Texto de portada', data.heroText, v => edit(() => { data.heroText = v; }), { multiline: true });
    field(g, 'Ubicación', data.location, v => edit(() => { data.location = v; }));
    field(g, 'Texto del enlace', data.heroCta, v => edit(() => { data.heroCta = v; }));
    const b = group(host, 'Marca y cierre');
    field(b, 'Nombre de marca (texto alternativo del logo)', data.brand, v => edit(() => { data.brand = v; }));
    field(b, 'Descriptor', data.descriptor, v => edit(() => { data.descriptor = v; }));
    field(b, 'Texto de cierre', data.footerText, v => edit(() => { data.footerText = v; }), { multiline: true, rows: 2 });
    const k = group(host, 'Kit de marca (descargas)');
    field(k, 'Etiqueta', data.kit.kicker, v => edit(() => { data.kit.kicker = v; }));
    field(k, 'Título', data.kit.title, v => edit(() => { data.kit.title = v; }));
    field(k, 'Introducción', data.kit.lead, v => edit(() => { data.kit.lead = v; }), { multiline: true, rows: 3 });
    field(k, 'Nota', data.kit.note, v => edit(() => { data.kit.note = v; }), { multiline: true, rows: 2 });
    field(k, 'Archivo ZIP de logos', data.kit.zip, v => edit(() => { data.kit.zip = v.trim(); }), { help: 'Ruta dentro del repositorio. Dejalo vacío para ocultar el botón.' });
    field(k, 'Hoja membretada (Word)', data.kit.letterheadDocx, v => edit(() => { data.kit.letterheadDocx = v.trim(); }));
    field(k, 'Hoja membretada (PDF)', data.kit.letterheadPdf, v => edit(() => { data.kit.letterheadPdf = v.trim(); }));
    field(k, 'Manual en PDF', data.kit.manualPdf, v => edit(() => { data.kit.manualPdf = v.trim(); }));
    const gd = group(host, 'Google Drive (fondos para plantillas)');
    field(gd, 'Carpeta de Drive (enlace o ID)', data.drive.folder, v => edit(() => { data.drive.folder = v.trim(); }, 600), { help: 'La carpeta debe estar compartida como «Cualquier persona con el enlace».' });
    field(gd, 'Clave de API de Google', data.drive.apiKey, v => edit(() => { data.drive.apiKey = v.trim(); }, 600), { help: 'Clave restringida a la API de Google Drive y al dominio del sitio. Ver README.' });
  }

  if (tab === 'section') {
    editorState.si = Math.min(editorState.si, data.sections.length - 1);
    selectField(host, 'Sección', data.sections.map((s, i) => [i, `${pad2(i + 1)} · ${s.navLabel || s.title}`]), editorState.si, v => { editorState.si = Number(v); editorState.mi = 0; renderEditor(); });
    const s = data.sections[editorState.si];
    if (s) {
      const g = group(host, 'Textos de la sección');
      field(g, 'Nombre en la navegación', s.navLabel, v => edit(() => { s.navLabel = v; }));
      field(g, 'Número y categoría', s.kicker, v => edit(() => { s.kicker = v; }));
      field(g, 'Título', s.title, v => edit(() => { s.title = v; }));
      field(g, 'Introducción', s.lead, v => edit(() => { s.lead = v; }), { multiline: true, rows: 3 });
      field(g, 'Nota', s.note, v => edit(() => { s.note = v; }), { multiline: true, rows: 2 });
      selectField(g, 'Fondo', THEMES, s.theme, v => edit(() => { s.theme = v; }, 0));
      field(g, 'Ancla (id)', s.id, () => {}, { readonly: true, help: 'Identificador fijo del enlace: #' + s.id });
      actionRow(host, [
        ['↑ Subir', () => move(data.sections, editorState.si, -1, 'si'), 'btn-ghost', editorState.si === 0],
        ['↓ Bajar', () => move(data.sections, editorState.si, 1, 'si'), 'btn-ghost', editorState.si === data.sections.length - 1],
        ['+ Nueva sección', () => structural(() => {
          data.sections.splice(editorState.si + 1, 0, { id: `seccion-${Date.now().toString(36)}`, kicker: 'Nueva sección', navLabel: 'Nueva', title: 'Nueva sección', lead: '', note: '', theme: 'white', modules: [] });
          editorState.si++; data = normalize(data);
        }), 'btn-outline'],
        ['Eliminar sección', () => {
          if (data.sections.length < 2 || !confirm(`¿Eliminar la sección «${s.title}» y todo su contenido?`)) return;
          structural(() => { data.sections.splice(editorState.si, 1); editorState.si = Math.max(0, editorState.si - 1); });
        }, 'btn-danger']
      ]);
    }
  }

  if (tab === 'module') {
    editorState.si = Math.min(editorState.si, data.sections.length - 1);
    selectField(host, 'Sección', data.sections.map((s, i) => [i, `${pad2(i + 1)} · ${s.navLabel || s.title}`]), editorState.si, v => { editorState.si = Number(v); editorState.mi = 0; renderEditor(); });
    const s = data.sections[editorState.si];
    if (!s) return;
    editorState.mi = Math.min(editorState.mi, Math.max(0, s.modules.length - 1));
    if (s.modules.length) selectField(host, 'Bloque', s.modules.map((m, i) => [i, `${pad2(i + 1)} · ${m.title}`]), editorState.mi, v => { editorState.mi = Number(v); renderEditor(); });
    const m = s.modules[editorState.mi];
    if (m) {
      const g = group(host, 'Contenido del bloque');
      selectField(g, 'Formato', KINDS, m.kind, v => structural(() => { m.kind = v; }));
      field(g, 'Título', m.title, v => edit(() => { m.title = v; }));
      field(g, 'Texto', m.body, v => edit(() => { m.body = v; }), { multiline: true, rows: 5 });
      const listHelp = {
        incorrect: 'Cada línea genera un ejemplo. Palabras clave: color, contorno, forma, volumen, sombra, reflejar, comprimir, expandir, rotar.',
        patterns: 'Una línea por patrón. Los diseños se alternan: trama técnica y ritmo alternado.',
        contrast: 'Líneas: 1 etiqueta, 2 titular, 3 texto, 4 acento.',
        'type-scale': 'Una línea por nivel: «Referencia — Texto de ejemplo».',
        essence: 'Cada línea se muestra como un concepto.',
        stats: 'Una línea por cifra: «Valor — Etiqueta — Detalle».',
        cards: 'Una línea por tarjeta: «Título — Texto».',
        table: 'Una línea por fila, columnas separadas con «|». La primera línea es el encabezado.',
        catalog: 'Como la tabla. La tercera columna (equivalencia) se oculta en la vista para anuncios pagos.',
        tone: 'Una línea por ejemplo: «Así sí || Así no».',
        lexicon: 'Una palabra o expresión por línea.',
        pillars: 'Una línea por pilar: «Nombre | Porcentaje | Descripción».',
        contacts: 'Una línea por canal: «Canal | Dato para copiar | Nota».',
        flow: 'Una línea por paso: «Título — Texto».',
        snippets: 'Una línea por texto: «Título — Texto para copiar».',
        brief: 'El generador toma los pilares del bloque «Pilares de contenido».',
        checklist: 'Una línea por etapa: «T-30 | un mes antes | tarea; tarea; tarea».'
      }[m.kind];
      field(g, 'Lista (una línea por elemento)', m.items.join('\n'), v => edit(() => { m.items = v.split('\n').map(x => x.trim()).filter(Boolean); }), { multiline: true, rows: 4, help: listHelp });
      field(g, m.kind === 'feature' ? 'Etiqueta' : 'Nota', m.note, v => edit(() => { m.note = v; }), { multiline: true, rows: 2 });
      if (['showcase', 'feature'].includes(m.kind)) field(g, 'Categoría de galería', m.category || '', v => edit(() => { m.category = v; }));
      if (!GENERATED.has(m.kind) || m.kind === 'clearspace') {
        mediaField(g, m.kind === 'clearspace' ? 'Imagen de referencia' : 'Imagen', m.media, v => edit(() => { m.media = v; }, 400), {
          onRestore: () => { const src = original.sections.flatMap(x => x.modules).find(x => x.id === m.id); m.media = src?.media || ''; save(); render(); return m.media; }
        });
      } else {
        g.append(h('p', { class: 'helper', text: m.kind === 'logo' || m.kind === 'type-logo' ? 'Este ejemplo usa los archivos definidos en la pestaña Logos.' : 'Este ejemplo se genera con los datos y estilos del manual.' }));
      }
      actionRow(host, [
        ['↑ Subir', () => move(s.modules, editorState.mi, -1, 'mi'), 'btn-ghost', editorState.mi === 0],
        ['↓ Bajar', () => move(s.modules, editorState.mi, 1, 'mi'), 'btn-ghost', editorState.mi === s.modules.length - 1],
        ['Duplicar', () => structural(() => { const copy = clone(m); copy.id = `${m.id}-copia-${Date.now().toString(36)}`; copy.title += ' (copia)'; s.modules.splice(editorState.mi + 1, 0, copy); editorState.mi++; }), 'btn-ghost'],
        ['Eliminar bloque', () => { if (!confirm(`¿Eliminar el bloque «${m.title}»?`)) return; structural(() => { s.modules.splice(editorState.mi, 1); editorState.mi = Math.max(0, editorState.mi - 1); }); }, 'btn-danger']
      ]);
    } else host.append(h('p', { class: 'helper', text: 'Esta sección todavía no tiene bloques.' }));
    actionRow(host, [['+ Agregar bloque', () => structural(() => {
      const isGallery = s.modules.some(x => x.kind === 'showcase');
      s.modules.splice(editorState.mi + 1, 0, { id: `bloque-${Date.now().toString(36)}`, title: 'Nuevo bloque', body: '', media: '', note: '', items: [], kind: isGallery ? 'showcase' : 'standard', ...(isGallery ? { category: 'Otras' } : {}) });
      editorState.mi = s.modules.length === 1 ? 0 : editorState.mi + 1;
    }), 'btn-outline']]);
  }

  if (tab === 'palette') {
    host.append(h('p', { class: 'helper', text: 'El primer color define el acento de toda la interfaz. Los ejemplos de contraste y degradados usan los colores de marca.' }));
    data.palette.forEach((c, i) => {
      const g = group(host, `${pad2(i + 1)} · ${c.name}`);
      const pick = h('input', { type: 'color', value: isHex(c.hex) ? c.hex.toLowerCase() : '#000000', 'aria-label': `Selector de color para ${c.name}` });
      g.append(h('div', { class: 'color-row' }, [pick]));
      const hexInput = field(g, 'HEX', c.hex, v => { if (isHex(v)) { edit(() => { c.hex = v.toUpperCase(); }); pick.value = v.toLowerCase(); } }, { help: 'Formato #RRGGBB' });
      pick.addEventListener('input', () => { hexInput.value = pick.value.toUpperCase(); edit(() => { c.hex = pick.value.toUpperCase(); }); });
      field(g, 'Nombre', c.name, v => edit(() => { c.name = v; }));
      field(g, 'RGB', c.rgb, v => edit(() => { c.rgb = v; }));
      field(g, 'CMYK', c.cmyk, v => edit(() => { c.cmyk = v; }));
      actionRow(g, [
        ['↑', () => move(data.palette, i, -1), 'btn-ghost', i === 0],
        ['↓', () => move(data.palette, i, 1), 'btn-ghost', i === data.palette.length - 1],
        ['Eliminar', () => { if (data.palette.length < 2 || !confirm(`¿Eliminar ${c.name}?`)) return; structural(() => data.palette.splice(i, 1)); }, 'btn-danger']
      ]);
    });
    actionRow(host, [['+ Agregar color', () => structural(() => data.palette.push({ name: 'Nuevo color', hex: '#888888', rgb: '136, 136, 136', cmyk: '' })), 'btn-outline']]);
  }

  if (tab === 'logos') {
    host.append(h('p', { class: 'helper', text: 'Cada versión tiene un archivo para fondo claro, oscuro y oro. Usá PNG o SVG con transparencia.' }));
    LOGO_VARIANTS.forEach(([v, label]) => {
      const g = group(host, label);
      LOGO_BGS.forEach(([bg, bgLabel]) => mediaField(g, `Fondo ${bgLabel.toLowerCase()}`, data.logos[v][bg], val => edit(() => { data.logos[v][bg] = val; }, 300), {
        keepOriginal: true, previewBg: bg,
        onRestore: () => { data.logos[v][bg] = original.logos?.[v]?.[bg] || ''; save(); render(); return data.logos[v][bg]; }
      }));
    });
  }
}
function move(arr, index, delta, key) {
  const next = index + delta;
  if (next < 0 || next >= arr.length) return;
  structural(() => { [arr[index], arr[next]] = [arr[next], arr[index]]; if (key) editorState[key] = next; });
}
function initEditor() {
  const dlg = $('#editor');
  let opener = null;
  $('#editEntry').addEventListener('click', e => {
    opener = e.currentTarget; ui.revealAll = true; document.documentElement.classList.add('editing'); render();
    dlg.showModal(); document.documentElement.classList.add('modal-open');
    renderEditor(); $('#closeEditor').focus();
  });
  $('#closeEditor').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => { clearTimeout(renderTimer); render(); document.documentElement.classList.remove('modal-open', 'editing'); opener?.focus({ preventScroll: true }); });
  const tabs = $$('.editor-tabs [role=tab]');
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => { editorState.tab = b.dataset.tab; renderEditor(); });
    b.addEventListener('keydown', e => {
      if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      n.click(); n.focus();
    });
  });
  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: 'data.json' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast('data.json exportado');
  });
  $('#importFile').addEventListener('change', async e => {
    try {
      const parsed = JSON.parse(await e.target.files[0].text());
      if (!validate(parsed)) throw new Error('invalid');
      structural(() => { data = normalize(parsed); editorState.si = editorState.mi = 0; });
      toast('Contenido importado');
    } catch { toast('El archivo no tiene el formato de data.json'); }
    e.target.value = '';
  });
  $('#resetBtn').addEventListener('click', async () => {
    if (!confirm('¿Descartar los cambios locales y cargar la versión publicada?')) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* sin acceso */ }
    hideLocalNotice();
    try { original = normalize(await fetchData()); } catch { /* conserva la copia cargada */ }
    data = clone(original); editorState.si = editorState.mi = 0;
    render(); renderEditor(); updateEditBadge();
    toast('Versión publicada restaurada');
  });
}

/* ---------- Inicio ---------- */
async function fetchData() {
  const res = await fetch('data.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
function initEditMode() {
  // El botón «Editar contenido» solo aparece al abrir el sitio con ?editar (queda recordado en este navegador).
  // Para ocultarlo otra vez: ?editar=0
  const params = new URLSearchParams(location.search);
  try {
    if (params.has('editar')) {
      if (params.get('editar') === '0') localStorage.removeItem('extracto-editor');
      else localStorage.setItem('extracto-editor', '1');
    }
    $('#editEntry').hidden = localStorage.getItem('extracto-editor') !== '1';
  } catch { $('#editEntry').hidden = !params.has('editar'); }
}
(async function init() {
  document.documentElement.classList.add('intro');
  setTimeout(() => document.documentElement.classList.remove('intro'), 3200);
  initNavigation();
  initLightbox();
  initEditor();
  initEditMode();
  initPresenter();
  initSearch();
  // Al imprimir o guardar como PDF: carga todas las imágenes y muestra todo el contenido.
  window.addEventListener('beforeprint', () => {
    $$('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
    $$('.reveal').forEach(el => el.classList.add('in-view'));
  });
  try {
    original = normalize(await fetchData());
  } catch {
    $('#main').replaceChildren(h('div', { class: 'load-error' }, [
      h('h1', { text: 'No se pudo cargar el manual' }),
      h('p', { text: 'Abrí el sitio desde GitHub Pages o desde un servidor local (por ejemplo, python -m http.server). Los navegadores bloquean data.json cuando se abre el archivo directamente.' })
    ]));
    return;
  }
  data = clone(original);
  let notice = null;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    const savedData = stored && stored.data ? stored.data : stored; // admite el formato anterior
    const base = stored && stored.data ? stored.base : null;
    if (validate(savedData)) {
      const local = normalize(savedData);
      if (fingerprint(local) === fingerprint(original)) localStorage.removeItem(STORAGE_KEY);
      else { data = local; notice = base === fingerprint(original) ? 'local' : 'outdated'; }
    }
  } catch { /* datos locales dañados: se usa la versión publicada */ }
  render();
  if (notice) showLocalNotice(notice === 'outdated');
  onScroll();
  if (location.hash) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
  document.fonts?.ready.then(() => { measureHeader(); onScroll(); });
})();
