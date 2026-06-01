import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../Services/api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import { Edit2, Trash2, Loader2, ImageIcon, Eye, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const BlogList = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/blogs');
      setBlogs(Array.isArray(data) ? data : data.blogs || data.data || []);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      toast.error('Failed to load blogs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this blog permanently? This action cannot be undone.')) return;
    try {
      await api.delete(`/blogs/${id}`);
      toast.success('Blog deleted');
      fetchBlogs();
    } catch {
      toast.error('Delete failed');
    }
  };

  const stripHtml = (html = '') => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const getThumbnail = (blog) => {
    if (blog.primaryImage) return blog.primaryImage;
    if (Array.isArray(blog.images) && blog.images.length) return blog.images[0];
    if (Array.isArray(blog.secondaryImages) && blog.secondaryImages.length) return blog.secondaryImages[0];
    return null;
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Blog Management</h1>
              <p className="mt-1 text-gray-500">Manage all blog posts</p>
            </div>
            <Link to="/admin/blog/new" className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white shadow-md transition hover:bg-indigo-700">
              <Plus size={17} /> New Blog
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>
          ) : blogs.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white py-20 text-center">
              <ImageIcon size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No blogs yet. Create your first blog post.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {blogs.map((blog) => {
                const id = blog._id || blog.id;
                const thumb = getThumbnail(blog);
                return (
                  <div key={id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="relative h-48 overflow-hidden bg-gray-100">
                      {thumb ? (
                        <img src={thumb} alt={blog.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                          <ImageIcon size={32} className="text-gray-400" />
                        </div>
                      )}
                      <span className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-xs font-semibold ${blog.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                        {blog.status || 'draft'}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="line-clamp-1 text-lg font-bold text-gray-900">{blog.title || 'Untitled blog'}</h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">{stripHtml(blog.description).slice(0, 120) || 'No description yet'}...</p>
                      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                        <span className="text-xs text-gray-400">{blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : 'No date'}</span>
                        <div className="flex gap-2">
                          <Link to={`/blog/${id}`} className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100" title="View"><Eye size={16} /></Link>
                          <Link to={`/admin/blog/edit/${id}`} state={{ blog }} className="rounded-lg p-2 text-indigo-600 transition hover:bg-indigo-50" title="Edit"><Edit2 size={16} /></Link>
                          <button type="button" onClick={() => handleDelete(id)} className="rounded-lg p-2 text-red-600 transition hover:bg-red-50" title="Delete"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default BlogList;
