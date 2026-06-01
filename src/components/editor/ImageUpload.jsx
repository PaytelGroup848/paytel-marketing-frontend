import { useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import api from '../../Services/api';
import toast from 'react-hot-toast';

const ImageUploader = ({ label, multiple = false, existingImages = [], onUpload, onRemove }) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    try {
      const { data } = await api.post('/upload-blog-image', formData);
      const urls = data.urls;
      onUpload(multiple ? urls : urls[0]);
      toast.success(`${urls.length} image(s) uploaded`);
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (url) => {
    if (window.confirm('Remove this image?')) onRemove(url);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-3">
        {existingImages.map((img, idx) => (
          <div key={idx} className="relative w-24 h-24 border rounded-lg overflow-hidden group shadow-sm">
            <img src={img} className="w-full h-full object-cover" />
            <button onClick={() => handleRemove(img)} className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition">
              <X size={12} />
            </button>
          </div>
        ))}
        <label className={`w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 transition ${uploading ? 'opacity-50' : ''}`}>
          {uploading ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} className="text-gray-400" />}
          <span className="text-[10px] text-gray-400 mt-1">Upload</span>
          <input type="file" accept="image/*" multiple={multiple} onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>
      </div>
    </div>
  );
};

export default ImageUploader;