export type ViewType = 'status' | 'context';

export interface Status {
  id: string;
  title: string;
}

export interface Context {
  id: string;
  title: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  status: string; // references Status.id
  context: string; // references Context.id
  tags: string[];
  color?: string; // Hex color for card background
}

// Helper type for drag and drop
export interface ColumnData {
    id: string;
    title: string;
    color?: string; // For context columns
    tasks: Task[];
}
