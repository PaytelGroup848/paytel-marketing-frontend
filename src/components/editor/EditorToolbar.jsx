import { useState, useRef } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Code, List, ListOrdered,
  Heading1, Heading2, Heading3, Undo, Redo, Image as ImageIcon,
  Crop, Minus, Quote, Code2, Link as LinkIcon, Highlighter,
  Type, Eraser, Square, Trash2, Upload, Palette, ChevronDown,
  AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';

const ToolBtn = ({ onClick, active = false, disabled = false, icon: Icon, title }) => (
  <button type="button" onClick={onClick} disabled={disabled}
    className={`flex items-center justify-center w-7 h-7 rounded-md transition-all flex-shrink-0 select-none
      ${active ? 'bg-slate-800 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}
      ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
    title={title}>
    <Icon size={13} strokeWidth={2.2} />
  </button>
);

const FONTS = ['Default', 'Lora', 'Playfair Display', 'Merriweather', 'Georgia', 'DM Sans', 'Montserrat', 'Source Code Pro'];
const FONT_SIZES = [10,11,12,13,14,15,16,18,20,22,24,28,32,36,42,48,56,64,72];

const EditorToolbar = ({ editor, onImageUpload, isDrawMode, setIsDrawMode, rectCount, onClearRects, onOpenCrop, wordCount, charCount }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [fontFamily, setFontFamily] = useState('Default');
  const [fontSize, setFontSize] = useState(15);
  const [showFontSize, setShowFontSize] = useState(false);

  if (!editor) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const url = await onImageUpload(file);
      if (url) editor.chain().focus().insertContent({ type: 'resizableImage', attrs: { src: url, width: 560, caption: '' } }).run();
    } finally { setUploading(false); }
  };

  const applyFont = (family) => {
    setFontFamily(family);
    if (family === 'Default') editor.chain().focus().unsetFontFamily().run();
    else editor.chain().focus().setFontFamily(family).run();
  };
  const applySize = (size) => {
    setFontSize(size);
    setShowFontSize(false);
    editor.chain().focus().setMark('textStyle', { fontSize: `${size}px` }).run();
  };
  const applyColor = (color) => {
    editor.chain().focus().setColor(color).run();
  };

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={Bold} title="Bold (⌘B)" />
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon={Italic} title="Italic (⌘I)" />
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} icon={Underline} title="Underline (⌘U)" />
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} icon={Strikethrough} title="Strikethrough" />
        <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} icon={Code} title="Inline code" />
        <span className="inline-block w-px h-5 bg-gray-200 mx-0.5" />
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} icon={Heading1} title="Heading 1" />
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} icon={Heading2} title="Heading 2" />
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} icon={Heading3} title="Heading 3" />
        <span className="inline-block w-px h-5 bg-gray-200 mx-0.5" />
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon={List} title="Bullet list" />
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} icon={ListOrdered} title="Numbered list" />
        <span className="inline-block w-px h-5 bg-gray-200 mx-0.5" />
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} icon={Quote} title="Blockquote" />
        <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} icon={Code2} title="Code block" />
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={Minus} title="Divider" />
        <span className="inline-block w-px h-5 bg-gray-200 mx-0.5" />
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} icon={AlignLeft} title="Align left" />
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} icon={AlignCenter} title="Align center" />
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} icon={AlignRight} title="Align right" />
        <span className="inline-block w-px h-5 bg-gray-200 mx-0.5" />
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} icon={Undo} title="Undo (⌘Z)" />
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} icon={Redo} title="Redo (⌘⇧Z)" />
        <ToolBtn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} icon={Eraser} title="Clear formatting" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2 pt-1 border-t border-gray-50">
        <select value={fontFamily} onChange={e => applyFont(e.target.value)} className="h-7 px-2 text-xs border rounded-lg bg-white">
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <div className="relative">
          <button onClick={() => setShowFontSize(v => !v)} className="h-7 w-16 flex justify-between items-center px-2 text-xs border rounded-lg bg-white">
            {fontSize}px <ChevronDown size={10} />
          </button>
          {showFontSize && (
            <div className="absolute top-8 left-0 z-50 bg-white border rounded-xl shadow-2xl py-1 w-24 max-h-52 overflow-y-auto">
              {FONT_SIZES.map(s => <button key={s} onClick={() => applySize(s)} className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-100">{s}px</button>)}
            </div>
          )}
        </div>
        <button onClick={() => applyColor('#000000')} className="w-7 h-7 rounded-md hover:bg-gray-100" title="Text color"><Palette size={13} /></button>
        <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={`w-7 h-7 rounded-md hover:bg-gray-100 ${editor.isActive('highlight') ? 'bg-gray-200' : ''}`} title="Highlight"><Highlighter size={13} /></button>
        <span className="inline-block w-px h-5 bg-gray-200 mx-0.5" />
        <ToolBtn onClick={() => { const url = prompt('Enter URL'); if (url) editor.chain().focus().setLink({ href: url }).run(); }} icon={LinkIcon} title="Insert link" />
        <button disabled={uploading} onClick={() => fileInputRef.current?.click()} className="h-7 px-2.5 text-xs flex items-center gap-1.5 bg-slate-800 text-white rounded-lg">
          {uploading ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload size={11} />}
          {uploading ? 'Uploading…' : 'Image'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <button onClick={() => { const url = prompt('Image URL'); if (url) editor.chain().focus().insertContent({ type: 'resizableImage', attrs: { src: url, width: 560 } }).run(); }} className="h-7 px-2.5 text-xs bg-gray-100 rounded-lg">URL</button>
        <ToolBtn onClick={onOpenCrop} icon={Crop} title="Crop selected image" />
        <span className="inline-block w-px h-5 bg-gray-200 mx-0.5" />
        <button onClick={() => setIsDrawMode(!isDrawMode)} className={`h-7 px-3 text-xs flex items-center gap-1 rounded-lg border ${isDrawMode ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-gray-300'}`}>
          <Square size={11} />{isDrawMode ? 'Drawing…' : 'Text Box'}
        </button>
        {rectCount > 0 && <button onClick={onClearRects} className="h-7 px-2.5 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg">Clear boxes ({rectCount})</button>}
        <div className="ml-auto text-[11px] text-gray-400">{wordCount} words · {charCount} chars</div>
      </div>
      {isDrawMode && <div className="bg-slate-800 text-white text-xs text-center py-1.5">Click + drag anywhere on canvas to draw a text box — <kbd>Esc</kbd> to exit</div>}
    </div>
  );
};

export default EditorToolbar;