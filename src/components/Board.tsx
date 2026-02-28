'use client';

import React, { useState, useOptimistic, useTransition, useEffect } from 'react';
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
import { ViewType, Task, Status, Context } from '@/lib/types';
import { Column } from './Column';
import { ViewSwitcher } from './ViewSwitcher';
import { TaskModal } from './TaskModal';
import { TaskCard } from './TaskCard';
import { 
    addTask, 
    saveTask, 
    removeTask, 
    addContext, 
    updateColumn, 
    updateColumnCollapsed,
    moveTask,
    reorderStatuses,
    reorderContexts 
} from '@/app/actions';

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
    initialTasks: Task[];
}

export function Board({ initialStatuses, initialContexts, initialTasks }: BoardProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Reason: useOptimistic allows immediate UI updates while Server Actions run in background.
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
    
    const currentView = (searchParams.get('view') as ViewType) || 'status';

    const [isVertical, setIsVertical] = useState(false);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [, startTransition] = useTransition();
    const [isDesktopDragEnabled, setIsDesktopDragEnabled] = useState(false); // Reason: Disable column drag on mobile per requirement.

    const setCurrentView = (view: ViewType) => {
        // Shallow routing to update URL without reload
        router.push(`/?view=${view}`, { scroll: false });
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Increased slightly to prevent accidental drags
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

    const isStatusView = currentView === 'status';
    const columns = isStatusView ? optimisticStatuses : optimisticContexts;
    const isColumnDragEnabled = isDesktopDragEnabled && !isVertical; // Reason: Only allow left-right column drag on desktop in horizontal layout.

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
        const tempId = `t-temp-${Date.now()}`;
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
            collapsed: false // Reason: New lists start expanded in UI.
        };
        setOptimisticContexts([...optimisticContexts, tempContext]);
        await addContext();
    };

    const handleColumnTitleChange = async (id: string, newTitle: string) => {
        if (isStatusView) {
            setOptimisticStatuses(optimisticStatuses.map(s => s.id === id ? { ...s, title: newTitle } : s));
        } else {
            setOptimisticContexts(optimisticContexts.map(c => c.id === id ? { ...c, title: newTitle } : c));
        }
        await updateColumn(id, newTitle, currentView);
    };

    const handleColumnCollapsedChange = async (id: string, nextCollapsed: boolean) => {
        // Reason: Optimistically update collapse state while persisting to DB.
        if (isStatusView) {
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

    const handleDeleteTask = async (taskId: string) => {
        startTransition(async () => {
            setOptimisticTasks(optimisticTasks.filter(t => t.id !== taskId));
            await removeTask(taskId);
        });
        setEditingTask(null);
    };

    // --- DnD Handlers ---

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

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);
        
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        // Reason: Persist column order separately when a column drag ends.
        const activeType = active.data.current?.type;
        if (activeType === 'Column') {
            const columnIds = columns.map(c => c.id);
            const oldIndex = columnIds.indexOf(activeId as string);
            const newIndex = columnIds.indexOf(overId as string);
            if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
            const nextColumns = arrayMove(columns, oldIndex, newIndex);
            startTransition(async () => {
                if (isStatusView) {
                    setOptimisticStatuses(nextColumns as Status[]);
                    await reorderStatuses(nextColumns.map(c => c.id));
                } else {
                    setOptimisticContexts(nextColumns as Context[]);
                    await reorderContexts(nextColumns.map(c => c.id));
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
        <div className="flex flex-col h-screen p-4 box-border bg-[#f4f5f7]">
            <header className="flex justify-between items-center mb-4 shrink-0">
                 <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-[#172b4d]">Polished Fusion</h1>
                    <ViewSwitcher 
                        currentView={currentView} 
                        onViewChange={setCurrentView}
                        onLayoutToggle={() => setIsVertical(!isVertical)}
                    />
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
                <div className={`flex-1 flex gap-3 pb-3 items-start ${isVertical ? 'flex-col overflow-y-auto overflow-x-hidden' : 'overflow-x-auto overflow-y-hidden'}`}>
                    {/* Reason: Wrap columns in a horizontal SortableContext to support left-right drag on desktop. */}
                    <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                        {columns.map(col => (
                            <Column 
                                key={col.id}
                                column={col}
                                tasks={optimisticTasks.filter(t => isStatusView ? t.status === col.id : t.context === col.id)}
                                viewType={currentView}
                                allContexts={optimisticContexts}
                                onTitleChange={handleColumnTitleChange}
                                onToggleCollapsed={handleColumnCollapsedChange}
                                onAddTask={handleAddTask}
                                onEditTask={setEditingTask}
                                onStatusChange={handleStatusChange}
                                className={isVertical ? 'w-full flex-none' : 'flex-none w-[300px]'}
                                isColumnDragEnabled={isColumnDragEnabled}
                            />
                        ))}
                    </SortableContext>
                    
                    {!isStatusView && (
                        <button 
                            onClick={handleAddColumn}
                            className={`flex justify-center items-center bg-white/50 border-2 border-dashed border-[#ccc] rounded-lg text-[#5e6c84] font-medium cursor-pointer hover:bg-white/80 hover:border-[#0079bf] hover:text-[#0079bf] transition-all shrink-0 ${isVertical ? 'w-full h-[60px]' : 'w-[300px] h-[50px]'}`}
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
        </div>
    );
}
