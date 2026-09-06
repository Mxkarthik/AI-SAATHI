import React from 'react';
import { Tag, X } from 'lucide-react';

const TagChip = ({ tag, removable, onRemove, variant = 'default', onClick }) => (
  <span
    onClick={onClick}
    className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors ${
      variant === 'dark'
        ? 'bg-black/5 border border-black/10 text-gray-900'
        : 'bg-yellow-400/20 border border-yellow-400/50 text-yellow-300'
    } ${onClick ? 'cursor-pointer hover:bg-yellow-400/30' : ''}`}
  >
    <Tag size={12} />
    {tag}
    {removable && (
      <button
        onClick={(e) => {
          e.stopPropagation(); // prevent onClick on span from firing
          if (onRemove) onRemove();
        }}
        className={`ml-1 p-0.5 rounded-full transition ${
          variant === 'dark' ? 'hover:bg-black/10' : 'hover:bg-yellow-400/30'
        }`}
      >
        <X size={12} />
      </button>
    )}
  </span>
);

export default TagChip;
