import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowUp, Calendar, Clock, Folder, Link as LinkIcon, Loader2, MessageCircle, Send, Tag, User, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const parseMaybeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
};

const stripHtml = (html = '') => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const getReadingTime = (html = '') => {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
};

const getEmbedUrl = (url) => {
  if (!url) return null;
  if (url.includes('/embed/')) return url;
  let videoId = null;
  if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split('?')[0];
  if (url.includes('watch?v=')) videoId = url.split('watch?v=')[1]?.split('&')[0];
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
};

const normalizeEditorHtml = (html = '') => {
  if (!html || typeof window === 'undefined' || !window.DOMParser) return html || '';

  try {
    const doc = new window.DOMParser().parseFromString(`<main>${html}</main>`, 'text/html');
    const root = doc.body.firstElementChild;
    if (!root) return html;

    root.querySelectorAll('img[data-width], img[data-float-mode], img[data-align]').forEach((img) => {
      if (img.closest('[data-type="resizable-image"]')) return;
      const width = Number(img.getAttribute('data-width') || img.getAttribute('width') || 560);
      const shell = doc.createElement('span');
      shell.setAttribute('data-type', 'resizable-image');
      shell.setAttribute('data-width', String(width));
      shell.style.cssText = `display:inline-block;vertical-align:top;width:${width}px;max-width:100%;position:relative;margin:0 8px 8px 0;line-height:0;`;
      const clone = img.cloneNode(true);
      clone.removeAttribute('width');
      clone.style.cssText = 'display:block;width:100%;height:auto;border-radius:8px;';
      shell.appendChild(clone);
      img.replaceWith(shell);
    });

    return root.innerHTML;
  } catch {
    return html || '';
  }
};

const BlogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const contentRef = useRef(null);
  const [blog, setBlog] = useState(null);
  const [comments, setComments] = useState([]);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentForm, setCommentForm] = useState({ name: '', email: '', comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [blogRes, commentsRes] = await Promise.all([
          axios.get(`${API_URL}/api/blogs/${id}`),
          axios.get(`${API_URL}/api/blogs/${id}/comments`).catch(() => ({ data: [] })),
        ]);
        const loadedBlog = {
          ...blogRes.data,
          tags: parseMaybeArray(blogRes.data.tags),
          secondaryImages: parseMaybeArray(blogRes.data.secondaryImages),
          images: parseMaybeArray(blogRes.data.images),
          metaKeywords: parseMaybeArray(blogRes.data.metaKeywords),
        };
        setBlog(loadedBlog);
        setComments(commentsRes.data || []);

        if (loadedBlog.category) {
          axios.get(`${API_URL}/api/blogs`).then(({ data }) => {
            setRelatedPosts((data || []).filter((item) => item._id !== id && item.category === loadedBlog.category).slice(0, 3));
          }).catch(() => {});
        }
      } catch (error) {
        toast.error('Blog not found');
        navigate('/cloud-hosting-blog');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const renderedDescription = useMemo(() => normalizeEditorHtml(blog?.description || ''), [blog?.description]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentForm.name || !commentForm.email || !commentForm.comment) {
      toast.error('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/blogs/${id}/comments`, commentForm);
      setComments((prev) => [data, ...prev]);
      setCommentForm({ name: '', email: '', comment: '' });
      toast.success('Comment posted');
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCurrentUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-3/4 rounded bg-gray-200" />
            <div className="h-4 w-1/2 rounded bg-gray-200" />
            <div className="h-96 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!blog) return null;

  const heroImage = blog.primaryImage || blog.images?.[0] || '';
  const galleryImages = [...(blog.secondaryImages || []), ...(blog.images || []).filter((img) => img !== heroImage)].filter(Boolean);
  const metaDescription = blog.metaDescription || stripHtml(blog.description).slice(0, 160);
  const shareUrl = encodeURIComponent(window.location.href);
  const shareTitle = encodeURIComponent(blog.title);
  const embedUrl = getEmbedUrl(blog.videoUrl);

  return (
    <>
      <Helmet>
        <title>{blog.metaTitle || blog.title} | Cloudedata Blog</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={blog.ogTitle || blog.metaTitle || blog.title} />
        <meta property="og:description" content={blog.ogDescription || metaDescription} />
        <meta property="og:image" content={blog.ogImage || heroImage} />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
        {blog.canonicalUrl && <link rel="canonical" href={blog.canonicalUrl} />}
      </Helmet>

      <div className="min-h-screen bg-white">
        {user && (
          <div className="mx-auto flex max-w-5xl justify-end gap-3 px-4 pt-6 sm:px-6 lg:px-8">
            <Link to={`/admin/blog/edit/${blog._id}`} state={{ blog }} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700">
              Edit Blog
            </Link>
            <Link to="/admin/blogs" className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800">
              Back to Admin
            </Link>
          </div>
        )}

        <header className="border-b border-gray-100 bg-gray-950 text-white">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
            <button onClick={() => navigate('/cloud-hosting-blog')} className="mb-6 flex items-center gap-2 text-sm text-gray-300 transition hover:text-white">
              <ArrowLeft size={16} /> Back to all blogs
            </button>
            {blog.category && <span className="mb-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-indigo-300"><Folder size={12} />{blog.category}</span>}
            <h1 className="max-w-4xl text-3xl font-bold leading-tight sm:text-5xl">{blog.title}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-5 text-sm text-gray-300">
              <span className="flex items-center gap-2"><Calendar size={16} /> {new Date(blog.createdAt).toLocaleDateString()}</span>
              <span className="flex items-center gap-2"><Clock size={16} /> {getReadingTime(blog.description)}</span>
              <span className="flex items-center gap-2"><User size={16} /> {blog.author || 'Admin'}</span>
            </div>
          </div>
        </header>

        {heroImage && (
          <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
            <img src={heroImage} alt={blog.title} className="h-auto max-h-[520px] w-full rounded-2xl object-cover shadow-sm" />
          </div>
        )}

        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <article className="mx-auto max-w-3xl">
            <div className="mb-8 flex flex-wrap gap-2">
              {blog.tags?.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">
                  <Tag size={12} /> #{tag}
                </span>
              ))}
            </div>

            <div className="mb-8 flex flex-wrap items-center gap-3 border-b border-gray-100 pb-6">
              <a href={`https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-900 hover:text-white">Share on X</a>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-indigo-600 hover:text-white">LinkedIn</a>
              <button onClick={copyCurrentUrl} className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100"><LinkIcon size={14} /> {copied ? 'Copied' : 'Copy link'}</button>
            </div>

            <style>{`
              .blog-rte { font-size: 1.0625rem; line-height: 1.85; color: #1a1a2e; font-family: Georgia, 'Times New Roman', serif; word-break: break-word; }
              .blog-rte h1 { font-size: 2rem; font-weight: 800; line-height: 1.15; margin: 2.25rem 0 0.75rem; color: #0f172a; }
              .blog-rte h2 { font-size: 1.55rem; font-weight: 700; line-height: 1.2; margin: 2rem 0 0.6rem; color: #0f172a; padding-bottom: 0.5rem; border-bottom: 2px solid #e0e7ff; }
              .blog-rte h3 { font-size: 1.2rem; font-weight: 700; line-height: 1.3; margin: 1.75rem 0 0.5rem; color: #1e1b4b; }
              .blog-rte p { margin: 0 0 1.1rem; }
              .blog-rte ul { list-style: disc; padding-left: 1.75rem; margin: 0.75rem 0 1.25rem; }
              .blog-rte ol { list-style: decimal; padding-left: 1.75rem; margin: 0.75rem 0 1.25rem; }
              .blog-rte blockquote { border-left: 4px solid #6366f1; background: #eef2ff; padding: 0.85rem 1.25rem; margin: 1.5rem 0; border-radius: 0 10px 10px 0; color: #3730a3; font-style: italic; }
              .blog-rte pre { background: #0f172a; color: #e2e8f0; border-radius: 12px; padding: 1.25rem 1.5rem; overflow-x: auto; margin: 1.5rem 0; font-size: 0.875rem; line-height: 1.65; }
              .blog-rte code { background: #ede9fe; color: #4c1d95; border-radius: 4px; padding: 2px 6px; font-size: 0.875em; }
              .blog-rte a { color: #4f46e5; text-decoration: underline; text-underline-offset: 2px; }
              .blog-rte img { max-width: 100% !important; height: auto !important; border-radius: 8px; vertical-align: top; }
              .blog-rte span[data-type="resizable-image"],
              .blog-rte figure[data-type="resizable-image"] { box-sizing: border-box; max-width: 100%; }
              .blog-rte span[data-type="floating-box"],
              .blog-rte div[data-type="floating-box"] { box-sizing: border-box; max-width: 100%; }
              .blog-rte span[data-type="floating-box"] > span,
              .blog-rte div[data-type="floating-box"] > div { box-sizing: border-box; max-width: 100%; }
              .blog-rte span[data-type="floating-box"] *,
              .blog-rte div[data-type="floating-box"] * { box-sizing: border-box; }
              .blog-rte span[data-type="floating-box"] p,
              .blog-rte div[data-type="floating-box"] p { margin: 0 0 0.6rem; }
              .blog-rte::after { content: ''; display: table; clear: both; }
              @media (max-width: 640px) {
                .blog-rte { font-size: 1rem; }
                .blog-rte span[data-type="resizable-image"],
                .blog-rte div[data-type="floating-box"] { margin-left: 0 !important; max-width: 100% !important; }
              }
            `}</style>

            <div ref={contentRef} className="blog-rte" dangerouslySetInnerHTML={{ __html: renderedDescription }} />

            {galleryImages.length > 0 && (
              <div className="mt-10 border-t border-gray-100 pt-8">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-gray-400">Gallery</h3>
                <div className={`grid gap-3 ${galleryImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'}`}>
                  {galleryImages.map((img, index) => (
                    <button key={img} type="button" onClick={() => setLightboxImage(img)} className="aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
                      <img src={img} alt={`${blog.title} ${index + 1}`} className="h-full w-full object-cover transition hover:scale-105" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {embedUrl && (
              <div className="mt-10 border-t border-gray-100 pt-8">
                <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-lg">
                  <iframe src={embedUrl} className="h-full w-full" frameBorder="0" allowFullScreen title={blog.title} />
                </div>
              </div>
            )}
          </article>

          <section className="mx-auto mt-12 max-w-3xl rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-gray-100 bg-gray-50/70 px-7 py-5">
              <MessageCircle size={18} className="text-indigo-500" />
              <h3 className="text-lg font-bold text-gray-900">Comments ({comments.length})</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {comments.map((comment) => (
                <div key={comment._id} className="px-7 py-5">
                  <div className="font-semibold text-gray-800">{comment.name}</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{comment.comment}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleCommentSubmit} className="space-y-4 border-t border-gray-100 bg-gray-50/60 px-7 py-7">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input type="text" placeholder="Your name *" required value={commentForm.name} onChange={(e) => setCommentForm((prev) => ({ ...prev, name: e.target.value }))} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                <input type="email" placeholder="Email address *" required value={commentForm.email} onChange={(e) => setCommentForm((prev) => ({ ...prev, email: e.target.value }))} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <textarea rows={4} placeholder="Share your thoughts..." required value={commentForm.comment} onChange={(e) => setCommentForm((prev) => ({ ...prev, comment: e.target.value }))} className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
              <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50">
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </form>
          </section>

          {relatedPosts.length > 0 && (
            <section className="mx-auto mt-12 max-w-3xl">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Related Posts</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {relatedPosts.map((post) => (
                  <Link key={post._id} to={`/blog/${post._id}`} className="rounded-xl border border-gray-100 p-3 transition hover:shadow-md">
                    <img src={post.primaryImage || post.images?.[0] || 'https://placehold.co/300x180'} alt={post.title} className="mb-3 h-28 w-full rounded-lg object-cover" />
                    <h4 className="line-clamp-2 text-sm font-semibold text-gray-800">{post.title}</h4>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>

        {showBackToTop && (
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-8 right-8 z-50 rounded-full bg-indigo-600 p-3 text-white shadow-lg transition hover:bg-indigo-700">
            <ArrowUp size={20} />
          </button>
        )}

        {lightboxImage && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4" onClick={() => setLightboxImage(null)}>
            <div className="relative max-h-[90vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
              <img src={lightboxImage} alt="Full size" className="max-h-[90vh] w-full object-contain" />
              <button type="button" onClick={() => setLightboxImage(null)} className="absolute right-4 top-4 rounded-full bg-white p-2 transition hover:bg-gray-200">
                <X size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BlogDetail;
