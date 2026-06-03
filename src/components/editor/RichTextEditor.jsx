import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  BringToFront,
  Code,
  Copy,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Layers,
  Link as LinkIcon,
  List,
  ListOrdered,
  Lock,
  Move,
  Quote,
  SendToBack,
  Settings,
  Strikethrough,
  Trash2,
  Type,
  Underline,
  Unlock,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../Services/api';
import {
  canContainChildren,
  createId,
  decodeDocumentFromHtml,
  getElementBounds,
  normalizeDocument,
  normalizeElement,
  removeElementTree,
  sanitizeHtml,
  serializeBlogDocument,
} from './blogDocument';
import './editorStyles.css';

const FONTS = [
  'Inter, Arial, sans-serif',
  'Georgia, Times New Roman, serif',
  'Lora, Georgia, serif',
  'Merriweather, Georgia, serif',
  'Playfair Display, Georgia, serif',
  'DM Sans, Arial, sans-serif',
  'Montserrat, Arial, sans-serif',
  'Source Code Pro, Consolas, monospace',
];

const RESIZE_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const MIN_SIZE = { text: { w: 96, h: 56 }, html: { w: 96, h: 56 }, image: { w: 48, h: 40 } };

const ToolbarButton = ({ icon: Icon, label, active, disabled, onClick, onMouseDown, title, primary }) => (
  <button
    type="button"
    className={`saas-editor-tool ${active ? 'is-active' : ''} ${primary ? 'is-primary' : ''}`}
    disabled={disabled}
    onClick={onClick}
    onMouseDown={onMouseDown}
    title={title || label}
  >
    {Icon && <Icon size={15} />}
    {label && <span>{label}</span>}
  </button>
);

const Field = ({ label, children }) => (
  <div className="saas-editor-field">
    <label>{label}</label>
    {children}
  </div>
);

const parseNumberInput = (value, fallback) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const colorInputValue = (value, fallback = '#ffffff') => (/^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback);

const isTypingTarget = (target) =>
  Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));

const EditableSurface = ({ element, selected, onFocus, onHtmlChange }) => {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (document.activeElement === node) return;
    const nextHtml = element.html || '<p></p>';
    if (node.innerHTML !== nextHtml) node.innerHTML = nextHtml;
  }, [element.id, element.html]);

  return (
    <div
      ref={ref}
      data-editable-id={element.id}
      className="saas-editor-editable"
      contentEditable={!element.locked}
      suppressContentEditableWarning
      onFocus={onFocus}
      onInput={(event) => onHtmlChange(element.id, sanitizeHtml(event.currentTarget.innerHTML))}
      style={{
        padding: `${element.padding}px`,
        fontFamily: element.fontFamily,
        fontSize: `${element.fontSize}px`,
        color: element.color,
        textAlign: element.textAlign,
        lineHeight: element.lineHeight,
        caretColor: selected ? '#2563eb' : 'auto',
      }}
    />
  );
};

const cloneElementTree = (elements, rootId, parentId, dx = 24, dy = 24) => {
  const descendants = [];
  const collect = (id) => {
    elements.forEach((element) => {
      if (element.id === id || element.parentId === id) {
        if (!descendants.find((item) => item.id === element.id)) descendants.push(element);
        if (element.parentId === id) collect(element.id);
      }
    });
  };
  collect(rootId);

  const idMap = new Map(descendants.map((element) => [element.id, createId()]));
  return descendants.map((element) => ({
    ...element,
    id: idMap.get(element.id),
    parentId: element.id === rootId ? parentId : idMap.get(element.parentId),
    x: element.id === rootId ? element.x + dx : element.x,
    y: element.id === rootId ? element.y + dy : element.y,
    z: element.z + 1,
  }));
};

const RichTextEditor = ({ content = '', onChange, uploadEndpoint = '/upload-blog-image' }) => {
  const [doc, setDoc] = useState(() => decodeDocumentFromHtml(content));
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(0.86);
  const [dragState, setDragState] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [inspectorPos, setInspectorPos] = useState({ x: 24, y: 116 });
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const docRef = useRef(doc);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const pendingFocusRef = useRef(null);
  const lastEmittedRef = useRef('');
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const savedRange = useRef(null);
  // ========== FIX: prevent infinite loop ==========
  const lastExternalContentRef = useRef(content);
  const isInternalChange = useRef(false);

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  // Sync external content only when it truly comes from outside
  useEffect(() => {
    if (typeof content !== 'string') return;
    if (content === lastEmittedRef.current) return;
    // If the change originated from inside the editor, ignore the sync
    if (isInternalChange.current) return;
    setDoc(decodeDocumentFromHtml(content));
    pastRef.current = [];
    futureRef.current = [];
    lastExternalContentRef.current = content;
  }, [content]);

  // When doc changes, emit serialized content (mark as internal change)
  useEffect(() => {
    const serialized = serializeBlogDocument(doc);
    lastEmittedRef.current = serialized;
    isInternalChange.current = true;
    onChange?.(serialized);
    // Reset the flag after a microtask
    const timer = setTimeout(() => { isInternalChange.current = false; }, 0);
    return () => clearTimeout(timer);
  }, [doc, onChange]);

  useEffect(() => {
    if (!pendingFocusRef.current) return;
    const id = pendingFocusRef.current;
    pendingFocusRef.current = null;
    window.setTimeout(() => {
      const node = document.querySelector(`[data-editable-id="${id}"]`);
      node?.focus();
    }, 0);
  }, [doc]);

  const selected = useMemo(() => doc.elements.find((el) => el.id === selectedId) || null, [doc.elements, selectedId]);
  const selectedCanContain = canContainChildren(selected);

  const commitDoc = useCallback((updater, { history = true } = {}) => {
    setDoc((prev) => {
      const raw = typeof updater === 'function' ? updater(prev) : updater;
      const next = normalizeDocument(raw);
      if (history) {
        pastRef.current = [...pastRef.current.slice(-49), prev];
        futureRef.current = [];
      }
      return next;
    });
  }, []);

  const updateElement = useCallback((id, patch, options) => {
    commitDoc((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === id ? normalizeElement({ ...el, ...patch }) : el)),
    }), options);
  }, [commitDoc]);

  const deleteElement = useCallback((id = selectedId) => {
    if (!id) return;
    commitDoc((prev) => ({ ...prev, elements: removeElementTree(prev.elements, id) }));
    setSelectedId(null);
  }, [commitDoc, selectedId]);

  const duplicateElement = useCallback((id = selectedId) => {
    if (!id) return;
    const current = docRef.current;
    const source = current.elements.find((el) => el.id === id);
    if (!source) return;
    const clones = cloneElementTree(current.elements, id, source.parentId);
    commitDoc((prev) => ({ ...prev, elements: [...prev.elements, ...clones] }));
    setSelectedId(clones[0]?.id || null);
  }, [commitDoc, selectedId]);

  const reorderElement = useCallback((direction) => {
    if (!selectedId) return;
    commitDoc((prev) => {
      const siblings = prev.elements.filter((el) => {
        const sel = prev.elements.find((item) => item.id === selectedId);
        return sel && (el.parentId || null) === (sel.parentId || null);
      });
      const minZ = Math.min(...siblings.map((el) => el.z), 1);
      const maxZ = Math.max(...siblings.map((el) => el.z), 1);
      return {
        ...prev,
        elements: prev.elements.map((el) =>
          el.id === selectedId ? { ...el, z: direction === 'front' ? maxZ + 1 : Math.max(1, minZ - 1) } : el
        ),
      };
    });
  }, [commitDoc, selectedId]);

  const undo = useCallback(() => {
    const previous = pastRef.current.pop();
    if (!previous) return;
    futureRef.current.push(docRef.current);
    setDoc(previous);
  }, []);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(docRef.current);
    setDoc(next);
  }, []);

  const addElement = useCallback((type, options = {}) => {
    const current = docRef.current;
    const parentId = options.parentId === undefined ? (selectedCanContain ? selectedId : null) : options.parentId;
    const bounds = getElementBounds(current, parentId);
    const defaultW = type === 'image' ? 360 : 420;
    const defaultH = type === 'image' ? 240 : 180;
    const x = Math.max(0, Math.min(options.x ?? 36, Math.max(0, bounds.width - defaultW - 12)));
    const y = Math.max(0, Math.min(options.y ?? 36, Math.max(0, bounds.height - defaultH - 12)));
    const maxZ = current.elements
      .filter((el) => (el.parentId || null) === (parentId || null))
      .reduce((val, el) => Math.max(val, el.z), 0);
    const element = normalizeElement({
      id: createId(),
      parentId,
      type,
      x,
      y,
      w: Math.min(defaultW, Math.max(96, bounds.width - x - 16)),
      h: Math.min(defaultH, Math.max(56, bounds.height - y - 16)),
      z: maxZ + 1,
      html: type === 'html' ? options.html || '<p><strong>HTML block</strong></p>' : options.html || '<p>Write here...</p>',
      src: options.src || '',
      alt: options.alt || '',
      background: type === 'html' ? '#ffffff' : undefined,
      borderWidth: type === 'html' ? 0 : undefined,
    });
    commitDoc((prev) => ({ ...prev, elements: [...prev.elements, element] }));
    setSelectedId(element.id);
    if (type !== 'image') pendingFocusRef.current = element.id;
    return element.id;
  }, [commitDoc, selectedCanContain, selectedId]);

  const addTextAtCanvasPoint = useCallback((clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.round((clientX - rect.left) / zoom);
    const y = Math.round((clientY - rect.top) / zoom);
    addElement('text', { parentId: null, x: Math.max(0, x), y: Math.max(0, y), html: '<p></p>' });
  }, [addElement, zoom]);

  const uploadImage = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('images', file);
    const { data } = await api.post(uploadEndpoint, formData);
    return data?.urls?.[0] || data?.url || data?.imageUrl;
  }, [uploadEndpoint]);

  const addImage = useCallback((src, forceNew = false) => {
    if (!src) return;
    const currentSelected = docRef.current.elements.find((el) => el.id === selectedId);
    if (currentSelected?.type === 'image' && !forceNew) {
      updateElement(currentSelected.id, { src });
      return;
    }
    addElement('image', { src, parentId: canContainChildren(currentSelected) ? currentSelected.id : null });
  }, [addElement, selectedId, updateElement]);

  const handleFiles = useCallback(async (files) => {
    const images = [...files].filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    setUploading(true);
    try {
      for (const img of images) {
        const url = await uploadImage(img);
        if (url) addImage(url, images.length > 1);
      }
      toast.success(`${images.length} image${images.length > 1 ? 's' : ''} uploaded`);
    } catch {
      toast.error('Image upload failed');
    } finally {
      setUploading(false);
    }
  }, [addImage, uploadImage]);

  const syncFocusedEditable = useCallback(() => {
    window.setTimeout(() => {
      const active = document.activeElement;
      const id = active?.getAttribute?.('data-editable-id');
      if (id) updateElement(id, { html: sanitizeHtml(active.innerHTML) }, { history: false });
    }, 0);
  }, [updateElement]);

  const exec = useCallback((command, value = null) => {
    document.execCommand(command, false, value);
    syncFocusedEditable();
  }, [syncFocusedEditable]);

  const setAlignment = useCallback((align) => {
    const cmdMap = {
      left: 'justifyLeft',
      center: 'justifyCenter',
      right: 'justifyRight',
      justify: 'justifyFull',
    };
    const cmd = cmdMap[align];
    if (cmd && document.activeElement?.getAttribute?.('data-editable-id')) exec(cmd);
    if (selected && selected.type !== 'image') updateElement(selected.id, { textAlign: align });
  }, [exec, selected, updateElement]);

  // Formatting handlers
  const handleBold = (e) => { e.preventDefault(); exec('bold'); };
  const handleItalic = (e) => { e.preventDefault(); exec('italic'); };
  const handleUnderline = (e) => { e.preventDefault(); exec('underline'); };
  const handleStrikethrough = (e) => { e.preventDefault(); exec('strikeThrough'); };
  const handleH1 = (e) => { e.preventDefault(); exec('formatBlock', '<h1>'); };
  const handleH2 = (e) => { e.preventDefault(); exec('formatBlock', '<h2>'); };
  const handleH3 = (e) => { e.preventDefault(); exec('formatBlock', '<h3>'); };
  const handleQuote = (e) => { e.preventDefault(); exec('formatBlock', '<blockquote>'); };
  const handleBulletList = (e) => { e.preventDefault(); exec('insertUnorderedList'); };
  const handleOrderedList = (e) => { e.preventDefault(); exec('insertOrderedList'); };
  const handleLinkMouseDown = useCallback((e) => {
    e.preventDefault();
    const sel = window.getSelection();
    if (sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0);
    setTimeout(() => {
      const url = window.prompt('Link URL');
      if (url) {
        const sel = window.getSelection();
        if (savedRange.current) {
          sel.removeAllRanges();
          sel.addRange(savedRange.current);
        }
        exec('createLink', url);
      }
      savedRange.current = null;
    }, 0);
  }, [exec]);
  const handleAlignLeft = (e) => { e.preventDefault(); setAlignment('left'); };
  const handleAlignCenter = (e) => { e.preventDefault(); setAlignment('center'); };
  const handleAlignRight = (e) => { e.preventDefault(); setAlignment('right'); };
  const handleAlignJustify = (e) => { e.preventDefault(); setAlignment('justify'); };

  // Canvas events
  const onCanvasDoubleClick = (event) => {
    if (event.target.closest('[data-editor-element]')) return;
    event.preventDefault();
    addTextAtCanvasPoint(event.clientX, event.clientY);
  };
  const onCanvasPointerDown = (event) => {
    if (event.target === canvasRef.current) setSelectedId(null);
  };
  const startPointerAction = (event, element, action, handle = '') => {
    if (element.locked) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(element.id);
    setDragState({
      action, handle, id: element.id, beforeDoc: docRef.current,
      startX: event.clientX, startY: event.clientY,
      original: { x: element.x, y: element.y, w: element.w, h: element.h },
      parentBounds: getElementBounds(docRef.current, element.parentId),
      type: element.type,
    });
  };

  useEffect(() => {
    if (!dragState) return;
    const onMove = (event) => {
      const dx = (event.clientX - dragState.startX) / zoom;
      const dy = (event.clientY - dragState.startY) / zoom;
      const min = MIN_SIZE[dragState.type] || MIN_SIZE.text;
      const parentW = dragState.parentBounds.width;
      const parentH = dragState.parentBounds.height;
      let { x, y, w, h } = dragState.original;
      if (dragState.action === 'move') {
        x = Math.round(Math.max(0, Math.min(parentW - Math.min(w, parentW), dragState.original.x + dx)));
        y = Math.round(Math.max(0, Math.min(parentH - Math.min(h, parentH), dragState.original.y + dy)));
      } else {
        if (dragState.handle.includes('e')) w = dragState.original.w + dx;
        if (dragState.handle.includes('s')) h = dragState.original.h + dy;
        if (dragState.handle.includes('w')) { x = dragState.original.x + dx; w = dragState.original.w - dx; }
        if (dragState.handle.includes('n')) { y = dragState.original.y + dy; h = dragState.original.h - dy; }
        if (w < min.w) { if (dragState.handle.includes('w')) x -= min.w - w; w = min.w; }
        if (h < min.h) { if (dragState.handle.includes('n')) y -= min.h - h; h = min.h; }
        if (x < 0) { w += x; x = 0; }
        if (y < 0) { h += y; y = 0; }
        if (x + w > parentW) w = parentW - x;
        if (y + h > parentH) h = parentH - y;
        x = Math.round(x); y = Math.round(y); w = Math.round(Math.max(min.w, w)); h = Math.round(Math.max(min.h, h));
      }
      updateElement(dragState.id, { x, y, w, h }, { history: false });
    };
    const onUp = () => {
      setDragState(null);
      pastRef.current = [...pastRef.current.slice(-49), dragState.beforeDoc];
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragState, updateElement, zoom]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (isTypingTarget(event.target)) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicateElement();
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedId) { event.preventDefault(); deleteElement(); }
      }
      if (event.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteElement, duplicateElement, redo, selectedId, undo]);

  const startInspectorDragFixed = (event) => {
    event.preventDefault();
    const origin = { clientX: event.clientX, clientY: event.clientY, x: inspectorPos.x, y: inspectorPos.y };
    const onMove = (moveEvent) => {
      setInspectorPos({
        x: Math.max(8, Math.min(window.innerWidth - 330, origin.x + moveEvent.clientX - origin.clientX)),
        y: Math.max(8, Math.min(window.innerHeight - 80, origin.y + moveEvent.clientY - origin.clientY)),
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const renderElement = (element) => {
    const children = doc.elements.filter((item) => (item.parentId || null) === element.id).sort((a, b) => a.z - b.z);
    const selectedElement = selectedId === element.id;
    const commonStyle = {
      left: `${element.x}px`,
      top: `${element.y}px`,
      width: `${element.w}px`,
      height: `${element.h}px`,
      zIndex: element.z,
      opacity: element.opacity,
    };
    return (
      <div
        key={element.id}
        data-editor-element
        data-element-id={element.id}
        className={`saas-editor-element ${selectedElement ? 'is-selected' : ''} ${element.locked ? 'is-locked' : ''}`}
        style={commonStyle}
        onPointerDown={(event) => { event.stopPropagation(); setSelectedId(element.id); }}
      >
        {selectedElement && (
          <div className="saas-editor-minibar" contentEditable={false}>
            <button type="button" className="saas-editor-mini-button" title="Move" onPointerDown={(event) => startPointerAction(event, element, 'move')}><Move size={13} /></button>
            <button type="button" className="saas-editor-mini-button" title="Duplicate" onClick={() => duplicateElement(element.id)}><Copy size={13} /></button>
            <button type="button" className="saas-editor-mini-button" title={element.locked ? 'Unlock' : 'Lock'} onClick={() => updateElement(element.id, { locked: !element.locked })}>
              {element.locked ? <Unlock size={13} /> : <Lock size={13} />}
            </button>
            <button type="button" className="saas-editor-mini-button" title="Delete" onClick={() => deleteElement(element.id)}><Trash2 size={13} /></button>
          </div>
        )}
        {element.type === 'image' ? (
          <div className="saas-editor-image-wrap" style={{ borderRadius: `${element.radius}px`, background: element.background }}>
            {element.src ? <img src={element.src} alt={element.alt || ''} style={{ objectFit: element.fit }} draggable={false} /> : <div className="saas-editor-placeholder">Upload or paste an image URL</div>}
          </div>
        ) : (
          <div className={element.type === 'html' ? 'saas-editor-html' : 'saas-editor-text'} style={{ background: element.background, border: `${element.borderWidth}px solid ${element.borderColor}`, borderRadius: `${element.radius}px` }}>
            <EditableSurface element={element} selected={selectedElement} onFocus={() => setSelectedId(element.id)} onHtmlChange={(id, html) => updateElement(id, { html }, { history: false })} />
            {children.map(renderElement)}
          </div>
        )}
        {selectedElement && !element.locked && RESIZE_HANDLES.map((handle) => (
          <span key={handle} className={`saas-editor-resize-handle ${handle}`} onPointerDown={(event) => startPointerAction(event, element, 'resize', handle)} />
        ))}
      </div>
    );
  };

  const rootElements = doc.elements.filter((el) => !el.parentId).sort((a, b) => a.z - b.z);
  const canEditText = selected && selected.type !== 'image';

  return (
    <div className="saas-editor-shell">
      <div className="saas-editor-toolbar">
        <ToolbarButton icon={Type} label="Text" primary onClick={() => addElement('text', { parentId: null })} title="Add text box" />
        <ToolbarButton icon={Type} label="Nested" disabled={!selectedCanContain} onClick={() => addElement('text')} title="Add text box inside selected box" />
        <ToolbarButton icon={Code} label="HTML" onClick={() => {
          const html = window.prompt('Paste HTML for this block:', '<p><strong>Custom HTML</strong></p>');
          if (html) addElement('html', { html: sanitizeHtml(html), parentId: selectedCanContain ? selectedId : null });
        }} title="Add editable HTML block" />
        <ToolbarButton icon={Upload} label={uploading ? 'Uploading' : 'Image'} disabled={uploading} onClick={() => fileRef.current?.click()} title="Upload image" />
        <ToolbarButton icon={ImageIcon} label="URL" onClick={() => { const url = window.prompt('Image URL'); if (url) addImage(url, true); }} title="Add image by URL" />
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(event) => { const files = [...(event.target.files || [])]; event.target.value = ''; handleFiles(files); }} />

        <span className="saas-editor-divider" />
        <ToolbarButton icon={Bold} onMouseDown={handleBold} title="Bold" />
        <ToolbarButton icon={Italic} onMouseDown={handleItalic} title="Italic" />
        <ToolbarButton icon={Underline} onMouseDown={handleUnderline} title="Underline" />
        <ToolbarButton icon={Strikethrough} onMouseDown={handleStrikethrough} title="Strikethrough" />
        <ToolbarButton icon={Heading1} onMouseDown={handleH1} title="Heading 1" />
        <ToolbarButton icon={Heading2} onMouseDown={handleH2} title="Heading 2" />
        <ToolbarButton icon={Heading3} onMouseDown={handleH3} title="Heading 3" />
        <ToolbarButton icon={Quote} onMouseDown={handleQuote} title="Quote" />
        <ToolbarButton icon={List} onMouseDown={handleBulletList} title="Bullet list" />
        <ToolbarButton icon={ListOrdered} onMouseDown={handleOrderedList} title="Numbered list" />
        <ToolbarButton icon={LinkIcon} onMouseDown={handleLinkMouseDown} title="Link" />

        <span className="saas-editor-divider" />
        <ToolbarButton icon={AlignLeft} active={selected?.textAlign === 'left'} onMouseDown={handleAlignLeft} title="Align left" />
        <ToolbarButton icon={AlignCenter} active={selected?.textAlign === 'center'} onMouseDown={handleAlignCenter} title="Align center" />
        <ToolbarButton icon={AlignRight} active={selected?.textAlign === 'right'} onMouseDown={handleAlignRight} title="Align right" />
        <ToolbarButton icon={AlignJustify} active={selected?.textAlign === 'justify'} onMouseDown={handleAlignJustify} title="Justify" />

        <select className="saas-editor-select" value={canEditText ? selected.fontFamily : FONTS[0]} disabled={!canEditText} onChange={(e) => updateElement(selected.id, { fontFamily: e.target.value })} title="Font family">
          {FONTS.map((font) => <option key={font} value={font}>{font.split(',')[0]}</option>)}
        </select>
        <input className="saas-editor-input" type="number" min="8" max="96" value={canEditText ? selected.fontSize : 18} disabled={!canEditText} onChange={(e) => updateElement(selected.id, { fontSize: parseNumberInput(e.target.value, selected.fontSize) })} title="Font size" />
        <input className="saas-editor-color" type="color" value={canEditText ? selected.color : '#111827'} disabled={!canEditText} onChange={(e) => updateElement(selected.id, { color: e.target.value })} title="Text color" />

        <span className="saas-editor-divider" />
        <ToolbarButton icon={BringToFront} disabled={!selected} onClick={() => reorderElement('front')} title="Bring to front" />
        <ToolbarButton icon={SendToBack} disabled={!selected} onClick={() => reorderElement('back')} title="Send to back" />
        <ToolbarButton icon={Copy} disabled={!selected} onClick={() => duplicateElement()} title="Duplicate" />
        <ToolbarButton icon={Trash2} disabled={!selected} onClick={() => deleteElement()} title="Delete" />

        <span className="saas-editor-divider" />
        <ToolbarButton icon={ZoomOut} onClick={() => setZoom((v) => Math.max(0.35, Number((v - 0.08).toFixed(2))))} title="Zoom out" />
        <span style={{ minWidth: 48, textAlign: 'center', fontSize: 12, color: '#475569' }}>{Math.round(zoom * 100)}%</span>
        <ToolbarButton icon={ZoomIn} onClick={() => setZoom((v) => Math.min(1.4, Number((v + 0.08).toFixed(2))))} title="Zoom in" />
        <ToolbarButton icon={Settings} active={inspectorOpen} onClick={() => setInspectorOpen((v) => !v)} title="Toggle draggable sidebar" />
      </div>

      <div className="saas-editor-workspace">
        <div className="saas-editor-stage-spacer" style={{ width: doc.width * zoom, height: doc.height * zoom }}>
          <div ref={canvasRef} className="saas-editor-canvas" style={{ width: doc.width, height: doc.height, background: doc.background, transform: `scale(${zoom})` }}
            onDoubleClick={onCanvasDoubleClick} onPointerDown={onCanvasPointerDown}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files || []); }} onDragOver={(e) => e.preventDefault()}>
            {rootElements.length === 0 && <div className="saas-editor-placeholder">Double click anywhere to start writing. Add images, text boxes, HTML blocks, and nested elements from the toolbar.</div>}
            {rootElements.map(renderElement)}
          </div>
        </div>
      </div>

      {inspectorOpen && (
        <div className="saas-editor-inspector" style={{ left: inspectorPos.x, top: inspectorPos.y }}>
          <div className="saas-editor-inspector-head" onPointerDown={startInspectorDragFixed}>
            <div className="saas-editor-inspector-title"><Settings size={14} />{selected ? `${selected.type} settings` : 'Document settings'}</div>
            <button type="button" className="saas-editor-mini-button" style={{ color: '#475569' }} onClick={() => setInspectorOpen(false)}>X</button>
          </div>
          <div className="saas-editor-inspector-body">
            {selected ? (
              <>
                <div className="saas-editor-actions">
                  <button type="button" className="saas-editor-action" onClick={() => duplicateElement()}><Copy size={13} />Duplicate</button>
                  <button type="button" className="saas-editor-action" onClick={() => reorderElement('front')}><Layers size={13} />Front</button>
                  <button type="button" className="saas-editor-action danger" onClick={() => deleteElement()}><Trash2 size={13} />Delete</button>
                </div>
                <div className="saas-editor-field-grid">
                  {['x', 'y', 'w', 'h'].map(field => (
                    <Field key={field} label={field.toUpperCase()}>
                      <input type="number" value={selected[field]} onChange={(e) => updateElement(selected.id, { [field]: parseNumberInput(e.target.value, selected[field]) })} />
                    </Field>
                  ))}
                </div>
                <div className="saas-editor-field-grid">
                  <Field label="Z index"><input type="number" value={selected.z} onChange={(e) => updateElement(selected.id, { z: parseNumberInput(e.target.value, selected.z) })} /></Field>
                  <Field label="Opacity"><input type="number" min="0.1" max="1" step="0.05" value={selected.opacity} onChange={(e) => updateElement(selected.id, { opacity: parseNumberInput(e.target.value, selected.opacity) })} /></Field>
                </div>
                <div className="saas-editor-field-grid">
                  <Field label="Radius"><input type="number" min="0" value={selected.radius} onChange={(e) => updateElement(selected.id, { radius: parseNumberInput(e.target.value, selected.radius) })} /></Field>
                  <Field label="Locked"><select value={selected.locked ? 'yes' : 'no'} onChange={(e) => updateElement(selected.id, { locked: e.target.value === 'yes' })}><option value="no">No</option><option value="yes">Yes</option></select></Field>
                </div>
                {selected.type === 'image' ? (
                  <>
                    <Field label="Image URL"><input value={selected.src} onChange={(e) => updateElement(selected.id, { src: e.target.value })} /></Field>
                    <Field label="Alt text"><input value={selected.alt || ''} onChange={(e) => updateElement(selected.id, { alt: e.target.value })} /></Field>
                    <div className="saas-editor-field-grid">
                      <Field label="Fit"><select value={selected.fit} onChange={(e) => updateElement(selected.id, { fit: e.target.value })}><option value="contain">Contain</option><option value="cover">Cover</option><option value="fill">Fill</option></select></Field>
                      <Field label="Background"><input type="color" value={colorInputValue(selected.background)} onChange={(e) => updateElement(selected.id, { background: e.target.value })} /></Field>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="saas-editor-field-grid">
                      <Field label="Font size"><input type="number" min="8" max="96" value={selected.fontSize} onChange={(e) => updateElement(selected.id, { fontSize: parseNumberInput(e.target.value, selected.fontSize) })} /></Field>
                      <Field label="Padding"><input type="number" min="0" value={selected.padding} onChange={(e) => updateElement(selected.id, { padding: parseNumberInput(e.target.value, selected.padding) })} /></Field>
                    </div>
                    <div className="saas-editor-field-grid">
                      <Field label="Text"><input type="color" value={selected.color} onChange={(e) => updateElement(selected.id, { color: e.target.value })} /></Field>
                      <Field label="Background"><input type="color" value={colorInputValue(selected.background)} onChange={(e) => updateElement(selected.id, { background: e.target.value })} /></Field>
                    </div>
                    <div className="saas-editor-field-grid">
                      <Field label="Border"><input type="number" min="0" value={selected.borderWidth} onChange={(e) => updateElement(selected.id, { borderWidth: parseNumberInput(e.target.value, selected.borderWidth) })} /></Field>
                      <Field label="Border color"><input type="color" value={selected.borderColor} onChange={(e) => updateElement(selected.id, { borderColor: e.target.value })} /></Field>
                    </div>
                    <Field label="Raw HTML"><textarea value={selected.html} onChange={(e) => updateElement(selected.id, { html: sanitizeHtml(e.target.value) })} /></Field>
                    <div className="saas-editor-actions">
                      <button type="button" className="saas-editor-action" onClick={() => addElement('text')}><Type size={13} />Nested text</button>
                      <button type="button" className="saas-editor-action" onClick={() => fileRef.current?.click()}><ImageIcon size={13} />Image inside</button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <p className="saas-editor-muted">Double click the page to create a text box at that exact point. Select any element to move, resize, layer, style, or nest items inside it.</p>
                <div className="saas-editor-field-grid">
                  <Field label="Width"><input type="number" value={doc.width} onChange={(e) => commitDoc((prev) => ({ ...prev, width: parseNumberInput(e.target.value, prev.width) }))} /></Field>
                  <Field label="Height"><input type="number" value={doc.height} onChange={(e) => commitDoc((prev) => ({ ...prev, height: parseNumberInput(e.target.value, prev.height) }))} /></Field>
                </div>
                <Field label="Page background"><input type="color" value={doc.background} onChange={(e) => commitDoc((prev) => ({ ...prev, background: e.target.value }))} /></Field>
                <div className="saas-editor-actions"><button type="button" className="saas-editor-action" onClick={undo}>Undo</button><button type="button" className="saas-editor-action" onClick={redo}>Redo</button></div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;