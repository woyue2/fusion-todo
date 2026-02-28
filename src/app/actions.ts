'use server';

// 1. Server Actions 模块：处理数据变更，直接运行在服务端
// 这些函数可以直接被 Client Component 调用，Next.js 会自动处理序列化和网络请求

import { revalidatePath } from 'next/cache';
import { 
    getBoardData, 
    createTask as dbCreateTask, 
    updateTask as dbUpdateTask, 
    deleteTask as dbDeleteTask,
    createContext as dbCreateContext,
    updateColumnTitle as dbUpdateColumnTitle,
    updateColumnCollapsed as dbUpdateColumnCollapsed,
    updateColumnBelowOf as dbUpdateColumnBelowOf,
    reorderTasks as dbReorderTasks,
    reorderStatuses as dbReorderStatuses,
    reorderContexts as dbReorderContexts,
    reorderDateColumns as dbReorderDateColumns
} from '@/lib/db';
import { Task, Context, DateColumn } from '@/lib/types';

// 2. fetchBoard：获取看板的初始数据
// 这个函数在 page.tsx (Server Component) 中被调用
export async function fetchBoard() {
    return getBoardData();
}

// 3. addTask：创建一个新任务
export async function addTask(columnId: string, viewType: 'status' | 'context' | 'date') {
    // 4. 构建新任务对象，设置默认值
    const newTask: Task = {
        id: `t${Date.now()}`,
        title: 'New Task',
        // 根据当前视图类型，决定任务初始的 status 和 context
        status: viewType === 'status' ? columnId : 'todo',
        context: viewType === 'status' ? 'c1' : (viewType === 'date' ? 'c1' : columnId),
        tags: [],
        color: '#ffffff',
        createdAt: new Date().toISOString()
    };
    // 5. 写入数据库
    dbCreateTask(newTask);
    // 6. 刷新页面缓存，让客户端看到最新数据
    revalidatePath('/');
    return newTask;
}

// 7. createTaskFull：根据已有对象创建完整任务（例如从 IdeaModal 创建）
export async function createTaskFull(task: Task) {
    const newTask: Task = {
        ...task,
        id: `t${Date.now()}` // 确保服务端生成唯一ID
    };
    dbCreateTask(newTask);
    revalidatePath('/');
    return newTask;
}

// 8. saveTask：更新任务信息（标题、状态、颜色等）
export async function saveTask(task: Task) {
    dbUpdateTask(task);
    revalidatePath('/');
}

// 9. removeTask：删除指定任务
export async function removeTask(taskId: string) {
    dbDeleteTask(taskId);
    revalidatePath('/');
}

// 10. addContext：添加一个新的 Context（列表）
export async function addContext() {
    const newContext: Context = {
        id: `c${Date.now()}`,
        title: 'New List',
        color: '#' + Math.floor(Math.random()*16777215).toString(16), // 生成随机颜色
        collapsed: false,
        belowOf: null
    };
    dbCreateContext(newContext);
    revalidatePath('/');
    return newContext;
}

// 11. updateColumn：更新列标题
export async function updateColumn(id: string, title: string, type: 'status' | 'context' | 'date') {
    dbUpdateColumnTitle(id, title, type);
    revalidatePath('/');
}

// 12. updateColumnCollapsed：更新列的折叠状态
export async function updateColumnCollapsed(id: string, collapsed: boolean, type: 'status' | 'context' | 'date') {
    dbUpdateColumnCollapsed(id, collapsed, type);
    revalidatePath('/');
}

// 13. updateColumnBelowOf：更新列的堆叠关系（哪个列在哪个列下面）
export async function updateColumnBelowOf(id: string, belowOf: string | null, type: 'status' | 'context' | 'date') {
    dbUpdateColumnBelowOf(id, belowOf, type);
    revalidatePath('/');
}

// 14. moveTask：拖拽任务后更新其状态和顺序
export async function moveTask(tasks: Task[]) {
    // 15. 更新所有受影响任务的数据库记录
    tasks.forEach(t => dbUpdateTask(t)); 
    // 16. 更新任务的排序字段
    dbReorderTasks(tasks);
    
    revalidatePath('/');
}

// 17. reorderStatuses：重新排序 Status 列
export async function reorderStatuses(statusIds: string[]) {
    dbReorderStatuses(statusIds);
    revalidatePath('/');
}

// 18. reorderContexts：重新排序 Context 列
export async function reorderContexts(contextIds: string[]) {
    dbReorderContexts(contextIds);
    revalidatePath('/');
}

// 19. reorderDateColumns：重新排序日期列
export async function reorderDateColumns(dateColumns: DateColumn[]) {
    dbReorderDateColumns(dateColumns);
    revalidatePath('/');
}

// 20. deleteContextCascade：级联删除 Context 列及其包含的所有任务
export async function deleteContextCascade(contextId: string) {
    // 动态导入 db 模块以避免循环依赖问题（如有）
    const mod = await import('@/lib/db');
    mod.deleteContextCascade(contextId);
    revalidatePath('/');
}
