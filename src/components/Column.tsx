import React, { useState } from 'react'; // Reason: Control action panel visibility to avoid title被遮挡
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, ViewType, Status, Context } from '@/lib/types';
import { TaskCard } from './TaskCard';

// 1. Column 组件：看板中的一列，包含该列的任务列表
// 支持拖拽排序、折叠、标题编辑和更多操作

interface ColumnProps {
  column: Status | Context;
  tasks: Task[];
  viewType: ViewType;
  allContexts: Context[];
  onTitleChange: (id: string, newTitle: string) => void;
  onToggleCollapsed: (id: string, collapsed: boolean) => void; 
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onMoveAbove: (columnId: string) => void; 
  onMoveBelow: (columnId: string) => void; 
  onMoveLeft: (columnId: string) => void; 
  onMoveRight: (columnId: string) => void; 
  canMoveAbove: boolean; 
  canMoveBelow: boolean; 
  canMoveLeft: boolean; 
  canMoveRight: boolean; 
  isColumnDragEnabled: boolean;
  isActionOpen: boolean; // 动作面板是否打开
  onToggleAction: () => void; 
  onDeleteContext?: (contextId: string) => void; // 删除列的回调（仅 Context 视图可用）
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
    isActionOpen,
    onToggleAction,
    onDeleteContext,
    className
}: ColumnProps) {
  // 2. 使用 useSortable 钩子，使该列本身可以被拖拽
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'Column', column }
  });

  const isStatusView = viewType === 'status';
  const isDateView = viewType === 'date';
  // 3. 如果是 Context 视图，获取列颜色
  const contextColor = !isStatusView && !isDateView && 'color' in column ? (column as Context).color : undefined;
  
  // 4. 计算拖拽时的样式
  const columnStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1 // 拖拽时降低不透明度
  }; 
  const combinedStyle = {
    ...columnStyle,
    // 为 Context 列添加顶部彩色边框
    ...(contextColor ? { borderTop: `4px solid ${contextColor}` } : { borderTop: '4px solid transparent' })
  }; 
  const isCollapsed = column.collapsed; 

  return (
    <div 
        ref={setNodeRef}
        style={combinedStyle}
        // 5. 应用拖拽监听器 (listeners) 到整个列容器（或者只给 header 加 handle）
        // 这里没有把 listeners 加在最外层，通常应该加在 Header 上作为拖拽手柄，
        // 但如果 isColumnDragEnabled 为 false，则无法拖拽。
        // 注意：Board.tsx 中 SortableContext 包裹了 Column，拖拽逻辑主要在 Header 上实现（见下方）
        className={`flex flex-col bg-[#ebecf0] rounded-lg p-2.5 box-border ${className || ''}`}
    >
        {/* 6. 列头区域 (Header) */}
        <div className="flex justify-between items-center mb-2.5 p-1 shrink-0">
            <div className="flex items-center w-full"
                 // 7. 只有在允许拖拽时，头部才作为拖拽手柄
                 {...(isColumnDragEnabled ? { ...attributes, ...listeners } : {})}
            >
                {contextColor && (
                    <div 
                        className="w-3 h-3 rounded-full mr-2 shrink-0" 
                        style={{ backgroundColor: contextColor }}
                    />
                )}
                {/* 8. 标题输入框 */}
                <input 
                    type="text" 
                    value={column.title}
                    onChange={(e) => onTitleChange(column.id, e.target.value)}
                    // 防止输入时触发拖拽：onPointerDown 停止冒泡
                    onPointerDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="font-semibold text-[#172b4d] bg-transparent border-2 border-transparent rounded p-1 text-[0.95rem] w-full cursor-pointer focus:bg-white focus:border-[#0079bf] focus:outline-none focus:cursor-text"
                />
            </div>
            
            {/* 9. 折叠/展开按钮 */}
            <button
                type="button"
                onClick={() => onToggleCollapsed(column.id, !isCollapsed)}

                className="ml-2 px-2 py-1 rounded text-[#5e6c84] hover:bg-[#091e4214] cursor-pointer shrink-0"
            >
                {isCollapsed ? '展开' : '折叠'}
            </button> {/* Reason: Provide explicit collapse/expand control in the column header. */}
            
            <div className="relative flex items-center" data-action-panel> {/* Reason: 提供动作面板的定位容器 */}
                <button
                    type="button"
                    aria-expanded={isActionOpen}
                    onClick={onToggleAction}
                    className="ml-2 px-2 py-1 rounded text-[#5e6c84] hover:bg-[#091e4214] cursor-pointer shrink-0"
                    title="更多动作"
                >
                    ···
                </button>
                {isActionOpen && (
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
                        {!isStatusView && !isDateView && onDeleteContext && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('删除该列表及其所有任务？此操作不可撤销')) {
                                // Reason: Confirm destructive action before cascading delete.
                                onDeleteContext(column.id);
                              }
                            }}
                            className="px-2 py-1 rounded text-[#eb5a46] hover:bg-[#eb5a46]/10"
                            title="删除列表（包含该列表下的所有任务）"
                          >
                            删除
                          </button>
                        )}
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
