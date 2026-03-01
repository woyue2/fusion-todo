import React, { useState } from 'react';
import { Task, Context } from '@/lib/types';

// 1. IdeaModal 组件：快速记录想法的弹窗
// 相比 TaskModal 更轻量，专注于快速录入标题、日期和关联清单

interface IdeaModalProps {
  contexts: Context[];
  onSave: (task: Partial<Task>) => void;
  onClose: () => void;
}

export function IdeaModal({ contexts, onSave, onClose }: IdeaModalProps) {
  // 2. 获取本地日期字符串 (YYYY-MM-DD)
  // Reason: HTML date input 需要这种格式，且使用本地时间避免时区偏移导致的日期显示错误
  const getLocalDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }; 
  
  // 3. 将本地日期字符串转换为 UTC ISO 字符串
  // Reason: 后端和统一数据层使用 ISO 格式存储时间
  const toUtcIsoFromDateString = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    // 构造 UTC 时间，确保 00:00:00，避免时区干扰
    return new Date(Date.UTC(year, month - 1, day)).toISOString();
  }; 

  // 4. 表单状态管理
  const [title, setTitle] = useState('');
  const [context, setContext] = useState(contexts[0]?.id || 'c1');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [createdAt, setCreatedAt] = useState(getLocalDateString()); // 默认为今天

  // 5. 标签输入处理：回车添加标签
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

  // 6. 保存想法
  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title,
      context,
      tags,
      status: 'todo', // 默认为待办状态
      color: '#ffffff',
      createdAt: toUtcIsoFromDateString(createdAt) // 转换日期格式
    });
    onClose();
  };

  return (
    // 7. 遮罩层
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      {/* 8. 弹窗主体 */}
      <div className="bg-[#f4f5f7] w-full max-w-xl rounded-xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200 bg-white">
            <h2 className="text-lg font-bold text-[#172b4d] flex items-center gap-2">
                <span>💡</span> 记录新想法
            </h2>
            <button onClick={onClose} aria-label="关闭" className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
            {/* 9. 标题输入框 (自动聚焦) */}
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
                {/* 10. 日期选择 */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-[#5e6c84] uppercase tracking-wider">创建日期</label>
                    <input 
                        type="date"
                        value={createdAt}
                        onChange={(e) => setCreatedAt(e.target.value)}
                        className="w-full p-3 border-2 border-[#dfe1e6] rounded-lg focus:border-[#0079bf] focus:outline-none bg-white text-sm"
                    />
                </div>
                {/* 11. 关联清单选择 */}
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

            {/* 12. 标签输入区域 */}
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
