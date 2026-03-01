import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, Context, ViewType } from '@/lib/types';

// 1. TaskCard 组件：看板中单个任务卡片的展示
// 支持拖拽、点击编辑，并根据状态和类型显示不同样式

// 辅助函数：根据字符串生成颜色（用于标签）
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
  // 2. 使用 useSortable 钩子，使任务卡片可被拖拽
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

  // 3. 计算拖拽时的样式（位移、透明度等）
  const isStatusView = viewType === 'status';
  const isWhenFree = task.status === 'when-free';
  
  // 4. 定义状态颜色映射（用于卡片左侧边框）
  const statusColors: Record<string, string> = {
    todo: 'var(--status-todo)',
    doing: 'var(--status-doing)',
    done: 'var(--status-done)',
    'when-free': 'var(--status-when-free-border)', // 新增 When Free 状态颜色
  };
  const statusColor = statusColors[task.status] || '#dfe1e6';

  // 4.1 计算 When Free 的淡化样式
  const cardBackground = isWhenFree ? 'var(--status-when-free-bg)' : (task.color || 'var(--card-bg)');

  // 3. 计算拖拽时的样式（位移、透明度等）
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : (isWhenFree ? 'var(--status-when-free-opacity)' : 1), // 拖拽时半透明
    backgroundColor: cardBackground,
  };
  
  // 5. 获取 Context 信息（用于显示 Context 颜色条）
  const contextObj = contexts.find(c => c.id === task.context);
  const contextColor = contextObj?.color;

  // 6. 已完成任务的样式（删除线）
  const isDone = task.status === 'done';
  const titleStyle = isDone
    ? { textDecoration: 'line-through', color: '#888' }
    : (isWhenFree ? { color: 'var(--status-when-free-text)' } : {});
  
  // 7. 组合边框样式
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
      {...attributes} // 8. 绑定拖拽属性
      {...listeners}  // 9. 绑定拖拽事件监听
      onClick={() => onEdit(task)} // 点击编辑任务
      className="task-card relative p-2.5 rounded-md shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-[1px] transition-all select-none bg-white mb-2"
    >
      {/* 10. 如果是 Status 视图，显示顶部 Context 颜色条，方便区分归属 */}
      {isStatusView && contextColor && (
        <div 
          className="absolute top-0 left-0 right-0 h-1 rounded-t-sm" 
          style={{ backgroundColor: contextColor }}
        />
      )}
      
      <div className={`flex justify-between items-start gap-2 mb-1.5 ${isStatusView && contextColor ? 'mt-1' : ''}`}>
        <span 
          className="text-[0.95rem] text-[#172b4d] font-medium leading-snug break-words"
          style={{ 
            ...titleStyle, 
            whiteSpace: 'pre-line' // 保留用户输入的换行符
          }}
        >
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
          {/* Reason: Expose When Free in the status dropdown. */}
          <option value="todo">To Do</option>
          <option value="doing">In Progress</option>
          <option value="done">Done</option>
          <option value="when-free">When Free</option>
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
