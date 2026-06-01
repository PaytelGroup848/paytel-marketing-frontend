import { useState, useEffect } from 'react';

const SeoSettings = ({ metaTitle, metaDescription, onChange }) => {
  const [focusKeyword, setFocusKeyword] = useState('');
  const [slug, setSlug] = useState('');
  const [titlePreview, setTitlePreview] = useState(metaTitle);
  const [descPreview, setDescPreview] = useState(metaDescription);
  const domain = "cloudedata.com";

  // Auto-generate slug from title if slug is empty (optional)
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  useEffect(() => {
    if (slug === '' && metaTitle) {
      const autoSlug = generateSlug(metaTitle);
      setSlug(autoSlug);
    }
  }, [metaTitle]);

  const handleSlugChange = (value) => {
    const cleanSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    setSlug(cleanSlug);
  };

  const previewUrl = `https://${domain}/blog/${slug || 'blog-post'}`;
  const previewTitle = titlePreview || metaTitle || "No Title";
  const previewDescription = descPreview || metaDescription || "No description provided. This page will be optimized for search engines.";

  return (
    <div className="border-t pt-5 mt-4">
      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        SEO Settings
      </h3>

      <div className="space-y-5">
        {/* Meta Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => {
              const val = e.target.value;
              setTitlePreview(val);
              onChange('metaTitle', val);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="SEO title (max 60 chars)"
          />
          <div className="flex justify-between mt-1">
            <p className="text-xs text-gray-500">Recommended: 50-60 characters</p>
            <p className={`text-xs font-medium ${metaTitle.length > 60 ? 'text-red-500' : 'text-gray-500'}`}>
              {metaTitle.length}/60
            </p>
          </div>
        </div>

        {/* Meta Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
          <textarea
            rows="3"
            value={metaDescription}
            onChange={(e) => {
              const val = e.target.value;
              setDescPreview(val);
              onChange('metaDescription', val);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="SEO description (max 160 chars)"
          />
          <div className="flex justify-between mt-1">
            <p className="text-xs text-gray-500">Recommended: 150-160 characters</p>
            <p className={`text-xs font-medium ${metaDescription.length > 160 ? 'text-red-500' : 'text-gray-500'}`}>
              {metaDescription.length}/160
            </p>
          </div>
        </div>

        {/* Focus Keyword */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Focus Keyword</label>
          <input
            type="text"
            value={focusKeyword}
            onChange={(e) => setFocusKeyword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="e.g., cloud hosting benefits"
          />
          <p className="text-xs text-gray-500 mt-1">Helps optimize content for this keyword (optional)</p>
          {focusKeyword && !metaDescription.toLowerCase().includes(focusKeyword.toLowerCase()) && (
            <p className="text-xs text-amber-600 mt-1">⚠️ Focus keyword not found in meta description.</p>
          )}
        </div>

        {/* URL Slug */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug (optional)</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1.5 rounded border">cloudedata.com/blog/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="custom-url-slug"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Leave blank to auto-generate from title. Use hyphens for spaces.</p>
        </div>

        {/* Live Preview (Google snippet) */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Search Result Preview
          </p>
          <div className="space-y-1">
            <div className="text-indigo-600 text-sm font-medium truncate">{previewTitle}</div>
            <div className="text-xs text-gray-500 truncate">{previewUrl}</div>
            <div className="text-xs text-gray-600 line-clamp-2">{previewDescription}</div>
          </div>
        </div>

        <div className="text-xs text-gray-400 pt-2 border-t mt-2">
          📌 These SEO settings help search engines understand your content and are not displayed on the blog page.
        </div>
      </div>
    </div>
  );
};

export default SeoSettings;