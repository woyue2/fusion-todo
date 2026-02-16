import React, { useState, useEffect } from 'react';
import { Task, Status, Context } from '@/lib/types';
import { CARD_COLORS } from '@/lib/initialData';

interface TaskModalProps {
  task: Task;
  statuses: Status[];
  contexts: Context[];
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onClose: () => void;
}

export function TaskModal({ task, statuses, contexts, onSave, onDelete, onClose }: TaskModalProps) {
  const [editedTask, setEditedTask] = useState<Task>({ ...task });

  useEffect(() => {
    setEditedTask({ ...task });
  }, [task]);

  const handleSave = () => {
    onSave(editedTask);
    onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 animate-in fade-in duration-200">
      <div className="bg-white w-[450px] max-w-[90%] rounded-lg shadow-2xl p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-[#172b4d]">Edit Task</span>
            <button onClick={onClose} className="text-2xl text-[#999] hover:text-[#172b4d] bg-transparent border-none cursor-pointer">×</button>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[#5e6c84] tracking-wide">TASK DESCRIPTION</label>
            <textarea 
                className="p-2.5 border border-[#dfe1e6] rounded text-[0.95rem] min-h-[80px] focus:border-[#0079bf] focus:outline-none focus:ring-2 focus:ring-[#0079bf]/20 transition-all resize-y font-sans"
                value={editedTask.title}
                onChange={(e) => setEditedTask({...editedTask, title: e.target.value})}
                placeholder="Describe the task..."
            />
        </div>

        {/* Row: Status & Context */}
        <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#5e6c84] tracking-wide">STATUS</label>
                <select 
                    className="p-2.5 border border-[#dfe1e6] rounded text-[0.95rem] focus:border-[#0079bf] focus:outline-none focus:ring-2 focus:ring-[#0079bf]/20 bg-white"
                    value={editedTask.status}
                    onChange={(e) => setEditedTask({...editedTask, status: e.target.value})}
                >
                    {statuses.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
            </div>
            <div className="flex-1 flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#5e6c84] tracking-wide">CONTEXT (LIST)</label>
                <select 
                    className="p-2.5 border border-[#dfe1e6] rounded text-[0.95rem] focus:border-[#0079bf] focus:outline-none focus:ring-2 focus:ring-[#0079bf]/20 bg-white"
                    value={editedTask.context}
                    onChange={(e) => setEditedTask({...editedTask, context: e.target.value})}
                >
                    {contexts.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
            </div>
        </div>

        {/* Colors */}
        <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[#5e6c84] tracking-wide">PRIORITY / COLOR</label>
            <div className="flex gap-3 items-center">
                {CARD_COLORS.map(c => (
                    <div 
                        key={c.hex}
                        onClick={() => setEditedTask({...editedTask, color: c.hex})}
                        className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 ${editedTask.color === c.hex ? 'border-[#5e6c84] ring-2 ring-black/10 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                    />
                ))}
            </div>
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[#5e6c84] tracking-wide">TAGS</label>
            <input 
                type="text" 
                className="p-2.5 border border-[#dfe1e6] rounded text-[0.95rem] focus:border-[#0079bf] focus:outline-none focus:ring-2 focus:ring-[#0079bf]/20 transition-all"
                value={editedTask.tags.join(', ')}
                onChange={(e) => setEditedTask({...editedTask, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                placeholder="e.g. Work, Urgent (comma separated)"
            />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-2">
            <button 
                onClick={() => onDelete(task.id)}
                className="px-4 py-2 rounded font-medium bg-[#eb5a46]/10 text-[#eb5a46] hover:bg-[#eb5a46]/20 transition-colors cursor-pointer"
            >
                Delete Task
            </button>
            <button 
                onClick={onClose}
                className="px-4 py-2 rounded font-medium bg-[#ebecf0] text-[#172b4d] hover:bg-[#dfe1e6] transition-colors cursor-pointer"
            >
                Cancel
            </button>
            <button 
                onClick={handleSave}
                className="px-4 py-2 rounded font-medium bg-[#0079bf] text-white hover:bg-[#005a8e] transition-colors cursor-pointer"
            >
                Save Changes
            </button>
        </div>

      </div>
    </div>
  );
}
