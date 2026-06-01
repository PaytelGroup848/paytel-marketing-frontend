import { useState } from 'react';
import { Search, Share2, Globe, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';

const Counter = ({ value = '', max }) => {
  const len = value.length;
  const color = len > max ? 'bg-red-500' : len > max * 0.9 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min((len / max) * 100, 100)}%` }} /></div>
      <span className={`text-[11px] font-mono ${len > max ? 'text-red-500' : 'text-gray-400'}`}>{len}/{max}</span>
    </div>
  );
};

const Field = ({ label, children, hint }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
  </div>
);

const Input = (props) => <input {...props} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none transition-all placeholder-gray-300" />;

const Toggle = ({ checked, onChange, label }) => (
  <label className="flex items-center justify-between cursor-pointer py-2">
    <span className="text-sm text-gray-700">{label}</span>
    <div onClick={() => onChange(!checked)} className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-slate-800' : 'bg-gray-200'}`}>
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </div>
  </label>
);

const Section = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-100 first:border-0">
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between py-3 hover:bg-gray-50 px-1 rounded-lg">
        <div className="flex items-center gap-2"><Icon size={13} className="text-gray-500" /><span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{title}</span></div>
        <ChevronDown size={13} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-4 pb-4">{children}</div>}
    </div>
  );
};

const SeoPanel = ({ seo = {}, postTitle = '', onChange }) => {
  const [kwInput, setKwInput] = useState('');
  const s = { metaTitle: '', metaDescription: '', metaKeywords: [], canonicalUrl: '', ogTitle: '', ogDescription: '', ogImage: '', noIndex: false, noFollow: false, twitterTitle: '', twitterDescription: '', ...seo };
  const displayTitle = s.metaTitle || postTitle || 'Page title';
  const displayDesc = s.metaDescription || 'No meta description — search engines will generate one automatically.';

  const addKeyword = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && kwInput.trim()) {
      e.preventDefault();
      const kw = kwInput.trim().replace(/,$/, '');
      if (!s.metaKeywords.includes(kw)) onChange('metaKeywords', [...s.metaKeywords, kw]);
      setKwInput('');
    }
  };
  const removeKeyword = (kw) => onChange('metaKeywords', s.metaKeywords.filter(k => k !== kw));

  const titleLen = s.metaTitle.length;
  const titleStatus = titleLen === 0 ? null : titleLen < 30 ? 'short' : titleLen > 60 ? 'long' : 'ok';

  return (
    <div className="space-y-1">
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
        <div className="flex items-center gap-2 mb-3"><Search size={12} className="text-gray-400"/><span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Search Preview</span></div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-gray-200 rounded-full"/><span className="text-[11px] text-gray-500">yoursite.com</span></div>
          <p className="text-[15px] text-blue-700 font-medium leading-snug truncate hover:underline">{displayTitle}</p>
          <p className="text-[12px] text-gray-500 leading-snug line-clamp-2">{displayDesc}</p>
        </div>
      </div>

      <Section title="Basic SEO" icon={Search}>
        <Field label="Meta Title">
          <Input value={s.metaTitle} onChange={e => onChange('metaTitle', e.target.value)} maxLength={80} />
          <Counter value={s.metaTitle} max={60} />
          {titleStatus === 'short' && <p className="text-[11px] text-amber-500 flex items-center gap-1"><AlertCircle size={10}/>Too short — aim for 30–60 characters.</p>}
          {titleStatus === 'long' && <p className="text-[11px] text-red-500"><AlertCircle size={10}/>Too long — will be truncated.</p>}
          {titleStatus === 'ok' && <p className="text-[11px] text-emerald-500"><CheckCircle2 size={10}/>Good length!</p>}
        </Field>
        <Field label="Meta Description">
          <textarea value={s.metaDescription} onChange={e => onChange('metaDescription', e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none" />
          <Counter value={s.metaDescription} max={155} />
        </Field>
        <Field label="Meta Keywords" hint="Press Enter or comma to add">
          <div className="flex flex-wrap gap-1.5 p-2 border rounded-xl bg-white min-h-[38px]">
            {s.metaKeywords.map(kw => <span key={kw} className="flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full">{kw}<button onClick={() => removeKeyword(kw)}>×</button></span>)}
            <input value={kwInput} onChange={e => setKwInput(e.target.value)} onKeyDown={addKeyword} placeholder={s.metaKeywords.length === 0 ? 'Add keywords…' : ''} className="flex-1 min-w-[80px] text-xs outline-none bg-transparent" />
          </div>
        </Field>
        <Field label="Canonical URL" hint="Leave empty to use the post's default URL">
          <Input value={s.canonicalUrl} onChange={e => onChange('canonicalUrl', e.target.value)} placeholder="https://yoursite.com/blog/post-slug" />
        </Field>
      </Section>

      <Section title="Open Graph (Social)" icon={Share2} defaultOpen={false}>
        <Field label="OG Title" hint="Defaults to Meta Title"><Input value={s.ogTitle} onChange={e => onChange('ogTitle', e.target.value)} placeholder={s.metaTitle || postTitle} /></Field>
        <Field label="OG Description"><textarea value={s.ogDescription} onChange={e => onChange('ogDescription', e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none" /></Field>
        <Field label="OG Image URL" hint="1200×630px"><Input value={s.ogImage} onChange={e => onChange('ogImage', e.target.value)} placeholder="https://…/og-image.jpg" /></Field>
        {s.ogImage && <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 aspect-[1200/630]"><img src={s.ogImage} alt="OG preview" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} /></div>}
      </Section>

      <Section title="Twitter / X Card" icon={Share2} defaultOpen={false}>
        <Field label="Twitter Title"><Input value={s.twitterTitle} onChange={e => onChange('twitterTitle', e.target.value)} placeholder={s.ogTitle || s.metaTitle || postTitle} /></Field>
        <Field label="Twitter Description"><textarea value={s.twitterDescription} onChange={e => onChange('twitterDescription', e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none" /></Field>
      </Section>

      <Section title="Robots / Indexing" icon={Globe} defaultOpen={false}>
        <Toggle checked={s.noIndex} onChange={v => onChange('noIndex', v)} label="No Index (hide from search engines)" />
        <Toggle checked={s.noFollow} onChange={v => onChange('noFollow', v)} label="No Follow (don't follow links)" />
        {(s.noIndex || s.noFollow) && <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700"><AlertCircle size={13}/>This post will have <strong>robots: {[s.noIndex && 'noindex', s.noFollow && 'nofollow'].filter(Boolean).join(', ')}</strong>.</div>}
      </Section>
    </div>
  );
};

export default SeoPanel;