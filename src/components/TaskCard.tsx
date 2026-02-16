import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, Context, ViewType } from '@/lib/types';

// Helper to generate color from string (for tags)
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

interface TaskCardProps {
  task: Task;
  viewType: ViewType;
  contexts: Context[];
  onEdit: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
}

export function TaskCard({ task, viewType, contexts, onEdit, onStatusChange }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id, 
    data: { type: 'Task', task } 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: task.color || '#ffffff',
  };

  const isStatusView = viewType === 'status';
  
  // Status Colors (Left Border)
  const statusColors: Record<string, string> = {
    todo: '#dfe1e6',
    doing: '#0079bf',
    done: '#61bd4f',
  };
  const statusColor = statusColors[task.status] || '#dfe1e6';
  
  // Context Info
  const contextObj = contexts.find(c => c.id === task.context);
  const contextColor = contextObj?.color;

  // Done style
  const isDone = task.status === 'done';
  const titleStyle = isDone ? { textDecoration: 'line-through', color: '#888' } : {};
  
  // Border style
  const borderStyle: React.CSSProperties = {
      borderLeftWidth: '4px',
      borderLeftStyle: 'solid',
      borderLeftColor: statusColor,
      ...(isDone ? { opacity: 0.8 } : {})
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...borderStyle }}
      {...attributes}
      {...listeners}
      onClick={() => onEdit(task)}
      className="task-card relative p-2.5 rounded-md shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-[1px] transition-all select-none bg-white mb-2"
    >
      {/* Context Color Stripe (Status View Only) */}
      {isStatusView && contextColor && (
        <div 
          className="absolute top-0 left-0 right-0 h-1 rounded-t-sm" 
          style={{ backgroundColor: contextColor }}
        />
      )}
      
      <div className={`flex justify-between items-start gap-2 mb-1.5 ${isStatusView && contextColor ? 'mt-1' : ''}`}>
        <span className="text-[0.95rem] text-[#172b4d] font-medium leading-snug break-words" style={titleStyle}>
          {task.title}
        </span>
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {task.tags.map(tag => (
            <span 
              key={tag} 
              className="text-[0.7rem] px-1.5 py-0.5 rounded text-white font-medium"
              style={{ backgroundColor: stringToColor(tag) }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: Dropdown (Context View) or Context Title (Status View) */}
      {!isStatusView ? (
        <select
          className="mt-2 p-1 text-xs border border-black/10 rounded bg-white/80 w-full cursor-pointer"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onStatusChange && onStatusChange(task.id, e.target.value)}
          value={task.status}
        >
          <option value="todo">To Do</option>
          <option value="doing">In Progress</option>
          <option value="done">Done</option>
        </select>
      ) : (
        contextObj && (
           <div className="mt-1.5 text-xs text-[#666]">
               📂 {contextObj.title}
           </div>
        )
      )}
    </div>
  );
}
