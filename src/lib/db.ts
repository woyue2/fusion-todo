import Database from 'better-sqlite3';
import { Task, Status, Context } from './types';
import { initialTasks, initialStatuses, initialContexts } from './initialData';

// Reason for better-sqlite3: It's a synchronous, fast, and simple file-based DB, 
// perfect for a local-first personal project without complex setup.
const db = new Database('./data/todo.db');

// Initialize DB schema
// Reason: Ensure tables exist on first run.
// Note: We store tags as a JSON string because SQLite doesn't have an array type.
db.exec(`
  CREATE TABLE IF NOT EXISTS statuses (
    id TEXT PRIMARY KEY,
    title TEXT
  );
  CREATE TABLE IF NOT EXISTS contexts (
    id TEXT PRIMARY KEY,
    title TEXT,
    color TEXT
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT,
    status TEXT,
    context TEXT,
    tags TEXT,
    color TEXT,
    "order" INTEGER DEFAULT 0, 
    FOREIGN KEY(status) REFERENCES statuses(id),
    FOREIGN KEY(context) REFERENCES contexts(id)
  );
`);

// Seed initial data if empty
// Reason: To provide a ready-to-use state for the user immediately.
const taskCount = db.prepare('SELECT count(*) as count FROM tasks').get() as { count: number };
if (taskCount.count === 0) {
    const insertStatus = db.prepare('INSERT INTO statuses (id, title) VALUES (?, ?)');
    initialStatuses.forEach(s => insertStatus.run(s.id, s.title));

    const insertContext = db.prepare('INSERT INTO contexts (id, title, color) VALUES (?, ?, ?)');
    initialContexts.forEach(c => insertContext.run(c.id, c.title, c.color));

    const insertTask = db.prepare('INSERT INTO tasks (id, title, status, context, tags, color, "order") VALUES (?, ?, ?, ?, ?, ?, ?)');
    initialTasks.forEach((t, index) => {
        insertTask.run(t.id, t.title, t.status, t.context, JSON.stringify(t.tags), t.color, index);
    });
}

// --- Data Access Functions ---

export function getBoardData() {
    // Reason: Fetch all necessary data in one go to render the board.
    const statuses = db.prepare('SELECT * FROM statuses').all() as Status[];
    const contexts = db.prepare('SELECT * FROM contexts').all() as Context[];
    const tasksRaw = db.prepare('SELECT * FROM tasks ORDER BY "order" ASC').all() as any[];
    
    const tasks: Task[] = tasksRaw.map(t => ({
        ...t,
        tags: JSON.parse(t.tags)
    }));

    return { statuses, contexts, tasks };
}

export function createTask(task: Task) {
    // Reason: "order" is set to max+1 to put it at the end.
    const maxOrder = db.prepare('SELECT MAX("order") as max FROM tasks').get() as { max: number };
    const newOrder = (maxOrder.max || 0) + 1;
    
    const stmt = db.prepare('INSERT INTO tasks (id, title, status, context, tags, color, "order") VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(task.id, task.title, task.status, task.context, JSON.stringify(task.tags), task.color, newOrder);
    return task;
}

export function updateTask(task: Task) {
    const stmt = db.prepare('UPDATE tasks SET title = ?, status = ?, context = ?, tags = ?, color = ? WHERE id = ?');
    stmt.run(task.title, task.status, task.context, JSON.stringify(task.tags), task.color, task.id);
    return task;
}

export function deleteTask(taskId: string) {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
}

export function createContext(context: Context) {
    db.prepare('INSERT INTO contexts (id, title, color) VALUES (?, ?, ?)').run(context.id, context.title, context.color);
    return context;
}

export function updateColumnTitle(id: string, title: string, type: 'status' | 'context') {
    if (type === 'status') {
        db.prepare('UPDATE statuses SET title = ? WHERE id = ?').run(title, id);
    } else {
        db.prepare('UPDATE contexts SET title = ? WHERE id = ?').run(title, id);
    }
}

export function reorderTasks(tasks: Task[]) {
    // Reason: Batch update order for drag-and-drop persistence.
    // Using a transaction ensures data integrity.
    const update = db.prepare('UPDATE tasks SET "order" = ? WHERE id = ?');
    const updateTransaction = db.transaction((tasks: Task[]) => {
        tasks.forEach((task, index) => {
            update.run(index, task.id);
        });
    });
    updateTransaction(tasks);
}
