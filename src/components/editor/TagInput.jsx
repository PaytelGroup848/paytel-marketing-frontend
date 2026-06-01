import { useState } from 'react';
import { X } from 'lucide-react';

const TagInput = ({ tags = [], onChange }) => {
  const [input, setInput] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      if (!tags.includes(input.trim())) onChange([...tags, input.trim()]);
      setInput('');
    }
  };

  const removeTag = (tag) => onChange(tags.filter(t => t !== tag));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Tags</label>
      <div className="flex flex-wrap gap-2 border border-gray-300 rounded-lg p-2 min-h-[42px]">
        {tags.map(tag => (
          <span key={tag} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs flex items-center gap-1">
            {tag}
            <button onClick={() => removeTag(tag)} type="button"><X size={12} /></button>
          </span>
        ))}
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Add tag..." className="flex-1 outline-none text-sm min-w-[80px]" />
      </div>
    </div>
  );
};

export default TagInput;