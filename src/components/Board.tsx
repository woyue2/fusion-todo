'use client';

// 1. Board 组件：核心看板组件，负责状态管理和拖拽交互
// 这是一个 Client Component，因为包含了大量的交互逻辑 (useState, useOptimistic, DndContext)

import React, { useState, useOptimistic, useTransition, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    DndContext, 
    DragOverlay, 
    closestCorners, 
    KeyboardSensor, 
    PointerSensor, 
    TouchSensor,
    useSensor, 
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverEvent,
    defaultDropAnimationSideEffects,
    DropAnimation
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { ViewType, Task, Status, Context, DateColumn } from '@/lib/types';
import { Column } from './Column';
import { TaskModal } from './TaskModal';
import { IdeaModal } from './IdeaModal';
import { TaskCard } from './TaskCard';
import { 
    addTask, 
    saveTask, 
    removeTask, 
    addContext, 
    updateColumn, 
    updateColumnCollapsed,
    updateColumnBelowOf,
    moveTask,
    reorderStatuses,
    reorderContexts,
    reorderDateColumns,
    deleteContextCascade
} from '@/app/actions';

// 拖拽结束时的动画效果配置
const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

interface BoardProps {
    initialStatuses: Status[];
    initialContexts: Context[];
    initialDateColumns: DateColumn[];
    initialTasks: Task[];
}

export function Board({ initialStatuses, initialContexts, initialDateColumns, initialTasks }: BoardProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // 2. 乐观更新 (Optimistic UI) 状态
    // useOptimistic 允许我们在服务端操作完成前，立即更新 UI，提升用户体验
    // 当服务端操作完成后，Next.js 会自动用最新数据刷新组件
    const [optimisticTasks, setOptimisticTasks] = useOptimistic(
        initialTasks,
        (state, updatedTasks: Task[]) => updatedTasks
    );
    
    const [optimisticStatuses, setOptimisticStatuses] = useOptimistic(
        initialStatuses,
        (state, updatedStatuses: Status[]) => updatedStatuses
    );
    const [optimisticContexts, setOptimisticContexts] = useOptimistic(
        initialContexts,
        (state, updatedContexts: Context[]) => updatedContexts
    );
    const [optimisticDateColumns, setOptimisticDateColumns] = useOptimistic(
        initialDateColumns,
        (state, updatedDateColumns: DateColumn[]) => updatedDateColumns
    );
    
    // 3. 获取当前视图类型 (status / context / date)，默认为 status
    const currentView = (searchParams.get('view') as ViewType) || 'status';
    const isStatusView = currentView === 'status';
    const isDateView = currentView === 'date';

    // 4. 组件内部状态
    const [activeTask, setActiveTask] = useState<Task | null>(null); // 当前正在拖拽的任务
    const [editingTask, setEditingTask] = useState<Task | null>(null); // 当前正在编辑的任务（打开 Modal）
    const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false); // 是否打开新建 Idea 弹窗
    const [activeActionColumnId, setActiveActionColumnId] = useState<string | null>(null); // 当前打开动作面板的列 ID
    const [, startTransition] = useTransition(); // 用于触发 Server Actions 的 Transition
    const [isDesktopDragEnabled, setIsDesktopDragEnabled] = useState(false); // 是否启用桌面端拖拽（移动端禁用）
    const tempTaskIdRef = useRef(0); // 用于生成临时任务 ID

    // 5. 切换视图函数：更新 URL 查询参数
    const setCurrentView = (view: ViewType) => {
        // Shallow routing to update URL without reload
        router.push(`/?view=${view}`, { scroll: false });
    };

    // 6. 监听点击事件，点击空白处关闭列动作面板
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('[data-action-panel]')) {
                setActiveActionColumnId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // 7. 配置拖拽传感器 (Sensors)
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 鼠标移动超过 8px 才开始拖拽，防止误触
            },
        }),
        useSensor(TouchSensor, {
            // Touch specific settings for mobile
            activationConstraint: {
                delay: 250, // Press and hold to drag
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // --- Column Calculation ---
    const columns = (() => {
        if (isStatusView) return optimisticStatuses;
        if (isDateView) {
            // Group tasks by date for Date View
            // We mix persistent date columns with dynamic ones derived from tasks
            const taskDates = new Set<string>();
            optimisticTasks.forEach(t => {
                if (t.createdAt) {
                    const date = new Date(t.createdAt).toISOString().split('T')[0];
                    taskDates.add(date);
                }
            });

            // Ensure today exists
            const today = new Date().toISOString().split('T')[0];
            taskDates.add(today);
            
            // Create a merged list
            const allDateIds = Array.from(new Set([...Array.from(taskDates), ...optimisticDateColumns.map(c => c.id)]));
            
            // Sort: Priority to existing columns order, then new dates descending
            // Actually, we should respect the order of existing columns, and put new ones at the beginning or end?
            // For simplicity and robustness: 
            // 1. Use existing columns in their order.
            // 2. Append any new dates that are not in existing columns, sorted descending.
            
            const existingIds = new Set(optimisticDateColumns.map(c => c.id));
            const newIds = allDateIds.filter(id => !existingIds.has(id)).sort((a, b) => b.localeCompare(a));
            
            const mergedColumns = [
                ...optimisticDateColumns,
                ...newIds.map(date => {
                    const isToday = date === today;
                    const isYesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0] === date;
                    let title = date;
                    if (isToday) title = `${date} (Today)`;
                    else if (isYesterday) title = `${date} (Yesterday)`;

                    return {
                        id: date,
                        title: title,
                        collapsed: false,
                        belowOf: null
                    } as DateColumn;
                })
            ];

            return mergedColumns as (Status | Context | DateColumn)[];
        }
        return optimisticContexts;
    })();
    const isColumnDragEnabled = isDesktopDragEnabled; // Reason: Only allow left-right column drag on desktop in horizontal layout.
    const columnOrderIndex = new Map(columns.map((c, index) => [c.id, index]));
    const columnsById = new Map(columns.map(c => [c.id, c]));
    const childrenByParent = new Map<string, (Status | Context)[]>();
    columns.forEach(c => {
        if (c.belowOf && columnsById.has(c.belowOf)) {
            const list = childrenByParent.get(c.belowOf) || [];
            list.push(c);
            childrenByParent.set(c.belowOf, list);
        }
    });
    const anchorColumns = columns.filter(c => !c.belowOf || !columnsById.has(c.belowOf)); // Reason: Define anchors as columns not placed under another column.
    const anchorOrder = anchorColumns.map(c => c.id); // Reason: Preserve anchor ordering for left/right operations.
    const stacks = anchorColumns.map(anchor => {
        const result: (Status | Context)[] = [];
        const visit = (node: Status | Context) => {
            result.push(node);
            const children = childrenByParent.get(node.id) || [];
            children.sort((a, b) => (columnOrderIndex.get(a.id) ?? 0) - (columnOrderIndex.get(b.id) ?? 0));
            children.forEach(child => visit(child));
        };
        visit(anchor);
        return result;
    });
    const anchorById = new Map<string, string>(); // Reason: Map any column to its anchor for semantic button actions.
    stacks.forEach(stack => {
        const anchorId = stack[0]?.id;
        if (!anchorId) return;
        stack.forEach(col => anchorById.set(col.id, anchorId));
    });

    useEffect(() => {
        // Reason: Use pointer precision to enable column dragging only on desktop-class inputs.
        const media = window.matchMedia('(pointer: fine)');
        const update = () => setIsDesktopDragEnabled(media.matches);
        update();
        if (media.addEventListener) {
            media.addEventListener('change', update);
            return () => media.removeEventListener('change', update);
        }
        media.addListener(update);
        return () => media.removeListener(update);
    }, []);

    // --- Actions ---

    const handleAddTask = async (columnId: string) => {
        // Optimistic update
        const tempId = `t-temp-${tempTaskIdRef.current++}`; // Reason: Use stable counter for lint purity rule compliance.
        const newTask: Task = {
            id: tempId,
            title: 'New Task',
            status: isStatusView ? columnId : 'todo',
            context: isStatusView ? 'c1' : columnId,
            tags: [],
            color: '#ffffff'
        };
        
        startTransition(async () => {
            setOptimisticTasks([...optimisticTasks, newTask]);
            // Call server
            const createdTask = await addTask(columnId, currentView);
            // In a real scenario, we might want to replace the temp ID with the real one,
            // but since the server revalidates the page, the new list will come down from props.
            setEditingTask(createdTask); // Open modal for the real task
        });
    };

    const handleAddColumn = async () => {
        if (isStatusView) return;
        const tempContext: Context = {
            id: `c-temp-${Date.now()}`,
            title: 'New List',
            color: '#cccccc',
            collapsed: false, // Reason: New lists start expanded in UI.
            belowOf: null
        };
        setOptimisticContexts([...optimisticContexts, tempContext]);
        await addContext();
    };

    const handleColumnTitleChange = async (id: string, newTitle: string) => {
        if (isDateView) {
            setOptimisticDateColumns(optimisticDateColumns.map(d => d.id === id ? { ...d, title: newTitle } : d));
        } else if (isStatusView) {
            setOptimisticStatuses(optimisticStatuses.map(s => s.id === id ? { ...s, title: newTitle } : s));
        } else {
            setOptimisticContexts(optimisticContexts.map(c => c.id === id ? { ...c, title: newTitle } : c));
        }
        await updateColumn(id, newTitle, currentView);
    };

    const handleColumnCollapsedChange = async (id: string, nextCollapsed: boolean) => {
        if (isDateView) {
            setOptimisticDateColumns(optimisticDateColumns.map(d => d.id === id ? { ...d, collapsed: nextCollapsed } : d));
        } else if (isStatusView) {
            setOptimisticStatuses(optimisticStatuses.map(s => s.id === id ? { ...s, collapsed: nextCollapsed } : s));
        } else {
            setOptimisticContexts(optimisticContexts.map(c => c.id === id ? { ...c, collapsed: nextCollapsed } : c));
        }
        await updateColumnCollapsed(id, nextCollapsed, currentView);
    };

    const handleStatusChange = async (taskId: string, newStatus: string) => {
        const updatedTasks = optimisticTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
        startTransition(async () => {
            setOptimisticTasks(updatedTasks);
            const task = optimisticTasks.find(t => t.id === taskId);
            if (task) await saveTask({ ...task, status: newStatus });
        });
    };

    const handleSaveTask = async (updatedTask: Task) => {
        startTransition(async () => {
            setOptimisticTasks(optimisticTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
            await saveTask(updatedTask);
        });
        setEditingTask(null); // Close immediately
    };

    const handleCreateIdea = async (task: Partial<Task>) => {
        const tempId = `t-idea-${tempTaskIdRef.current++}`;
        const newTask = {
            id: tempId,
            title: task.title || 'New Idea',
            status: task.status || 'todo',
            context: task.context || 'c1',
            tags: task.tags || [],
            color: task.color || '#ffffff',
            createdAt: task.createdAt || new Date().toISOString()
        } as Task;

        startTransition(async () => {
            setOptimisticTasks([...optimisticTasks, newTask]);
            await import('@/app/actions').then(({ createTaskFull }) => createTaskFull(newTask));
            setIsIdeaModalOpen(false);
        });
    };

    const handleDeleteTask = async (taskId: string) => {
        startTransition(async () => {
            setOptimisticTasks(optimisticTasks.filter(t => t.id !== taskId));
            await removeTask(taskId);
        });
        setEditingTask(null);
    };
    
    const handleDeleteContext = async (contextId: string) => {
        // Reason: Cascade delete context and its tasks; optimistic UI update first.
        startTransition(async () => {
            setOptimisticContexts(optimisticContexts.filter(c => c.id !== contextId));
            setOptimisticTasks(optimisticTasks.filter(t => t.context !== contextId));
            await deleteContextCascade(contextId);
            if (activeActionColumnId === contextId) setActiveActionColumnId(null);
        });
    };
    

    const handleMoveAbove = (columnId: string) => {
        const anchorId = anchorById.get(columnId);
        if (!anchorId) return;
        const isStackChild = !!(columnsById.get(columnId)?.belowOf);
        if (isStackChild) {
            // Reason: 当列是堆叠中的子项时，↥ 直接作为“解除”操作（返回到第一行）。
            const updatedColumns = columns.map(c =>
                c.id === columnId ? { ...c, belowOf: null } : c
            );
            startTransition(async () => {
                if (isDateView) {
                    setOptimisticDateColumns(updatedColumns as DateColumn[]);
                    await reorderDateColumns(updatedColumns as DateColumn[]);
                } else if (isStatusView) {
                    setOptimisticStatuses(updatedColumns as Status[]);
                    await reorderStatuses(updatedColumns.map(c => c.id));
                } else {
                    setOptimisticContexts(updatedColumns as Context[]);
                    await reorderContexts(updatedColumns.map(c => c.id));
                }
                await updateColumnBelowOf(columnId, null, currentView);
            });
            return;
        }
        const anchorIndex = anchorOrder.indexOf(anchorId);
        if (anchorIndex <= 0) return;
        const leftAnchorId = anchorOrder[anchorIndex - 1];
        // Uncertain: "左侧邻列" 对于堆叠列使用其所属 anchor 的左邻，如需改为其他语义请调整。
        const currentIndex = columns.findIndex(c => c.id === columnId);
        const leftIndex = columns.findIndex(c => c.id === leftAnchorId);
        if (currentIndex === -1 || leftIndex === -1) return;
        const nextColumns = arrayMove(columns, currentIndex, leftIndex);
        const leftAnchorBelowOf = columnsById.get(leftAnchorId)?.belowOf ?? null;
        const updatedColumns2 = nextColumns.map(c =>
            c.id === columnId ? { ...c, belowOf: leftAnchorBelowOf } : c
        ); // Reason: Place current column above left anchor by sharing its parent.
        startTransition(async () => {
            if (isDateView) {
                setOptimisticDateColumns(updatedColumns2 as DateColumn[]);
                await reorderDateColumns(updatedColumns2 as DateColumn[]);
            } else if (isStatusView) {
                setOptimisticStatuses(updatedColumns2 as Status[]);
                await reorderStatuses(updatedColumns2.map(c => c.id));
            } else {
                setOptimisticContexts(updatedColumns2 as Context[]);
                await reorderContexts(updatedColumns2.map(c => c.id));
            }
            await updateColumnBelowOf(columnId, leftAnchorBelowOf, currentView);
        });
    };

    const handleMoveBelow = (columnId: string) => {
        const anchorId = anchorById.get(columnId);
        if (!anchorId) return;
        const anchorIndex = anchorOrder.indexOf(anchorId);
        if (anchorIndex <= 0) return;
        const leftAnchorId = anchorOrder[anchorIndex - 1];
        const currentIndex = columns.findIndex(c => c.id === columnId);
        const leftIndex = columns.findIndex(c => c.id === leftAnchorId);
        if (currentIndex === -1 || leftIndex === -1) return;
        const nextColumns = arrayMove(columns, currentIndex, leftIndex + 1);
        const updatedColumns = nextColumns.map(c =>
            c.id === columnId ? { ...c, belowOf: leftAnchorId } : c
        ); // Reason: Place current column directly below left anchor.
        startTransition(async () => {
            if (isDateView) {
                setOptimisticDateColumns(updatedColumns as DateColumn[]);
                await reorderDateColumns(updatedColumns as DateColumn[]);
            } else if (isStatusView) {
                setOptimisticStatuses(updatedColumns as Status[]);
                await reorderStatuses(updatedColumns.map(c => c.id));
            } else {
                setOptimisticContexts(updatedColumns as Context[]);
                await reorderContexts(updatedColumns.map(c => c.id));
            }
            await updateColumnBelowOf(columnId, leftAnchorId, currentView);
        });
    };

    const handleMoveLeft = (columnId: string) => {
        const anchorId = anchorById.get(columnId);
        if (!anchorId || anchorId !== columnId) return;
        const anchorIndex = anchorOrder.indexOf(anchorId);
        if (anchorIndex <= 0) return;
        const leftAnchorId = anchorOrder[anchorIndex - 1];
        const currentIndex = columns.findIndex(c => c.id === columnId);
        const leftIndex = columns.findIndex(c => c.id === leftAnchorId);
        if (currentIndex === -1 || leftIndex === -1) return;
        const nextColumns = arrayMove(columns, currentIndex, leftIndex);
        const updatedColumns = nextColumns.map(c =>
            c.id === columnId ? { ...c, belowOf: null } : c
        ); // Reason: Keep anchor in the first row when moving horizontally.
        startTransition(async () => {
            if (isDateView) {
                setOptimisticDateColumns(updatedColumns as DateColumn[]);
                await reorderDateColumns(updatedColumns as DateColumn[]);
            } else if (isStatusView) {
                setOptimisticStatuses(updatedColumns as Status[]);
                await reorderStatuses(updatedColumns.map(c => c.id));
            } else {
                setOptimisticContexts(updatedColumns as Context[]);
                await reorderContexts(updatedColumns.map(c => c.id));
            }
            await updateColumnBelowOf(columnId, null, currentView);
        });
    };

    const handleMoveRight = (columnId: string) => {
        const anchorId = anchorById.get(columnId);
        if (!anchorId || anchorId !== columnId) return;
        const anchorIndex = anchorOrder.indexOf(anchorId);
        if (anchorIndex === -1 || anchorIndex >= anchorOrder.length - 1) return;
        const rightAnchorId = anchorOrder[anchorIndex + 1];
        const currentIndex = columns.findIndex(c => c.id === columnId);
        const rightIndex = columns.findIndex(c => c.id === rightAnchorId);
        if (currentIndex === -1 || rightIndex === -1) return;
        const targetIndex = currentIndex < rightIndex ? rightIndex : rightIndex + 1;
        const nextColumns = arrayMove(columns, currentIndex, targetIndex);
        const updatedColumns = nextColumns.map(c =>
            c.id === columnId ? { ...c, belowOf: null } : c
        ); // Reason: Keep anchor in the first row when moving horizontally.
        startTransition(async () => {
            if (isDateView) {
                setOptimisticDateColumns(updatedColumns as DateColumn[]);
                await reorderDateColumns(updatedColumns as DateColumn[]);
            } else if (isStatusView) {
                setOptimisticStatuses(updatedColumns as Status[]);
                await reorderStatuses(updatedColumns.map(c => c.id));
            } else {
                setOptimisticContexts(updatedColumns as Context[]);
                await reorderContexts(updatedColumns.map(c => c.id));
            }
            await updateColumnBelowOf(columnId, null, currentView);
        });
    };

    // Reason: Filter tasks for each column based on current view logic.
    const getTasksForColumn = (columnId: string) => {
        if (isStatusView) return optimisticTasks.filter(t => t.status === columnId);
        if (isDateView) return optimisticTasks.filter(t => t.createdAt && t.createdAt.startsWith(columnId));
        return optimisticTasks.filter(t => t.context === columnId);
    };

    const handleDragStart = (event: DragStartEvent) => {
        // Reason: Only show task overlay for task drags, not column drags.
        const activeType = event.active.data.current?.type;
        if (activeType !== 'Task') return;
        const task = optimisticTasks.find(t => t.id === event.active.id);
        if (task) setActiveTask(task);
    };

    const handleDragOver = (event: DragOverEvent) => {
        // Reason: Avoid task drag logic running during column drag.
        const activeType = event.active.data.current?.type;
        if (activeType === 'Column') return;
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;
        if (activeId === overId) return;

        const activeTask = optimisticTasks.find(t => t.id === activeId);
        const overTask = optimisticTasks.find(t => t.id === overId);

        if (!activeTask) return;

        const getContainerId = (t: Task) => isStatusView ? t.status : t.context;
        const activeContainer = getContainerId(activeTask);
        
        let overContainer = '';
        if (overTask) {
            overContainer = getContainerId(overTask);
        } else if (columns.some(c => c.id === overId)) {
            overContainer = overId as string;
        } else {
            return;
        }

        if (activeContainer !== overContainer) {
            // Optimistic update during drag
            const activeIndex = optimisticTasks.findIndex(t => t.id === activeId);
            const overIndex = overTask ? optimisticTasks.findIndex(t => t.id === overId) : optimisticTasks.length;
            
            let newTasks = [...optimisticTasks];
            const task = { ...newTasks[activeIndex] };
            
            if (isStatusView) task.status = overContainer;
            else task.context = overContainer;
            
            newTasks[activeIndex] = task;
            newTasks = arrayMove(newTasks, activeIndex, overIndex);
            
            startTransition(() => {
                setOptimisticTasks(newTasks);
            });
        }
    };

    // Reason: Handle column order change for drag and drop.
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);
        
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveColumn = active.data.current?.type === 'Column';
        if (isActiveColumn) {
            const oldIndex = columns.findIndex(c => c.id === activeId);
            const newIndex = columns.findIndex(c => c.id === overId);
            
            if (oldIndex === -1 || newIndex === -1) return;

            // Create new columns array
            const newColumns = arrayMove(columns, oldIndex, newIndex);

            startTransition(async () => {
                if (isDateView) {
                    setOptimisticDateColumns(newColumns as DateColumn[]);
                    await reorderDateColumns(newColumns as DateColumn[]);
                } else if (isStatusView) {
                    setOptimisticStatuses(newColumns as Status[]);
                    await reorderStatuses(newColumns.map(c => c.id));
                } else {
                    setOptimisticContexts(newColumns as Context[]);
                    await reorderContexts(newColumns.map(c => c.id));
                }
            });
            return;
        }
        
        const oldIndex = optimisticTasks.findIndex(t => t.id === activeId);
        const newIndex = optimisticTasks.findIndex(t => t.id === overId);

        // Even if indices are same, we might have changed columns in DragOver.
        // We need to persist the final state.
        
        // Construct the final list based on current optimistic state (which includes DragOver changes)
        // Note: DragOver already updated optimisticTasks, so we just need to re-confirm order if needed.
        // BUT DragOver updates are temporary in dnd-kit if we don't commit them.
        // Here we are manually updating state in DragOver, so optimisticTasks IS the current state.
        
        if (oldIndex !== newIndex) {
            const newTasks = arrayMove(optimisticTasks, oldIndex, newIndex);
            startTransition(async () => {
                setOptimisticTasks(newTasks);
                await moveTask(newTasks);
            });
        } else {
            // If index didn't change but column might have (handled in DragOver),
            // we still need to save.
             startTransition(async () => {
                await moveTask(optimisticTasks);
            });
        }
    };

    return (
        <div className="flex flex-col min-h-screen p-4 box-border bg-[#f4f5f7]"> {/* Reason: 允许页面高度超过视口，从而启用页面级垂直滚动 */}
            <header className="flex justify-between items-center mb-4 shrink-0">
                 <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-[#172b4d]">Polished Fusion</h1>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setCurrentView('status')}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${currentView === 'status' ? 'bg-white text-[#0079bf] shadow-sm' : 'text-gray-500 hover:text-[#0079bf]'}`}
                        >
                            Status
                        </button>
                        <button 
                            onClick={() => setCurrentView('context')}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${currentView === 'context' ? 'bg-white text-[#0079bf] shadow-sm' : 'text-gray-500 hover:text-[#0079bf]'}`}
                        >
                            Context
                        </button>
                        <button 
                            onClick={() => setCurrentView('date')}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${currentView === 'date' ? 'bg-white text-[#0079bf] shadow-sm' : 'text-gray-500 hover:text-[#0079bf]'}`}
                        >
                            Date
                        </button>
                    </div>
                <button 
                    onClick={() => setIsIdeaModalOpen(true)}
                    className="bg-[#0079bf] hover:bg-[#005582] text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors flex items-center gap-2"
                >
                    <span>➕</span> New
                </button>
            </div>
            <Link href="/" className="text-sm font-medium text-[#5e6c84] hover:bg-[#091e4214] px-3 py-1.5 rounded transition-colors">Back to Home</Link>
            </header>

            <DndContext 
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex-1 flex gap-3 pb-3 items-start overflow-x-auto"> {/* Reason: 保留横向滚动；移除 overflow-y-hidden 让纵向溢出由页面承载 */}
                    {/* Reason: Wrap columns in a horizontal SortableContext to support left-right drag on desktop. */}
                    <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                        {stacks.map(stack => {
                            const anchorId = stack[0].id;
                            const anchorIndex = anchorOrder.indexOf(anchorId);
                            const hasLeftAnchor = anchorIndex > 0;
                            const hasRightAnchor = anchorIndex >= 0 && anchorIndex < anchorOrder.length - 1;
                            return (
                            <div key={anchorId} className="flex flex-col gap-3">
                                {stack.map(col => {
                                    const isAnchor = col.id === anchorId;
                                    const isStackChild = !!(columnsById.get(col.id)?.belowOf); // Reason: Child rows should allow direct "解除" via ↥
                                    return (
                                    <Column 
                                        key={col.id}
                                        column={col}
                                        tasks={getTasksForColumn(col.id)}
                                        viewType={currentView}
                                        allContexts={optimisticContexts}
                                        onTitleChange={handleColumnTitleChange}
                                        onToggleCollapsed={handleColumnCollapsedChange}
                                        onAddTask={handleAddTask}
                                        onEditTask={setEditingTask}
                                        onStatusChange={handleStatusChange}
                                        onMoveAbove={handleMoveAbove} // Reason: Button action for placing above left neighbor或直接解除（当在堆叠中）。
                                        onMoveBelow={handleMoveBelow} // Reason: Button action for placing below left neighbor.
                                        onMoveLeft={handleMoveLeft} // Reason: Button action for horizontal left shift.
                                        onMoveRight={handleMoveRight} // Reason: Button action for horizontal right shift.
                                        canMoveAbove={hasLeftAnchor || isStackChild} // Reason: 当是堆叠子列时允许直接“解除”（无左邻也可用）。
                                        canMoveBelow={hasLeftAnchor} // Reason: Disable when no left anchor exists.
                                        canMoveLeft={isAnchor && hasLeftAnchor} // Reason: Only anchors can move horizontally.
                                        canMoveRight={isAnchor && hasRightAnchor} // Reason: Only anchors can move horizontally.
                                        className="flex-none w-[300px]"
                                        isColumnDragEnabled={isColumnDragEnabled}
                                        isActionOpen={activeActionColumnId === col.id}
                                        onToggleAction={() => setActiveActionColumnId(activeActionColumnId === col.id ? null : col.id)}
                                        onDeleteContext={!isStatusView && !isDateView ? handleDeleteContext : undefined}
                                    />
                                );
                                })}
                            </div>
                        );
                        })}
                    </SortableContext>
                    
                    {!isStatusView && !isDateView && (
                        <button 
                            onClick={handleAddColumn}
                            className="flex justify-center items-center bg-white/50 border-2 border-dashed border-[#ccc] rounded-lg text-[#5e6c84] font-medium cursor-pointer hover:bg-white/80 hover:border-[#0079bf] hover:text-[#0079bf] transition-all shrink-0 w-[300px] h-[50px]"
                        >
                            + Add List
                        </button>
                    )}
                </div>

                <DragOverlay dropAnimation={dropAnimation}>
                    {activeTask ? (
                        <TaskCard 
                            task={activeTask} 
                            viewType={currentView} 
                            contexts={optimisticContexts} 
                            onEdit={() => {}}
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>

            {editingTask && (
                <TaskModal 
                    key={editingTask.id}
                    task={editingTask}
                    statuses={optimisticStatuses}
                    contexts={optimisticContexts}
                    onSave={handleSaveTask}
                    onDelete={handleDeleteTask}
                    onClose={() => setEditingTask(null)}
                />
            )}
            {isIdeaModalOpen && (
                <IdeaModal 
                    contexts={optimisticContexts}
                    onSave={handleCreateIdea}
                    onClose={() => setIsIdeaModalOpen(false)}
                />
            )}
        </div>
    );
}
