import { useState, useEffect } from 'react';
import { format, isBefore, startOfDay, parseISO, addDays, isSameDay } from 'date-fns';
import { AppState, DEFAULT_STATE, STORAGE_KEY, Task } from './types.ts';

export function useAppStore() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_STATE, ...parsed };
      } catch (e) {
        return DEFAULT_STATE;
      }
    }
    return DEFAULT_STATE;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Daily Rollover Logic
  useEffect(() => {
    const checkRollover = () => {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      if (state.lastOpened !== todayStr) {
        rollover(todayStr);
      }
    };

    checkRollover();
    
    // Check when returning to the app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkRollover();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.lastOpened]);

  const rollover = (todayStr: string) => {
    setState((prev) => {
      const yesterdayStr = prev.lastOpened;
      
      const newTasks = prev.tasks.map(task => {
        // Any task scheduled for todayStr or later stays as is.
        // Any task scheduled for a date before todayStr:
        // 1. If it was a "tomorrow" task from the last time we opened the app, 
        //    it should now be "today".
        const taskDateObj = parseISO(task.date);
        const lastOpenedObj = parseISO(prev.lastOpened);
        
        // If task was for tomorrow relative to last opened
        if (isSameDay(taskDateObj, addDays(lastOpenedObj, 1)) || isBefore(taskDateObj, parseISO(todayStr))) {
          if (!task.completed) {
            // Uncompleted tasks from the past or "scheduled tomorrow" move to current today
            return { ...task, date: todayStr };
          }
        }
        return task;
      });

      return {
        ...prev,
        tasks: newTasks,
        lastOpened: todayStr
      };
    });
  };

  const addTask = (title: string, date: string, type: 'CORE' | 'SIDE' = 'CORE') => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      type,
      completed: false,
      date,
      createdAt: Date.now(),
    };
    setState(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
  };

  const toggleTask = (id: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    }));
  };

  const deleteTask = (id: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== id)
    }));
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
  };

  const saveDiary = (date: string, content: string) => {
    setState(prev => {
      const existing = prev.diaries.find(d => d.date === date);
      if (existing) {
        return {
          ...prev,
          diaries: prev.diaries.map(d => d.date === date ? { ...d, content } : d)
        };
      }
      return {
        ...prev,
        diaries: [...prev.diaries, { id: crypto.randomUUID(), date, content }]
      };
    });
  };

  const saveReflection = (date: string, content: string) => {
    setState(prev => {
      const existing = prev.reflections.find(r => r.date === date);
      if (existing) {
        return {
          ...prev,
          reflections: prev.reflections.map(r => r.date === date ? { ...r, content } : r)
        };
      }
      return {
        ...prev,
        reflections: [...prev.reflections, { id: crypto.randomUUID(), date, content }]
      };
    });
  };

  const setTheme = (theme: string) => {
    setState(prev => ({ ...prev, theme }));
  };

  return {
    state,
    addTask,
    toggleTask,
    deleteTask,
    updateTask,
    saveDiary,
    saveReflection,
    setTheme,
  };
}
