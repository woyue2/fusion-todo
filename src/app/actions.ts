'use server';

import { revalidatePath } from 'next/cache';
import { 
    getBoardData, 
    createTask as dbCreateTask, 
    updateTask as dbUpdateTask, 
    deleteTask as dbDeleteTask,
    createContext as dbCreateContext,
    updateColumnTitle as dbUpdateColumnTitle,
    reorderTasks as dbReorderTasks
} from '@/lib/db';
import { Task, Context } from '@/lib/types';

// Reason: Server Actions provide a clean way to handle form submissions and data mutations directly from React components.
// They automatically handle serialization and can revalidate the cache to update the UI.

export async function fetchBoard() {
    // Reason: Initial data fetch for the board.
    return getBoardData();
}

export async function addTask(columnId: string, viewType: 'status' | 'context') {
    const newTask: Task = {
        id: `t${Date.now()}`,
        title: 'New Task',
        status: viewType === 'status' ? columnId : 'todo',
        context: viewType === 'status' ? 'c1' : columnId,
        tags: [],
        color: '#ffffff'
    };
    dbCreateTask(newTask);
    revalidatePath('/');
    return newTask;
}

export async function saveTask(task: Task) {
    dbUpdateTask(task);
    revalidatePath('/');
}

export async function removeTask(taskId: string) {
    dbDeleteTask(taskId);
    revalidatePath('/');
}

export async function addContext() {
    const newContext: Context = {
        id: `c${Date.now()}`,
        title: 'New List',
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
    };
    dbCreateContext(newContext);
    revalidatePath('/');
    return newContext;
}

export async function updateColumn(id: string, title: string, type: 'status' | 'context') {
    dbUpdateColumnTitle(id, title, type);
    revalidatePath('/');
}

export async function moveTask(tasks: Task[]) {
    // Reason: Persist the new order and status/context of tasks after a drag operation.
    // We update the entire list order to keep it simple and robust.
    
    // First, update the specific tasks that might have changed status/context
    // Optimization: In a real app, we'd only update the changed ones, but here we can just update all or rely on reorder.
    // Actually, reorderTasks only updates "order". We need to make sure status/context changes are also saved.
    
    tasks.forEach(t => dbUpdateTask(t)); 
    dbReorderTasks(tasks);
    
    revalidatePath('/');
}
