export type ViewType = 'status' | 'context' | 'date';

export interface Status {
  id: string;
  title: string;
  collapsed: boolean; // Reason: Persisted column collapse state for status view.
  belowOf?: string | null;
}

export interface Context {
  id: string;
  title: string;
  color: string;
  collapsed: boolean; // Reason: Persisted column collapse state for context view.
  belowOf?: string | null;
}

export interface DateColumn {
  id: string; // YYYY-MM-DD
  title: string;
  collapsed: boolean;
  belowOf?: string | null;
}

export interface Task {
  id: string;
  title: string;
  status: string; // references Status.id
  context: string; // references Context.id
  tags: string[];
  color?: string; // Hex color for card background
  createdAt?: string; // ISO 8601 string, optional for migration compatibility
}

// Helper type for drag and drop
export interface ColumnData {
    id: string;
    title: string;
    color?: string; // For context columns
    tasks: Task[];
}
