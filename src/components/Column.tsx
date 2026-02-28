import React, { useState } from 'react'; // Reason: Control action panel visibility to avoid title被遮挡
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, ViewType, Status, Context } from '@/lib/types';
import { TaskCard } from './TaskCard';

interface ColumnProps {
  column: Status | Context;
  tasks: Task[];
  viewType: ViewType;
  allContexts: Context[];
  onTitleChange: (id: string, newTitle: string) => void;
  onToggleCollapsed: (id: string, collapsed: boolean) => void; // Reason: Bubble collapse state changes to persistence layer.
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onMoveAbove: (columnId: string) => void; // Reason: Semantic move button for placing above left neighbor.
  onMoveBelow: (columnId: string) => void; // Reason: Semantic move button for placing below left neighbor.
  onMoveLeft: (columnId: string) => void; // Reason: Semantic move button for shifting left among anchors.
  onMoveRight: (columnId: string) => void; // Reason: Semantic move button for shifting right among anchors.
  canMoveAbove: boolean; // Reason: Disable button when no valid left neighbor.
  canMoveBelow: boolean; // Reason: Disable button when no valid left neighbor.
  canMoveLeft: boolean; // Reason: Disable button when not an anchor or no left anchor.
  canMoveRight: boolean; // Reason: Disable button when not an anchor or no right anchor.
  isColumnDragEnabled: boolean;
  className?: string;
}

export function Column({ 
    column, 
    tasks, 
    viewType, 
    allContexts, 
    onTitleChange, 
    onToggleCollapsed,
    onAddTask, 
    onEditTask, 
    onStatusChange,
    onMoveAbove,
    onMoveBelow,
    onMoveLeft,
    onMoveRight,
    canMoveAbove,
    canMoveBelow,
    canMoveLeft,
    canMoveRight,
    isColumnDragEnabled,
    className
}: ColumnProps) {
  // Reason: useSortable enables column drag while keeping the column droppable for tasks.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'Column', column }
  });
  const [actionsOpen, setActionsOpen] = useState(false); // Reason: 点击“更多”按钮时展示四方向箭头

  const isStatusView = viewType === 'status';
  const contextColor = !isStatusView && 'color' in column ? (column as Context).color : undefined;
  const columnStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  }; // Reason: Reflect drag state for column movement feedback.
  const combinedStyle = {
    ...columnStyle,
    ...(contextColor ? { borderTop: `4px solid ${contextColor}` } : { borderTop: '4px solid transparent' })
  }; // Reason: Preserve existing context border while adding drag transform.
  const isCollapsed = column.collapsed; // Reason: Control task list rendering based on persisted state.

  return (
    <div 
        ref={setNodeRef}
        style={combinedStyle}
        className={`flex flex-col bg-[#ebecf0] rounded-lg p-2.5 box-border ${className || ''}`}
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
            <button
                type="button"
                onClick={() => onToggleCollapsed(column.id, !isCollapsed)}
                className="ml-2 px-2 py-1 rounded text-[#5e6c84] hover:bg-[#091e4214] cursor-pointer shrink-0"
            >
                {isCollapsed ? '展开' : '折叠'}
            </button> {/* Reason: Provide explicit collapse/expand control in the column header. */}
            <div className="relative flex items-center"> {/* Reason: 提供动作面板的定位容器 */}
                <button
                    type="button"
                    aria-expanded={actionsOpen}
                    onClick={() => setActionsOpen(!actionsOpen)}
                    className="ml-2 px-2 py-1 rounded text-[#5e6c84] hover:bg-[#091e4214] cursor-pointer shrink-0"
                    title="更多动作"
                >
                    ···
                </button> {/* Reason: 使用“更多”按钮收纳四方向箭头，避免压缩标题 */}
                {actionsOpen && (
                    <div className="absolute top-full right-0 mt-1 bg-white rounded shadow-md border border-[#dfe1e6] p-1 flex items-center gap-1 z-10">
                        <button
                            type="button"
                            onClick={() => onMoveAbove(column.id)}
                            disabled={!canMoveAbove}
                            className={`px-2 py-1 rounded text-[#5e6c84] hover:bg-[#091e4214] ${canMoveAbove ? '' : 'opacity-40 cursor-not-allowed'}`}
                            title={canMoveAbove ? '移到左侧邻列上方或解除堆叠' : '不可用'}
                        >
                            ↥
                        </button>
                        <button
                            type="button"
                            onClick={() => onMoveBelow(column.id)}
                            disabled={!canMoveBelow}
                            className={`px-2 py-1 rounded text-[#5e6c84] hover:bg-[#091e4214] ${canMoveBelow ? '' : 'opacity-40 cursor-not-allowed'}`}
                            title={canMoveBelow ? '移到左侧邻列下方' : '不可用'}
                        >
                            ↧
                        </button>
                        <button
                            type="button"
                            onClick={() => onMoveLeft(column.id)}
                            disabled={!canMoveLeft}
                            className={`px-2 py-1 rounded text-[#5e6c84] hover:bg-[#091e4214] ${canMoveLeft ? '' : 'opacity-40 cursor-not-allowed'}`}
                            title={canMoveLeft ? '向左移动（仅锚列）' : '不可用'}
                        >
                            ←
                        </button>
                        <button
                            type="button"
                            onClick={() => onMoveRight(column.id)}
                            disabled={!canMoveRight}
                            className={`px-2 py-1 rounded text-[#5e6c84] hover:bg-[#091e4214] ${canMoveRight ? '' : 'opacity-40 cursor-not-allowed'}`}
                            title={canMoveRight ? '向右移动（仅锚列）' : '不可用'}
                        >
                            →
                        </button>
                    </div>
                )}
            </div>
            {isColumnDragEnabled && (
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="ml-2 px-2 py-1 rounded text-[#5e6c84] hover:bg-[#091e4214] cursor-grab active:cursor-grabbing"
                >
                    ≡
                </button>
            )} {/* Reason: Desktop-only drag handle prevents accidental column drag on mobile. */}
            <span className="text-[#5e6c84] text-xs ml-2 bg-[#091e4214] px-1.5 py-0.5 rounded-full shrink-0">
                {tasks.length}
            </span>
        </div>

        {!isCollapsed && (
            <>
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
            </>
        )} {/* Reason: Hide tasks and add button when column is collapsed. */}
    </div>
  );
}
