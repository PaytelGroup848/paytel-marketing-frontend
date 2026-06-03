/**
 * BlogEditor.jsx – Final SaaS‑level version
 * - Fixed publish toast
 * - Edit loads content correctly
 * - All features working
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, CheckCircle2, ChevronDown,
  Clock, Globe, ImageIcon, Loader2, Save,
  Search, Settings, Video, X,
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

const blankPost = () => ({
  title: '', description: '', primaryImage: '', secondaryImages: [],
  videoUrl: '', category: '', tags: [], status: 'draft',
  seo: {
    metaTitle: '', metaDescription: '', metaKeywords: [], canonicalUrl: '',
    ogTitle: '', ogDescription: '', ogImage: '',
    noIndex: false, noFollow: false, twitterTitle: '', twitterDescription: '',
  },
});

const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; }
  catch { return String(v).split(',').map(s => s.trim()).filter(Boolean); }
};

const normalizeBlog = (payload = {}) => {
  const d = payload.blog || payload.data || payload;
  const seo = d.seo || {};
  return {
    ...blankPost(),
    title: d.title || '',
    description: d.description || d.content || d.body || '',
    primaryImage: d.primaryImage || d.image || '',
    secondaryImages: asArray(d.secondaryImages),
    videoUrl: d.videoUrl || '',
    category: d.category || '',
    tags: asArray(d.tags),
    status: d.status || 'draft',
    seo: {
      metaTitle: seo.metaTitle || d.metaTitle || '',
      metaDescription: seo.metaDescription || d.metaDescription || '',
      metaKeywords: asArray(seo.metaKeywords || d.metaKeywords),
      canonicalUrl: seo.canonicalUrl || d.canonicalUrl || '',
      ogTitle: seo.ogTitle || d.ogTitle || '',
      ogDescription: seo.ogDescription || d.ogDescription || '',
      ogImage: seo.ogImage || d.ogImage || '',
      noIndex: Boolean(seo.noIndex ?? d.noIndex ?? false),
      noFollow: Boolean(seo.noFollow ?? d.noFollow ?? false),
      twitterTitle: seo.twitterTitle || d.twitterTitle || '',
      twitterDescription: seo.twitterDescription || d.twitterDescription || '',
    },
  };
};

const isEmptyHtml = (html = '') => {
  if (/data-type="resizable-image"|data-type="floating-box"|<img/i.test(html)) return false;
  return !html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
};

const hasDraftContent = (draft) => {
  return draft.title?.trim() || draft.description?.trim() || draft.primaryImage || draft.secondaryImages?.length;
};

const SideSection = ({ icon: Icon, title, children, defaultOpen = true, badge }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3 transition hover:bg-gray-50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
            <Icon size={13} className="text-slate-600" />
          </div>
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          {badge != null && (
            <span className="ml-1 rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-white">{badge}</span>
          )}
        </div>
        <ChevronDown size={13} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
};

const Inp = ({ className = '', ...props }) => (
  <input {...props} className={`w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition placeholder-gray-300 focus:border-transparent focus:ring-2 focus:ring-slate-400 ${className}`} />
);

const STATUS_CFG = {
  draft: { icon: Clock, cls: 'border-amber-200 bg-amber-50 text-amber-600', label: 'Draft' },
  published: { icon: CheckCircle2, cls: 'border-emerald-200 bg-emerald-50 text-emerald-600', label: 'Published' },
  unsaved: { icon: AlertCircle, cls: 'border-gray-200 bg-gray-50 text-gray-500', label: 'Unsaved' },
  saving: { icon: Loader2, cls: 'border-blue-200 bg-blue-50 text-blue-600', label: 'Saving…' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.cls}`}>
      <Icon size={11} className={status === 'saving' ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  );
};

const BlogEditor = () => {
  const params = useParams();
  const id = params.id || params.blogId || params.postId;
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const autoSaveTimer = useRef(null);
  const latestRef = useRef(blankPost());
  const dirtyRef = useRef(false);
  const publishMenuRef = useRef(null);
  const saveFnRef = useRef(null);
  const savingRef = useRef(false);
  const isInitialized = useRef(false);

  const routedBlog = location.state?.blog;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pubStatus, setPubStatus] = useState('draft');
  const [showPubMenu, setShowPubMenu] = useState(false);
  const [formData, setFormData] = useState(blankPost);
  const [editorKey, setEditorKey] = useState(0);

  // ---- helpers
  const applyBlog = useCallback((blog) => {
    const n = normalizeBlog(blog);
    latestRef.current = n;
    dirtyRef.current = false;
    setFormData(n);
    setEditorKey(k => k + 1);
    setPubStatus(n.status === 'published' ? 'published' : 'draft');
  }, []);

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (!dirtyRef.current) return;
      try {
        localStorage.setItem(isNew ? DRAFT_KEY_NEW : DRAFT_KEY_EDIT(id), JSON.stringify(latestRef.current));
      } catch {}
      dirtyRef.current = false;
    }, 2000);
  }, [id, isNew]);

  const set = useCallback((patch) => {
    setFormData(prev => {
      const next = patch.seo ? { ...prev, seo: { ...prev.seo, ...patch.seo } } : { ...prev, ...patch };
      latestRef.current = next;
      return next;
    });
    dirtyRef.current = true;
    setPubStatus('unsaved');
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const setSeo = useCallback((field, value) => set({ seo: { [field]: value } }), [set]);

  // ---- save / publish (FIXED: explicit success toast)
  const handleSave = useCallback(async (status = 'draft') => {
    if (savingRef.current) return;
    if (!latestRef.current.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (isEmptyHtml(latestRef.current.description)) {
      toast.error('Content is required');
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setPubStatus('saving');
    setShowPubMenu(false);

    const fd = latestRef.current;
    const payload = {
      title: fd.title, description: fd.description,
      primaryImage: fd.primaryImage,
      secondaryImages: JSON.stringify(fd.secondaryImages),
      videoUrl: fd.videoUrl, category: fd.category,
      tags: JSON.stringify(fd.tags), status,
      metaTitle: fd.seo.metaTitle,
      metaDescription: fd.seo.metaDescription,
      metaKeywords: JSON.stringify(fd.seo.metaKeywords),
      canonicalUrl: fd.seo.canonicalUrl,
      ogTitle: fd.seo.ogTitle,
      ogDescription: fd.seo.ogDescription,
      ogImage: fd.seo.ogImage,
      noIndex: fd.seo.noIndex,
      noFollow: fd.seo.noFollow,
      twitterTitle: fd.seo.twitterTitle,
      twitterDescription: fd.seo.twitterDescription,
    };

    try {
      const res = isNew ? await api.post('/blogs', payload) : await api.put(`/blogs/${id}`, payload);
      const saved = res.data?.blog || res.data?.data || res.data || {};
      const savedId = saved._id || saved.id || id;

      localStorage.removeItem(isNew ? DRAFT_KEY_NEW : DRAFT_KEY_EDIT(id));
      dirtyRef.current = false;

      setPubStatus(status === 'published' ? 'published' : 'draft');
      
      // ✅ FIXED: Show success toast with clear message
      if (status === 'published') {
        toast.success('🎉 Post published successfully!', { icon: '🚀', duration: 4000 });
      } else {
        toast.success('✅ Draft saved successfully');
      }

      if (status === 'published') {
        navigate(ADMIN_BLOGS_PATH, { replace: true });
        return;
      }
      if (isNew && savedId) {
        navigate(EDIT_BLOG_PATH(savedId), {
          replace: true,
          state: { blog: { ...payload, ...saved, _id: savedId } },
        });
      }
    } catch (err) {
      console.error('Save error:', err);
      const errorMsg = err.response?.data?.message || 'Failed to save. Please try again.';
      toast.error(errorMsg);
      setPubStatus('unsaved');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [id, isNew, navigate]);

  useEffect(() => { saveFnRef.current = handleSave; }, [handleSave]);

  // ---- keyboard shortcut
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFnRef.current?.('draft');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---- close publish menu on outside click
  useEffect(() => {
    const close = (e) => {
      if (publishMenuRef.current && !publishMenuRef.current.contains(e.target)) setShowPubMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // ---- main initialisation effect (runs once per route change)
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    let isMounted = true;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    const handleBeforeUnload = (e) => {
      if (!dirtyRef.current) return;
      try {
        localStorage.setItem(isNew ? DRAFT_KEY_NEW : DRAFT_KEY_EDIT(id), JSON.stringify(latestRef.current));
      } catch {}
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const init = async () => {
      if (isNew) {
        const raw = localStorage.getItem(DRAFT_KEY_NEW);
        if (raw) {
          try {
            const draft = JSON.parse(raw);
            if (hasDraftContent(draft)) {
              const restore = window.confirm('You have an unsaved draft. Restore it?');
              if (restore) {
                if (isMounted) applyBlog(draft);
                dirtyRef.current = true;
                if (isMounted) setPubStatus('unsaved');
                return;
              } else {
                localStorage.removeItem(DRAFT_KEY_NEW);
              }
            }
          } catch { localStorage.removeItem(DRAFT_KEY_NEW); }
        }
        localStorage.removeItem(DRAFT_KEY_NEW);
        const blank = blankPost();
        latestRef.current = blank;
        dirtyRef.current = false;
        if (isMounted) {
          setFormData(blank);
          setEditorKey(k => k + 1);
          setPubStatus('draft');
          setLoading(false);
        }
        return;
      }

      // Edit mode
      if (routedBlog && (routedBlog._id === id || routedBlog.id === id)) {
        if (isMounted) applyBlog(routedBlog);
        if (isMounted) setLoading(false);
        return;
      }

      const raw = localStorage.getItem(DRAFT_KEY_EDIT(id));
      if (raw) {
        try {
          const draft = JSON.parse(raw);
          if (hasDraftContent(draft)) {
            const restore = window.confirm('You have an unsaved draft for this post. Restore it?');
            if (restore) {
              if (isMounted) applyBlog(draft);
              dirtyRef.current = true;
              if (isMounted) setPubStatus('unsaved');
              return;
            } else {
              localStorage.removeItem(DRAFT_KEY_EDIT(id));
            }
          }
        } catch { localStorage.removeItem(DRAFT_KEY_EDIT(id)); }
      }

      setLoading(true);
      try {
        const { data } = await api.get(`/blogs/${id}`);
        if (isMounted) applyBlog(data);
      } catch (err) {
        if (isMounted) {
          if (err.response?.status === 401) { logout(); navigate('/login'); return; }
          toast.error('Failed to load post');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    init();

    return () => {
      isMounted = false;
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      if (dirtyRef.current) {
        try {
          localStorage.setItem(isNew ? DRAFT_KEY_NEW : DRAFT_KEY_EDIT(id), JSON.stringify(latestRef.current));
        } catch {}
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [id, isNew, routedBlog, applyBlog, logout, navigate]);

  const slug = formData.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);

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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#f7f8fa] pt-24">
        <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 xl:px-8">
          {/* Header */}
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to={ADMIN_BLOGS_PATH}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm transition hover:bg-gray-50">
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
                  {isNew ? 'Write, format, and publish your post' : 'Editing — Ctrl+S saves draft anytime'}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2.5">
              <button type="button" onClick={() => handleSave('draft')} disabled={saving}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Draft
              </button>

              <div className="relative flex overflow-hidden rounded-xl shadow-sm" ref={publishMenuRef}>
                <button type="button" onClick={() => handleSave('published')} disabled={saving}
                  className="flex items-center gap-2 bg-slate-800 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                  Publish
                </button>
                <button type="button" onClick={() => setShowPubMenu(v => !v)}
                  className="border-l border-slate-600 bg-slate-700 px-2 py-2 text-white transition hover:bg-slate-600">
                  <ChevronDown size={13} />
                </button>
                {showPubMenu && (
                  <div className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                    <button type="button" onClick={() => handleSave('published')}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-slate-50">
                      <Globe size={13} /> Publish and exit
                    </button>
                    <button type="button" onClick={() => handleSave('draft')}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-slate-50">
                      <Save size={13} /> Save as draft
                    </button>
                    <button type="button"
                      onClick={() => {
                        if (dirtyRef.current) {
                          if (!window.confirm('Discard unsaved changes?')) return;
                        }
                        localStorage.removeItem(isNew ? DRAFT_KEY_NEW : DRAFT_KEY_EDIT(id));
                        navigate(ADMIN_BLOGS_PATH);
                      }}
                      className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50">
                      <X size={13} /> Discard and exit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main body – same as your working version */}
          <div className="flex flex-col gap-6 xl:flex-row">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Post Title *</label>
                  <span className={`font-mono text-xs ${formData.title.length > 90 ? 'text-red-500' : 'text-gray-300'}`}>
                    {formData.title.length}/100
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.title}
                  maxLength={100}
                  onChange={e => set({ title: e.target.value })}
                  placeholder="Write a compelling headline…"
                  className="w-full bg-transparent text-2xl font-extrabold leading-snug tracking-tight text-gray-900 outline-none placeholder-gray-200"
                />
                {formData.title && (
                  <p className="mt-2.5 text-xs text-gray-400">
                    Link <span className="font-mono text-slate-500">/{slug}</span>
                  </p>
                )}
              </div>

              <RichTextEditor
                key={editorKey}
                content={formData.description}
                onChange={html => set({ description: html })}
              />
            </div>

            <div className="w-full flex-shrink-0 space-y-4 xl:w-[340px]">
              <SideSection icon={Settings} title="Post Details">
                <div className="space-y-3">
                  <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Category</label><Inp value={formData.category} onChange={e => set({ category: e.target.value })} placeholder="e.g. Technology" list="cat-list" /></div>
                  <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Tags</label><TagInput tags={formData.tags} onChange={tags => set({ tags })} /></div>
                </div>
              </SideSection>

              <SideSection icon={ImageIcon} title="Featured Image">
                <ImageUploader multiple={false} existingImages={formData.primaryImage ? [formData.primaryImage] : []} onUpload={url => set({ primaryImage: url })} onRemove={() => set({ primaryImage: '' })} />
                <p className="mt-2 text-[11px] text-gray-400">Recommended 1200 × 630 px</p>
              </SideSection>

              <SideSection icon={ImageIcon} title="Gallery" badge={formData.secondaryImages.length || null} defaultOpen={false}>
                <ImageUploader multiple existingImages={formData.secondaryImages} onUpload={urls => set({ secondaryImages: [...formData.secondaryImages, ...(Array.isArray(urls) ? urls : [urls])] })} onRemove={url => set({ secondaryImages: formData.secondaryImages.filter(i => i !== url) })} />
              </SideSection>

              <SideSection icon={Video} title="Video Embed" defaultOpen={false}>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">YouTube Embed URL</label>
                <Inp value={formData.videoUrl} onChange={e => set({ videoUrl: e.target.value })} placeholder="https://www.youtube.com/embed/…" />
                {formData.videoUrl && <div className="mt-3 aspect-video overflow-hidden rounded-xl border border-gray-200"><iframe src={formData.videoUrl} className="h-full w-full" allowFullScreen title="Preview" /></div>}
              </SideSection>

              <SideSection icon={Search} title="SEO Settings" defaultOpen={false}>
                <SeoPanel seo={formData.seo} postTitle={formData.title} onChange={setSeo} />
              </SideSection>

              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1.5"><Clock size={10} /> Auto-saves every 2s</span>
                  <span>Ctrl+S · Save draft</span>
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