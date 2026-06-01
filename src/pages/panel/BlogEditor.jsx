import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock,
  Globe,
  ImageIcon,
  Loader2,
  Save,
  Search,
  Settings,
  Video,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../Services/api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import RichTextEditor from '../../components/editor/RichTextEditor';
import ImageUploader from '../../components/editor/ImageUpload';
import TagInput from '../../components/editor/TagInput';
import SeoPanel from '../../components/editor/SeoPanel';

const ADMIN_BLOGS_PATH = '/admin/blogs';
const EDIT_BLOG_PATH = (id) => `/admin/blog/edit/${id}`;

const DRAFT_KEY_NEW = 'blog-draft-new';
const DRAFT_KEY_EDIT = (id) => `blog-draft-${id}`;

// ---------- helper functions (unchanged but clarified) ----------
const blankPost = () => ({
  title: '',
  description: '',
  primaryImage: '',
  secondaryImages: [],
  videoUrl: '',
  category: '',
  tags: [],
  status: 'draft',
  seo: {
    metaTitle: '',
    metaDescription: '',
    metaKeywords: [],
    canonicalUrl: '',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    noIndex: false,
    noFollow: false,
    twitterTitle: '',
    twitterDescription: '',
  },
});

const asArray = (value) => {
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

const normalizeBlog = (payload = {}) => {
  const data = payload.blog || payload.data || payload;
  const seo = data.seo || {};
  return {
    ...blankPost(),
    title: data.title || '',
    description: data.description || data.content || data.body || '',
    primaryImage: data.primaryImage || data.image || '',
    secondaryImages: asArray(data.secondaryImages),
    videoUrl: data.videoUrl || '',
    category: data.category || '',
    tags: asArray(data.tags),
    status: data.status || 'draft',
    seo: {
      metaTitle: seo.metaTitle || data.metaTitle || '',
      metaDescription: seo.metaDescription || data.metaDescription || '',
      metaKeywords: asArray(seo.metaKeywords || data.metaKeywords),
      canonicalUrl: seo.canonicalUrl || data.canonicalUrl || '',
      ogTitle: seo.ogTitle || data.ogTitle || '',
      ogDescription: seo.ogDescription || data.ogDescription || '',
      ogImage: seo.ogImage || data.ogImage || '',
      noIndex: Boolean(seo.noIndex ?? data.noIndex ?? false),
      noFollow: Boolean(seo.noFollow ?? data.noFollow ?? false),
      twitterTitle: seo.twitterTitle || data.twitterTitle || '',
      twitterDescription: seo.twitterDescription || data.twitterDescription || '',
    },
  };
};

const isEmptyHtml = (html = '') => {
  if (html.includes('data-type="resizable-image"') || html.includes('data-type="floating-box"') || html.includes('<img'))
    return false;
  return !html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
};

// ---------- tiny sub-components (unchanged) ----------
const SideSection = ({ icon: Icon, title, children, defaultOpen = true, badge }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-3 transition hover:bg-gray-50"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
            <Icon size={13} className="text-slate-600" />
          </div>
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          {badge != null && (
            <span className="ml-1 rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown size={13} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
};

const Inp = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition placeholder-gray-300 focus:border-transparent focus:ring-2 focus:ring-slate-400 ${className}`}
  />
);

const statusConfig = {
  draft: { icon: Clock, cls: 'border-amber-200 bg-amber-50 text-amber-600', label: 'Draft' },
  published: { icon: CheckCircle2, cls: 'border-emerald-200 bg-emerald-50 text-emerald-600', label: 'Published' },
  unsaved: { icon: AlertCircle, cls: 'border-gray-200 bg-gray-50 text-gray-500', label: 'Unsaved' },
  saving: { icon: Loader2, cls: 'border-blue-200 bg-blue-50 text-blue-600', label: 'Saving...' },
};

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.draft;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.cls}`}>
      <Icon size={11} className={status === 'saving' ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  );
};

// ---------- main component ----------
const BlogEditor = () => {
  const params = useParams();
  const id = params.id || params.blogId || params.postId;
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  // Refs for non‑render‑critical values
  const autoSaveTimer = useRef(null);
  const latestRef = useRef(blankPost());
  const dirtyRef = useRef(false);
  const publishMenuRef = useRef(null);
  const saveFnRef = useRef(null);      // holds the stable save callback for Ctrl+S
  const savingRef = useRef(false);    // prevents double save
  const unmountedRef = useRef(false);

  const routedBlog = location.state?.blog;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pubStatus, setPubStatus] = useState('draft');
  const [showPubMenu, setShowPubMenu] = useState(false);
  const [formData, setFormData] = useState(() => blankPost());
  const [editorKey, setEditorKey] = useState(0);

  // -------- data lifecycle --------
  const applyBlog = useCallback((blog) => {
    const normalized = normalizeBlog(blog);
    latestRef.current = normalized;
    dirtyRef.current = false;
    setFormData(normalized);
    setEditorKey((key) => key + 1);
    setPubStatus(normalized.status === 'published' ? 'published' : 'draft');
  }, []);

  // Schedule an auto‑save to localStorage after a short delay
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (!dirtyRef.current || unmountedRef.current) return;
      const key = isNew ? DRAFT_KEY_NEW : DRAFT_KEY_EDIT(id);
      try {
        localStorage.setItem(key, JSON.stringify(latestRef.current));
      } catch (e) {
        // quota exceeded – ignore
      }
      dirtyRef.current = false;
    }, 2000);
  }, [id, isNew]);

  // Update form fields and mark dirty
  const set = useCallback((patch) => {
    setFormData((prev) => {
      const next = patch.seo
        ? { ...prev, seo: { ...prev.seo, ...patch.seo } }
        : { ...prev, ...patch };
      latestRef.current = next;
      return next;
    });
    dirtyRef.current = true;
    setPubStatus('unsaved');
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const setSeo = useCallback((field, value) => set({ seo: { [field]: value } }), [set]);

  // -------- save (draft or publish) --------
  const handleSave = useCallback(async (status = formData.status || 'draft') => {
    // prevent double clicks / double submissions
    if (savingRef.current) return;

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (isEmptyHtml(formData.description)) {
      toast.error('Content is required');
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setPubStatus('saving');
    setShowPubMenu(false);

    const payload = {
      title: formData.title,
      description: formData.description,
      primaryImage: formData.primaryImage,
      secondaryImages: JSON.stringify(formData.secondaryImages),
      videoUrl: formData.videoUrl,
      category: formData.category,
      tags: JSON.stringify(formData.tags),
      status,
      metaTitle: formData.seo.metaTitle,
      metaDescription: formData.seo.metaDescription,
      metaKeywords: JSON.stringify(formData.seo.metaKeywords),
      canonicalUrl: formData.seo.canonicalUrl,
      ogTitle: formData.seo.ogTitle,
      ogDescription: formData.seo.ogDescription,
      ogImage: formData.seo.ogImage,
      noIndex: formData.seo.noIndex,
      noFollow: formData.seo.noFollow,
      twitterTitle: formData.seo.twitterTitle,
      twitterDescription: formData.seo.twitterDescription,
    };

    try {
      const response = isNew
        ? await api.post('/blogs', payload)
        : await api.put(`/blogs/${id}`, payload);
      const saved = response.data?.blog || response.data?.data || response.data || {};
      const savedId = saved._id || saved.id || id;

      // remove auto‑saved draft from localStorage
      const draftKey = isNew ? DRAFT_KEY_NEW : DRAFT_KEY_EDIT(id);
      localStorage.removeItem(draftKey);
      dirtyRef.current = false;

      setPubStatus(status === 'published' ? 'published' : 'draft');
      toast.success(status === 'published' ? 'Post published' : 'Draft saved');

      if (status === 'published') {
        navigate(ADMIN_BLOGS_PATH, { replace: true });
        return;
      }

      // if it's a new post, now we have an ID – navigate to the edit route
      if (isNew && savedId) {
        navigate(EDIT_BLOG_PATH(savedId), {
          replace: true,
          state: { blog: { ...payload, ...saved, _id: savedId } },
        });
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.response?.data?.message || 'Failed to save. Please try again.');
      setPubStatus('unsaved');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [formData, id, isNew, navigate]);

  // keep saveFnRef in sync with the current handleSave
  useEffect(() => {
    saveFnRef.current = handleSave;
  }, [handleSave]);

  // -------- draft recovery from localStorage --------
  const recoverDraft = useCallback(() => {
    const key = isNew ? DRAFT_KEY_NEW : DRAFT_KEY_EDIT(id);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // minimal check – it should be an object with a title
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {
      localStorage.removeItem(key); // corrupted data
    }
    return null;
  }, [id, isNew]);

  // -------- fetch existing blog (only for edit mode) --------
  const fetchBlog = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/blogs/${id}`);
      applyBlog(data);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      toast.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [applyBlog, id, isNew, logout, navigate]);

  // -------- initialization & cleanup --------
  useEffect(() => {
    unmountedRef.current = false;
    // Clear any previous timer
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    if (isNew) {
      const draft = recoverDraft();
      if (draft) {
        const shouldRestore = window.confirm(
          'You have an unsaved draft. Do you want to restore it?'
        );
        if (shouldRestore) {
          applyBlog(draft);
          // Keep the draft in localStorage until explicit save
          dirtyRef.current = true;
          setPubStatus('unsaved');
          return;
        }
      }
      // No draft or user declined
      const blank = blankPost();
      localStorage.removeItem(DRAFT_KEY_NEW);
      latestRef.current = blank;
      dirtyRef.current = false;
      setFormData(blank);
      setEditorKey((key) => key + 1);
      setPubStatus('draft');
      setLoading(false);
      return;
    }

    // Edit mode
    if (routedBlog && ((routedBlog._id || routedBlog.id) === id)) {
      // Prefer state‑passed data (avoids one request)
      applyBlog(routedBlog);
      setLoading(false);
    } else {
      const draft = recoverDraft();
      if (draft) {
        const shouldRestore = window.confirm(
          'You have an unsaved draft for this post. Do you want to restore it?'
        );
        if (shouldRestore) {
          applyBlog(draft);
          dirtyRef.current = true;
          setPubStatus('unsaved');
          setLoading(false);
          return;
        } else {
          localStorage.removeItem(DRAFT_KEY_EDIT(id));
        }
      }
      fetchBlog();
    }

    // Save dirty draft on unmount (e.g., closing tab)
    const handleBeforeUnload = (e) => {
      if (!dirtyRef.current) return;
      const key = isNew ? DRAFT_KEY_NEW : DRAFT_KEY_EDIT(id);
      try {
        localStorage.setItem(key, JSON.stringify(latestRef.current));
      } catch (err) {}
      // Most browsers ignore custom messages now, but we keep the standard
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unmountedRef.current = true;
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      // Final save on unmount if dirty (cleanup function)
      if (dirtyRef.current) {
        const key = isNew ? DRAFT_KEY_NEW : DRAFT_KEY_EDIT(id);
        try {
          localStorage.setItem(key, JSON.stringify(latestRef.current));
        } catch (e) {}
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount/unmount

  // -------- keyboard shortcuts (Ctrl+S) --------
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Call the currently stable save function via ref
        if (saveFnRef.current) saveFnRef.current('draft');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []); // no dependencies needed thanks to ref

  // -------- close publish menu on outside click --------
  useEffect(() => {
    const close = (e) => {
      if (publishMenuRef.current && !publishMenuRef.current.contains(e.target))
        setShowPubMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // -------- render --------
  if (loading && !formData.title && !formData.description) {
    return (
      <>
        <Navbar />
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
        </div>
      </>
    );
  }

  const slug = formData.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#f7f8fa] pt-20">
        <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 xl:px-8">
          {/* Header */}
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                to={ADMIN_BLOGS_PATH}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm transition hover:bg-gray-50"
              >
                <ArrowLeft size={16} className="text-gray-600" />
              </Link>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
                    {isNew ? 'New Post' : 'Edit Post'}
                  </h1>
                  <StatusBadge status={pubStatus} />
                </div>
                <p className="mt-0.5 text-xs text-gray-400">
                  {isNew
                    ? 'Write, format, and publish your post'
                    : 'Editing — Ctrl+S saves draft anytime'}
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Draft
              </button>
              <div className="relative flex overflow-hidden rounded-xl shadow-sm" ref={publishMenuRef}>
                <button
                  type="button"
                  onClick={() => handleSave('published')}
                  disabled={saving}
                  className="flex items-center gap-2 bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                  Publish
                </button>
                <button
                  type="button"
                  onClick={() => setShowPubMenu((v) => !v)}
                  className="border-l border-slate-600 bg-slate-700 px-2 py-2 text-white hover:bg-slate-600"
                >
                  <ChevronDown size={13} />
                </button>
                {showPubMenu && (
                  <div className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                    <button
                      type="button"
                      onClick={() => handleSave('published')}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-slate-50"
                    >
                      <Globe size={13} /> Publish and exit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSave('draft')}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-slate-50"
                    >
                      <Save size={13} /> Save as draft
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (dirtyRef.current) {
                          const leave = window.confirm(
                            'You have unsaved changes. Discard them?'
                          );
                          if (!leave) return;
                        }
                        // clear any draft before leaving
                        const key = isNew ? DRAFT_KEY_NEW : DRAFT_KEY_EDIT(id);
                        localStorage.removeItem(key);
                        navigate(ADMIN_BLOGS_PATH);
                      }}
                      className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50"
                    >
                      <X size={13} /> Discard and exit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex flex-col gap-6 xl:flex-row">
            <div className="min-w-0 flex-1 space-y-4">
              {/* Title */}
              <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Post Title *
                  </label>
                  <span
                    className={`font-mono text-xs ${formData.title.length > 90 ? 'text-red-500' : 'text-gray-300'}`}
                  >
                    {formData.title.length}/100
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.title}
                  maxLength={100}
                  onChange={(e) => set({ title: e.target.value })}
                  placeholder="Write a compelling headline..."
                  className="w-full bg-transparent text-2xl font-extrabold leading-snug tracking-tight text-gray-900 outline-none placeholder-gray-200"
                />
                {formData.title && (
                  <p className="mt-2.5 text-xs text-gray-400">
                    Link <span className="font-mono text-slate-500">/{slug}</span>
                  </p>
                )}
              </div>

              {/* Rich Text Editor */}
              <RichTextEditor
                key={editorKey}
                content={formData.description}
                onChange={(html) => set({ description: html })}
              />
            </div>

            {/* Sidebar */}
            <div className="w-full flex-shrink-0 space-y-4 xl:w-[340px]">
              <SideSection icon={Settings} title="Post Details">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Category
                    </label>
                    <Inp
                      value={formData.category}
                      onChange={(e) => set({ category: e.target.value })}
                      placeholder="e.g. Technology"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Tags
                    </label>
                    <TagInput tags={formData.tags} onChange={(tags) => set({ tags })} />
                  </div>
                </div>
              </SideSection>

              <SideSection icon={ImageIcon} title="Featured Image">
                <ImageUploader
                  multiple={false}
                  existingImages={formData.primaryImage ? [formData.primaryImage] : []}
                  onUpload={(url) => set({ primaryImage: url })}
                  onRemove={() => set({ primaryImage: '' })}
                />
                <p className="mt-2 text-[11px] text-gray-400">Recommended 1200 × 630 px</p>
              </SideSection>

              <SideSection icon={ImageIcon} title="Gallery" badge={formData.secondaryImages.length || null}>
                <ImageUploader
                  multiple
                  existingImages={formData.secondaryImages}
                  onUpload={(urls) =>
                    set({
                      secondaryImages: [
                        ...formData.secondaryImages,
                        ...(Array.isArray(urls) ? urls : [urls]),
                      ],
                    })
                  }
                  onRemove={(url) =>
                    set({
                      secondaryImages: formData.secondaryImages.filter((img) => img !== url),
                    })
                  }
                />
              </SideSection>

              <SideSection icon={Video} title="Video Embed" defaultOpen={false}>
                <Inp
                  value={formData.videoUrl}
                  onChange={(e) => set({ videoUrl: e.target.value })}
                  placeholder="https://www.youtube.com/embed/..."
                />
              </SideSection>

              <SideSection icon={Search} title="SEO Settings" defaultOpen={false}>
                <SeoPanel seo={formData.seo} postTitle={formData.title} onChange={setSeo} />
              </SideSection>

              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Clock size={10} />
                    Autosaves every 2s
                  </span>
                  <span>Ctrl+S – Save draft</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogEditor;