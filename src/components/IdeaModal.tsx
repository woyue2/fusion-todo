import React, { useState } from 'react';
import { Task, Context } from '@/lib/types';

interface IdeaModalProps {
  contexts: Context[];
  onSave: (task: Partial<Task>) => void;
  onClose: () => void;
}

export function IdeaModal({ contexts, onSave, onClose }: IdeaModalProps) {
  const [title, setTitle] = useState('');
  const [context, setContext] = useState(contexts[0]?.id || 'c1');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [createdAt, setCreatedAt] = useState(new Date().toISOString().split('T')[0]); // Default to today

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title,
      context,
      tags,
      status: 'todo', // Default status for new ideas
      color: '#ffffff',
      createdAt: new Date(createdAt).toISOString() // Convert date string back to ISO
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-[#f4f5f7] w-full max-w-xl rounded-xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200 bg-white">
            <h2 className="text-lg font-bold text-[#172b4d] flex items-center gap-2">
                <span>💡</span> 记录新想法
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
            {/* Title */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-[#5e6c84] uppercase tracking-wider">标题 / 想法内容</label>
                <textarea 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="输入您的想法..." 
                    className="w-full p-3 border-2 border-[#dfe1e6] rounded-lg focus:border-[#0079bf] focus:outline-none min-h-[120px] text-[0.95rem] resize-none transition-all"
                    autoFocus
                ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-[#5e6c84] uppercase tracking-wider">创建日期</label>
                    <input 
                        type="date"
                        value={createdAt}
                        onChange={(e) => setCreatedAt(e.target.value)}
                        className="w-full p-3 border-2 border-[#dfe1e6] rounded-lg focus:border-[#0079bf] focus:outline-none bg-white text-sm"
                    />
                </div>
                {/* Context */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-[#5e6c84] uppercase tracking-wider">关联清单 (可选)</label>
                    <select 
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        className="w-full p-3 border-2 border-[#dfe1e6] rounded-lg focus:border-[#0079bf] focus:outline-none bg-white text-sm"
                    >
                        {contexts.map(c => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-[#5e6c84] uppercase tracking-wider">标签</label>
                <div className="w-full p-3 border-2 border-[#dfe1e6] rounded-lg bg-white flex flex-wrap gap-2 focus-within:border-[#0079bf] focus-within:ring-1 focus-within:ring-[#0079bf]">
                    {tags.map(tag => (
                        <span key={tag} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded flex items-center gap-1">
                            {tag}
                            <button onClick={() => removeTag(tag)} className="hover:text-blue-900">×</button>
                        </span>
                    ))}
                    <input 
                        type="text" 
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={tags.length === 0 ? "按回车添加标签..." : ""} 
                        className="flex-1 outline-none text-sm min-w-[100px]"
                    />
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-200">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#42526e] hover:bg-gray-200 rounded-md transition-colors">取消</button>
            <button onClick={handleSave} className="px-6 py-2 text-sm font-bold text-white bg-[#0079bf] hover:bg-[#005582] rounded-md shadow-md transition-colors">保存想法</button>
        </div>
      </div>
    </div>
  );
}
