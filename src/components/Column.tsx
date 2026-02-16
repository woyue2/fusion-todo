import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, ViewType, Status, Context } from '@/lib/types';
import { TaskCard } from './TaskCard';

interface ColumnProps {
  column: Status | Context;
  tasks: Task[];
  viewType: ViewType;
  allContexts: Context[];
  onTitleChange: (id: string, newTitle: string) => void;
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
  className?: string;
}

export function Column({ 
    column, 
    tasks, 
    viewType, 
    allContexts, 
    onTitleChange, 
    onAddTask, 
    onEditTask, 
    onStatusChange,
    className
}: ColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: { type: 'Column', column }
  });

  const isStatusView = viewType === 'status';
  const contextColor = !isStatusView && 'color' in column ? (column as Context).color : undefined;

  return (
    <div 
        ref={setNodeRef}
        className={`flex flex-col bg-[#ebecf0] rounded-lg p-2.5 box-border ${className || ''}`}
        style={contextColor ? { borderTop: `4px solid ${contextColor}` } : { borderTop: '4px solid transparent' }}
    >
        {/* Header */}
        <div className="flex justify-between items-center mb-2.5 p-1 shrink-0">
            <div className="flex items-center w-full">
                {contextColor && (
                    <div 
                        className="w-3 h-3 rounded-full mr-2 shrink-0" 
                        style={{ backgroundColor: contextColor }}
                    />
                )}
                <input 
                    type="text" 
                    value={column.title}
                    onChange={(e) => onTitleChange(column.id, e.target.value)}
                    className="font-semibold text-[#172b4d] bg-transparent border-2 border-transparent rounded p-1 text-[0.95rem] w-full cursor-pointer focus:bg-white focus:border-[#0079bf] focus:outline-none focus:cursor-text"
                />
            </div>
            <span className="text-[#5e6c84] text-xs ml-2 bg-[#091e4214] px-1.5 py-0.5 rounded-full shrink-0">
                {tasks.length}
            </span>
        </div>

        {/* Task List */}
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 flex flex-col gap-0 min-h-[20px]">
                {tasks.map(task => (
                    <TaskCard 
                        key={task.id} 
                        task={task} 
                        viewType={viewType}
                        contexts={allContexts}
                        onEdit={onEditTask}
                        onStatusChange={onStatusChange}
                    />
                ))}
            </div>
        </SortableContext>

        {/* Add Button */}
        <button 
            onClick={() => onAddTask(column.id)}
            className="mt-2 text-[#5e6c84] p-2 text-left rounded cursor-pointer flex items-center gap-1.5 hover:bg-[#091e4214] hover:text-[#172b4d] shrink-0"
        >
            <span>+</span> Add card
        </button>
    </div>
  );
}
