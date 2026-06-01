import {
  decodeDocumentFromHtml,
  isBlogDocumentHtml,
  sanitizeHtml,
} from './blogDocument';
import './editorStyles.css';

const pct = (value, total) => `${(Number(value || 0) / Math.max(Number(total || 1), 1)) * 100}%`;

const fontSize = (size, docWidth) => {
  const max = Number(size || 18);
  const vw = Math.min(9.6, Math.max(0.8, (max / Math.max(Number(docWidth || 1000), 1)) * 100));
  return `clamp(11px, ${vw}vw, ${max}px)`;
};

const BlogContentRenderer = ({ content = '', className = '' }) => {
  if (!content) return null;

  if (!isBlogDocumentHtml(content)) {
    return (
      <div
        className={`saas-blog-renderer saas-blog-fallback ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
      />
    );
  }

  const doc = decodeDocumentFromHtml(content);

  const renderElement = (element, parentWidth, parentHeight) => {
    const children = doc.elements
      .filter((item) => (item.parentId || null) === element.id)
      .sort((a, b) => a.z - b.z);
    const common = {
      position: 'absolute',
      left: pct(element.x, parentWidth),
      top: pct(element.y, parentHeight),
      width: pct(element.w, parentWidth),
      height: pct(element.h, parentHeight),
      zIndex: element.z,
      opacity: element.opacity,
      boxSizing: 'border-box',
    };

    if (element.type === 'image') {
      return (
        <div
          key={element.id}
          style={{
            ...common,
            overflow: 'hidden',
            borderRadius: element.radius,
            background: element.background,
          }}
        >
          <img
            src={element.src}
            alt={element.alt || ''}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: element.fit, borderRadius: 'inherit' }}
          />
        </div>
      );
    }

    return (
      <div
        key={element.id}
        style={{
          ...common,
          overflow: 'hidden',
          fontFamily: element.fontFamily,
          fontSize: fontSize(element.fontSize, doc.width),
          color: element.color,
          background: element.background,
          border: `${element.borderWidth}px solid ${element.borderColor}`,
          borderRadius: element.radius,
          textAlign: element.textAlign,
          lineHeight: element.lineHeight,
        }}
      >
        <div
          className="saas-blog-text-content"
          style={{
            position: 'absolute',
            inset: 0,
            boxSizing: 'border-box',
            overflow: 'hidden',
            padding: element.padding,
          }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(element.html) }}
        />
        {children.map((child) => renderElement(child, element.w, element.h))}
      </div>
    );
  };

  const roots = doc.elements.filter((element) => !element.parentId).sort((a, b) => a.z - b.z);

  return (
    <div className={`saas-blog-renderer ${className}`}>
      <div
        className="saas-blog-document"
        data-saas-blog-document="true"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: doc.width,
          margin: '0 auto',
          background: doc.background,
          aspectRatio: `${doc.width} / ${doc.height}`,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {roots.map((element) => renderElement(element, doc.width, doc.height))}
      </div>
    </div>
  );
};

export default BlogContentRenderer;
