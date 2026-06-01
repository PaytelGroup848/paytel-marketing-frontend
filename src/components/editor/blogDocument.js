const DOCUMENT_VERSION = 3;
const DEFAULT_WIDTH = 1000;
const DEFAULT_HEIGHT = 1200;

const number = (value, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const escapeAttr = (value = '') => escapeHtml(value).replace(/`/g, '&#096;');

const safeColor = (value, fallback) => {
  if (typeof value !== 'string') return fallback;
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return value;
  if (/^rgba?\([\d\s.,%]+\)$/i.test(value)) return value;
  if (/^transparent$/i.test(value)) return 'transparent';
  return fallback;
};

const safeFont = (value) => {
  if (!value) return 'Inter, Arial, sans-serif';
  return String(value).replace(/[;"<>]/g, '').slice(0, 80);
};

export const createId = () => `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

export const sanitizeHtml = (html = '') => {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '');
};

export const createBlankDocument = () => ({
  version: DOCUMENT_VERSION,
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  background: '#ffffff',
  elements: [],
});

export const canContainChildren = (element) => Boolean(element && (element.type === 'text' || element.type === 'html'));

export const normalizeElement = (element = {}, index = 0) => {
  const type = ['text', 'image', 'html'].includes(element.type) ? element.type : 'text';
  const base = {
    id: element.id || createId(),
    parentId: element.parentId || null,
    type,
    x: Math.max(0, Math.round(number(element.x, 64))),
    y: Math.max(0, Math.round(number(element.y, 64))),
    w: Math.max(24, Math.round(number(element.w, type === 'image' ? 360 : 420))),
    h: Math.max(24, Math.round(number(element.h, type === 'image' ? 240 : 180))),
    z: Math.round(number(element.z, index + 1)),
    opacity: clamp(number(element.opacity, 1), 0.1, 1),
    radius: clamp(number(element.radius, 8), 0, 80),
    locked: Boolean(element.locked),
  };

  if (type === 'image') {
    return {
      ...base,
      src: element.src || '',
      alt: element.alt || '',
      fit: ['cover', 'contain', 'fill'].includes(element.fit) ? element.fit : 'contain',
      background: safeColor(element.background, 'transparent'),
    };
  }

  return {
    ...base,
    html: sanitizeHtml(element.html || '<p></p>'),
    fontFamily: safeFont(element.fontFamily),
    fontSize: clamp(number(element.fontSize, 18), 8, 96),
    color: safeColor(element.color, '#111827'),
    background: safeColor(element.background, type === 'html' ? '#ffffff' : 'rgba(255,255,255,0.92)'),
    borderColor: safeColor(element.borderColor, '#d1d5db'),
    borderWidth: clamp(number(element.borderWidth, 1), 0, 12),
    padding: clamp(number(element.padding, 14), 0, 80),
    lineHeight: clamp(number(element.lineHeight, 1.55), 0.9, 3),
    textAlign: ['left', 'center', 'right', 'justify'].includes(element.textAlign) ? element.textAlign : 'left',
  };
};

export const normalizeDocument = (document = {}) => {
  const doc = {
    version: DOCUMENT_VERSION,
    width: Math.max(640, Math.round(number(document.width, DEFAULT_WIDTH))),
    height: Math.max(420, Math.round(number(document.height, DEFAULT_HEIGHT))),
    background: safeColor(document.background, '#ffffff'),
    elements: Array.isArray(document.elements) ? document.elements.map(normalizeElement) : [],
  };

  const ids = new Set(doc.elements.map((element) => element.id));
  doc.elements = doc.elements.map((element) => ({
    ...element,
    parentId: element.parentId && ids.has(element.parentId) ? element.parentId : null,
  }));

  const rootBottom = doc.elements
    .filter((element) => !element.parentId)
    .reduce((bottom, element) => Math.max(bottom, element.y + element.h + 80), doc.height);

  doc.height = Math.max(doc.height, Math.ceil(rootBottom));
  return doc;
};

export const decodeDocumentFromHtml = (html = '') => {
  if (!html || !String(html).trim()) return createBlankDocument();

  const source = String(html);
  const match = source.match(/data-saas-blog-json="([^"]+)"/i);
  if (match?.[1]) {
    try {
      return normalizeDocument(JSON.parse(decodeURIComponent(match[1])));
    } catch {
      return createBlankDocument();
    }
  }

  const legacyText = sanitizeHtml(source);
  const doc = createBlankDocument();
  doc.elements = [
    normalizeElement({
      id: createId(),
      type: 'text',
      x: 64,
      y: 64,
      w: DEFAULT_WIDTH - 128,
      h: 520,
      z: 1,
      html: legacyText,
      background: 'transparent',
      borderWidth: 0,
      padding: 0,
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: 18,
      lineHeight: 1.75,
    }),
  ];
  return normalizeDocument(doc);
};

export const isBlogDocumentHtml = (html = '') => /data-saas-blog-document="true"/i.test(String(html));

const pct = (value, total) => `${clamp((number(value, 0) / Math.max(number(total, 1), 1)) * 100, 0, 100)}%`;

const responsiveFontSize = (size, docWidth) => {
  const max = clamp(number(size, 18), 8, 96);
  const vw = clamp((max / Math.max(number(docWidth, DEFAULT_WIDTH), 1)) * 100, 0.8, 9.6);
  return `clamp(11px, ${vw}vw, ${max}px)`;
};

const inlineCommonStyle = (element, parentWidth, parentHeight) =>
  [
    'position:absolute',
    `left:${pct(element.x, parentWidth)}`,
    `top:${pct(element.y, parentHeight)}`,
    `width:${pct(element.w, parentWidth)}`,
    `height:${pct(element.h, parentHeight)}`,
    `z-index:${Math.max(1, Math.round(number(element.z, 1)))}`,
    `opacity:${clamp(number(element.opacity, 1), 0.1, 1)}`,
    'box-sizing:border-box',
  ].join(';');

const renderChildren = (doc, parentId, parentWidth, parentHeight) =>
  doc.elements
    .filter((element) => (element.parentId || null) === (parentId || null))
    .sort((a, b) => a.z - b.z)
    .map((element) => renderStaticElement(doc, element, parentWidth, parentHeight))
    .join('');

const renderStaticElement = (doc, element, parentWidth, parentHeight) => {
  const common = inlineCommonStyle(element, parentWidth, parentHeight);
  const childHtml = renderChildren(doc, element.id, element.w, element.h);

  if (element.type === 'image') {
    return `<div data-saas-element="${escapeAttr(element.id)}" data-type="image" style="${common};overflow:hidden;border-radius:${number(element.radius, 8)}px;background:${element.background};"><img src="${escapeAttr(element.src)}" alt="${escapeAttr(element.alt || '')}" style="display:block;width:100%;height:100%;object-fit:${element.fit};border-radius:inherit;" /></div>`;
  }

  const textStyle = [
    common,
    `font-family:${element.fontFamily}`,
    `font-size:${responsiveFontSize(element.fontSize, doc.width)}`,
    `color:${element.color}`,
    `background:${element.background}`,
    `border:${number(element.borderWidth, 1)}px solid ${element.borderColor}`,
    `border-radius:${number(element.radius, 8)}px`,
    `text-align:${element.textAlign}`,
    `line-height:${number(element.lineHeight, 1.55)}`,
    'overflow:hidden',
  ].join(';');
  const innerStyle = `position:absolute;inset:0;box-sizing:border-box;padding:${number(element.padding, 14)}px;overflow:hidden;`;
  return `<div data-saas-element="${escapeAttr(element.id)}" data-type="${element.type}" style="${textStyle}"><div class="saas-blog-text-content" style="${innerStyle}">${sanitizeHtml(element.html)}</div>${childHtml}</div>`;
};

export const serializeBlogDocument = (document = {}) => {
  const doc = normalizeDocument(document);
  const encoded = encodeURIComponent(JSON.stringify(doc));
  const body = renderChildren(doc, null, doc.width, doc.height);
  return `<div class="saas-blog-document" data-saas-blog-document="true" data-saas-blog-version="${DOCUMENT_VERSION}" data-saas-blog-json="${escapeAttr(encoded)}" style="position:relative;width:100%;max-width:${doc.width}px;margin:0 auto;background:${doc.background};aspect-ratio:${doc.width}/${doc.height};overflow:hidden;box-sizing:border-box;">${body}</div>`;
};

export const getElementBounds = (doc, parentId = null) => {
  if (!parentId) return { width: doc.width, height: doc.height };
  const parent = doc.elements.find((element) => element.id === parentId);
  return { width: parent?.w || doc.width, height: parent?.h || doc.height };
};

export const removeElementTree = (elements, id) => {
  const removeIds = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    elements.forEach((element) => {
      if (element.parentId && removeIds.has(element.parentId) && !removeIds.has(element.id)) {
        removeIds.add(element.id);
        changed = true;
      }
    });
  }
  return elements.filter((element) => !removeIds.has(element.id));
};
