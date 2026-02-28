import Database from 'better-sqlite3';
import { Task, Status, Context } from './types';
import { initialTasks, initialStatuses, initialContexts } from './initialData';

// Reason for better-sqlite3: It's a synchronous, fast, and simple file-based DB, 
// perfect for a local-first personal project without complex setup.
const db = new Database('./data/todo.db');

// Initialize DB schema
// Reason: Ensure tables exist on first run.
// Reason: Add order columns to statuses/contexts for column drag persistence.
// Note: We store tags as a JSON string because SQLite doesn't have an array type.
db.exec(`
  CREATE TABLE IF NOT EXISTS statuses (
    id TEXT PRIMARY KEY,
    title TEXT,
    "order" INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS contexts (
    id TEXT PRIMARY KEY,
    title TEXT,
    color TEXT,
    "order" INTEGER DEFAULT 0
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

// Reason: Ensure existing databases have column order fields for column drag persistence.
const ensureOrderColumn = (tableName: 'statuses' | 'contexts') => {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
    const hasOrder = columns.some(c => c.name === 'order');
    if (!hasOrder) {
        db.exec(`ALTER TABLE ${tableName} ADD COLUMN "order" INTEGER DEFAULT 0`);
        db.exec(`UPDATE ${tableName} SET "order" = rowid - 1`);
    }
};
ensureOrderColumn('statuses');
ensureOrderColumn('contexts');

// Seed initial data if empty
// Reason: To provide a ready-to-use state for the user immediately.
const taskCount = db.prepare('SELECT count(*) as count FROM tasks').get() as { count: number };
if (taskCount.count === 0) {
    const insertStatus = db.prepare('INSERT INTO statuses (id, title, "order") VALUES (?, ?, ?)');
    initialStatuses.forEach((s, index) => insertStatus.run(s.id, s.title, index)); // Reason: Seed status order for column drag.

    const insertContext = db.prepare('INSERT INTO contexts (id, title, color, "order") VALUES (?, ?, ?, ?)');
    initialContexts.forEach((c, index) => insertContext.run(c.id, c.title, c.color, index)); // Reason: Seed context order for column drag.

    const insertTask = db.prepare('INSERT INTO tasks (id, title, status, context, tags, color, "order") VALUES (?, ?, ?, ?, ?, ?, ?)');
    initialTasks.forEach((t, index) => {
        insertTask.run(t.id, t.title, t.status, t.context, JSON.stringify(t.tags), t.color, index);
    });
}

// --- Data Access Functions ---

export function getBoardData() {
    // Reason: Fetch all necessary data in one go to render the board.
    const statuses = db.prepare('SELECT * FROM statuses ORDER BY "order" ASC').all() as Status[]; // Reason: Respect persisted column order.
    const contexts = db.prepare('SELECT * FROM contexts ORDER BY "order" ASC').all() as Context[]; // Reason: Respect persisted column order.
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
    // Reason: New contexts should be appended to the end of the current column order.
    const maxOrder = db.prepare('SELECT MAX("order") as max FROM contexts').get() as { max: number };
    const newOrder = (maxOrder.max || 0) + 1;
    db.prepare('INSERT INTO contexts (id, title, color, "order") VALUES (?, ?, ?, ?)').run(context.id, context.title, context.color, newOrder);
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

export function reorderStatuses(statusIds: string[]) {
    // Reason: Persist status column order after drag.
    const update = db.prepare('UPDATE statuses SET "order" = ? WHERE id = ?');
    const updateTransaction = db.transaction((ids: string[]) => {
        ids.forEach((id, index) => {
            update.run(index, id);
        });
    });
    updateTransaction(statusIds);
}

export function reorderContexts(contextIds: string[]) {
    // Reason: Persist context column order after drag.
    const update = db.prepare('UPDATE contexts SET "order" = ? WHERE id = ?');
    const updateTransaction = db.transaction((ids: string[]) => {
        ids.forEach((id, index) => {
            update.run(index, id);
        });
    });
    updateTransaction(contextIds);
}
