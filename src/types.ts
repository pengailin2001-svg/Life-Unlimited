import { format, isSameDay, startOfDay, addDays, subDays } from 'date-fns';

export type TaskType = 'CORE' | 'SIDE';

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  completed: boolean;
  date: string; // ISO string (YYYY-MM-DD)
  createdAt: number;
}

export interface Diary {
  id: string;
  date: string; // ISO string (YYYY-MM-DD)
  content: string;
}

export interface Reflection {
  id: string;
  date: string; // ISO string (YYYY-MM-DD)
  content: string;
}

export type ThemeColor = 'green' | 'blue' | 'purple' | string;

export interface AppState {
  tasks: Task[];
  diaries: Diary[];
  reflections: Reflection[];
  theme: ThemeColor;
  lastOpened: string; // Date string
}

export const STORAGE_KEY = 'life_unlimited_state';

export const DEFAULT_STATE: AppState = {
  tasks: [],
  diaries: [],
  reflections: [],
  theme: '#22c55e', // Default green
  lastOpened: format(new Date(), 'yyyy-MM-dd'),
};
