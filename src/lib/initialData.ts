import { Task, Status, Context } from './types';

export const initialStatuses: Status[] = [
  // Reason: Seed columns as expanded by default.
  { id: 'todo', title: 'To Do', collapsed: false, belowOf: null },
  { id: 'doing', title: 'In Progress', collapsed: false, belowOf: null },
  { id: 'done', title: 'Done', collapsed: false, belowOf: null },
  { id: 'when-free', title: 'When Free', collapsed: false, belowOf: null } // Reason: Add When Free as a status column.
];

export const initialContexts: Context[] = [
  // Reason: Seed columns as expanded by default.
  // Reason: When Free is modeled as a status, not a context.
  { id: 'c1', title: 'Urgent', color: '#ff5252', collapsed: false, belowOf: null },     // Red
  { id: 'c2', title: 'Deep Work', color: '#448aff', collapsed: false, belowOf: null },  // Blue
  { id: 'c3', title: 'Routine', color: '#69f0ae', collapsed: false, belowOf: null }     // Green
];

export const initialTasks: Task[] = [
  { id: 't1', title: 'Fix Login Bug', status: 'doing', context: 'c1', tags: ['Bug'], color: '#fff0f0' },
  { id: 't2', title: 'Write Documentation', status: 'todo', context: 'c2', tags: ['Docs'], color: '#ffffff' },
  { id: 't3', title: 'Weekly Review', status: 'done', context: 'c3', tags: ['Admin'], color: '#f0f8ff' },
  { id: 't4', title: 'Buy Groceries', status: 'todo', context: 'c3', tags: ['Personal'], color: '#fffff0' },
  { id: 't5', title: 'Design System Update', status: 'todo', context: 'c2', tags: ['Design'], color: '#e6e6fa' }
];

export const CARD_COLORS = [
    { hex: '#ffffff', name: 'Default' },
    { hex: '#fff0f0', name: 'Red' },     
    { hex: '#fffacd', name: 'Yellow' },  
    { hex: '#e0ffff', name: 'Cyan' },    
    { hex: '#f0fff0', name: 'Green' },   
    { hex: '#e6e6fa', name: 'Purple' }
];
