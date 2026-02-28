import Database from 'better-sqlite3';
import { Task, Status, Context, DateColumn } from './types';
import { initialTasks, initialStatuses, initialContexts } from './initialData';

// Reason for better-sqlite3: It's a synchronous, fast, and simple file-based DB, 
// perfect for a local-first personal project without complex setup.
const db = new Database('./data/todo.db');

// Initialize DB schema
// Reason: Ensure tables exist on first run.
// Reason: Add order columns to statuses/contexts for column drag persistence.
// Reason: Add collapsed columns to persist column folding per status/context.
// Note: We store tags as a JSON string because SQLite doesn't have an array type.
db.exec(`
  CREATE TABLE IF NOT EXISTS statuses (
    id TEXT PRIMARY KEY,
    title TEXT,
    "order" INTEGER DEFAULT 0,
    collapsed INTEGER DEFAULT 0,
    belowOf TEXT
  );
  CREATE TABLE IF NOT EXISTS contexts (
    id TEXT PRIMARY KEY,
    title TEXT,
    color TEXT,
    "order" INTEGER DEFAULT 0,
    collapsed INTEGER DEFAULT 0,
    belowOf TEXT
  );
  CREATE TABLE IF NOT EXISTS date_columns (
    id TEXT PRIMARY KEY,
    title TEXT,
    "order" INTEGER DEFAULT 0,
    collapsed INTEGER DEFAULT 0,
    belowOf TEXT
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT,
    status TEXT,
    context TEXT,
    tags TEXT,
    color TEXT,
    createdAt TEXT,
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

// Reason: Ensure existing databases have collapsed fields for column fold persistence.
const ensureCollapsedColumn = (tableName: 'statuses' | 'contexts') => {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
    const hasCollapsed = columns.some(c => c.name === 'collapsed');
    if (!hasCollapsed) {
        db.exec(`ALTER TABLE ${tableName} ADD COLUMN collapsed INTEGER DEFAULT 0`);
        db.exec(`UPDATE ${tableName} SET collapsed = 0 WHERE collapsed IS NULL`);
    }
};
ensureCollapsedColumn('statuses');
ensureCollapsedColumn('contexts');

const ensureBelowOfColumn = (tableName: 'statuses' | 'contexts') => {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
    const hasBelowOf = columns.some(c => c.name === 'belowOf');
    if (!hasBelowOf) {
        db.exec(`ALTER TABLE ${tableName} ADD COLUMN belowOf TEXT`);
    }
};
ensureBelowOfColumn('statuses');
ensureBelowOfColumn('contexts');

// Reason: Ensure existing databases have createdAt field.
const ensureCreatedAtColumn = () => {
    const columns = db.prepare(`PRAGMA table_info(tasks)`).all() as { name: string }[];
    const hasCreatedAt = columns.some(c => c.name === 'createdAt');
    if (!hasCreatedAt) {
        db.exec(`ALTER TABLE tasks ADD COLUMN createdAt TEXT`);
        // Backfill with current time for existing tasks
        const now = new Date().toISOString();
        db.prepare('UPDATE tasks SET createdAt = ? WHERE createdAt IS NULL').run(now);
    }
};
ensureCreatedAtColumn();

// Seed initial data if empty
// Reason: To provide a ready-to-use state for the user immediately.
const taskCount = db.prepare('SELECT count(*) as count FROM tasks').get() as { count: number };
if (taskCount.count === 0) {
    const insertStatus = db.prepare('INSERT INTO statuses (id, title, "order", collapsed, belowOf) VALUES (?, ?, ?, ?, ?)');
    initialStatuses.forEach((s, index) => insertStatus.run(s.id, s.title, index, s.collapsed ? 1 : 0, s.belowOf ?? null)); // Reason: Seed status order and collapse state.

    const insertContext = db.prepare('INSERT INTO contexts (id, title, color, "order", collapsed, belowOf) VALUES (?, ?, ?, ?, ?, ?)');
    initialContexts.forEach((c, index) => insertContext.run(c.id, c.title, c.color, index, c.collapsed ? 1 : 0, c.belowOf ?? null)); // Reason: Seed context order and collapse state.

    const insertTask = db.prepare('INSERT INTO tasks (id, title, status, context, tags, color, createdAt, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    initialTasks.forEach((t, index) => {
        insertTask.run(t.id, t.title, t.status, t.context, JSON.stringify(t.tags), t.color, t.createdAt ?? new Date().toISOString(), index);
    });
}

const ensureStatusExists = (id: string, title: string) => {
    // Reason: Backfill new status columns for existing databases.
    const exists = db.prepare('SELECT COUNT(*) as count FROM statuses WHERE id = ?').get(id) as { count: number };
    if (!exists.count) {
        const maxOrder = db.prepare('SELECT MAX("order") as max FROM statuses').get() as { max: number };
        const newOrder = (maxOrder.max || 0) + 1;
        db.prepare('INSERT INTO statuses (id, title, "order", collapsed, belowOf) VALUES (?, ?, ?, ?, ?)').run(id, title, newOrder, 0, null);
    }
};
ensureStatusExists('when-free', 'When Free'); // Reason: Ensure When Free status exists in persisted data.

// --- Data Access Functions ---

export function getBoardData() {
    // Reason: Fetch all necessary data in one go to render the board.
    type StatusRow = { id: string; title: string; order: number; collapsed: number | null; belowOf: string | null }; // Reason: Align DB row shape for status columns.
    type ContextRow = { id: string; title: string; color: string; order: number; collapsed: number | null; belowOf: string | null }; // Reason: Align DB row shape for context columns.
    type DateRow = { id: string; title: string; order: number; collapsed: number | null; belowOf: string | null }; // Reason: Align DB row shape for date columns.
    type TaskRow = { id: string; title: string; status: string; context: string; tags: string; color: string | null; createdAt: string | null; order: number }; // Reason: Align DB row shape for tasks.
    const statusesRaw = db.prepare('SELECT * FROM statuses ORDER BY "order" ASC').all() as StatusRow[]; // Reason: Respect persisted column order.
    const contextsRaw = db.prepare('SELECT * FROM contexts ORDER BY "order" ASC').all() as ContextRow[]; // Reason: Respect persisted column order.
    const dateColumnsRaw = db.prepare('SELECT * FROM date_columns ORDER BY "order" ASC').all() as DateRow[];
    const tasksRaw = db.prepare('SELECT * FROM tasks ORDER BY "order" ASC').all() as TaskRow[];

    const statuses: Status[] = statusesRaw.map(s => ({
        ...s,
        collapsed: Boolean(s.collapsed),
        belowOf: s.belowOf ?? null
    })); // Reason: Normalize SQLite integer to boolean for SSR-consistent rendering.
    const contexts: Context[] = contextsRaw.map(c => ({
        ...c,
        collapsed: Boolean(c.collapsed),
        belowOf: c.belowOf ?? null
    })); // Reason: Normalize SQLite integer to boolean for SSR-consistent rendering.

    const dateColumns: DateColumn[] = dateColumnsRaw.map(d => ({
        ...d,
        collapsed: Boolean(d.collapsed),
        belowOf: d.belowOf ?? null
    }));
    
    const tasks: Task[] = tasksRaw.map(t => ({
        ...t,
        color: t.color ?? undefined,
        tags: JSON.parse(t.tags),
        createdAt: t.createdAt ?? new Date().toISOString()
    }));

    return { statuses, contexts, tasks, dateColumns };
}

export function createTask(task: Task) {
    // Reason: "order" is set to max+1 to put it at the end.
    const maxOrder = db.prepare('SELECT MAX("order") as max FROM tasks').get() as { max: number };
    const newOrder = (maxOrder.max || 0) + 1;
    
    const stmt = db.prepare('INSERT INTO tasks (id, title, status, context, tags, color, createdAt, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(task.id, task.title, task.status, task.context, JSON.stringify(task.tags), task.color, task.createdAt ?? new Date().toISOString(), newOrder);
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
    db.prepare('INSERT INTO contexts (id, title, color, "order", collapsed, belowOf) VALUES (?, ?, ?, ?, ?, ?)').run(context.id, context.title, context.color, newOrder, context.collapsed ? 1 : 0, context.belowOf ?? null);
    return context;
}

export function updateColumnTitle(id: string, title: string, type: 'status' | 'context' | 'date') {
    if (type === 'status') {
        db.prepare('UPDATE statuses SET title = ? WHERE id = ?').run(title, id);
    } else if (type === 'context') {
        db.prepare('UPDATE contexts SET title = ? WHERE id = ?').run(title, id);
    } else {
        // Ensure date column exists before updating
        ensureDateColumn(id);
        db.prepare('UPDATE date_columns SET title = ? WHERE id = ?').run(title, id);
    }
}

export function updateColumnCollapsed(id: string, collapsed: boolean, type: 'status' | 'context' | 'date') {
    // Reason: Persist column collapse state per status/context.
    const value = collapsed ? 1 : 0;
    if (type === 'status') {
        db.prepare('UPDATE statuses SET collapsed = ? WHERE id = ?').run(value, id);
    } else if (type === 'context') {
        db.prepare('UPDATE contexts SET collapsed = ? WHERE id = ?').run(value, id);
    } else {
        ensureDateColumn(id);
        db.prepare('UPDATE date_columns SET collapsed = ? WHERE id = ?').run(value, id);
    }
}

export function updateColumnBelowOf(id: string, belowOf: string | null, type: 'status' | 'context' | 'date') {
    if (type === 'status') {
        db.prepare('UPDATE statuses SET belowOf = ? WHERE id = ?').run(belowOf, id);
    } else if (type === 'context') {
        db.prepare('UPDATE contexts SET belowOf = ? WHERE id = ?').run(belowOf, id);
    } else {
        ensureDateColumn(id);
        db.prepare('UPDATE date_columns SET belowOf = ? WHERE id = ?').run(belowOf, id);
    }
}

export function reorderDateColumns(dateColumns: DateColumn[]) {
    const upsert = db.prepare(`
        INSERT INTO date_columns (id, title, "order", collapsed, belowOf)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          "order" = excluded."order",
          collapsed = excluded.collapsed,
          belowOf = excluded.belowOf
    `);
    const upsertTransaction = db.transaction((columns: DateColumn[]) => {
        columns.forEach((column, index) => {
            upsert.run(
                column.id,
                column.title,
                index,
                column.collapsed ? 1 : 0,
                column.belowOf ?? null
            );
        });
    });
    upsertTransaction(dateColumns);
}

function ensureDateColumn(id: string) {
    const exists = db.prepare('SELECT COUNT(*) as count FROM date_columns WHERE id = ?').get(id) as { count: number };
    if (!exists.count) {
        const maxOrder = db.prepare('SELECT MAX("order") as max FROM date_columns').get() as { max: number };
        const newOrder = (maxOrder.max || 0) + 1;
        db.prepare('INSERT INTO date_columns (id, title, "order", collapsed, belowOf) VALUES (?, ?, ?, 0, NULL)').run(id, id, newOrder);
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
