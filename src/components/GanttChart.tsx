import { useCallback, useMemo, useRef, useEffect } from 'react';
import { Gantt, Willow, WillowDark } from '@svar-ui/react-gantt';
import '@svar-ui/react-gantt/all.css';
import type { GanttTask } from '../types/gantt';
import './GanttChart.css';

interface GanttChartProps {
  tasks: GanttTask[];
  theme: 'light' | 'dark';
  onTaskClick: (taskId: string) => void;
  onTaskUpdate: (taskId: string, start: Date, end: Date) => void;
}

// SVAR task type
interface SvarTask {
  id: number;
  text: string;
  start: Date;
  end: Date;
  duration: number;
  progress: number;
  type: 'task' | 'summary' | 'milestone';
  parent: number;
  open: boolean;
  // Custom data
  originalId: string;
  issueState?: 'opened' | 'closed';
  hasOriginalStartDate?: boolean;
  hasOriginalDueDate?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GanttApi = any;

export function GanttChart({ tasks, theme, onTaskClick, onTaskUpdate }: GanttChartProps) {
  const apiRef = useRef<GanttApi>(null);

  // Calculate the overall date range for tasks without dates
  const dateRange = useMemo(() => {
    const tasksWithDates = tasks.filter(t => t.hasOriginalStartDate || t.hasOriginalDueDate);
    if (tasksWithDates.length === 0) {
      const today = new Date();
      return {
        minDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
        maxDate: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000),
      };
    }

    let minDate = new Date(8640000000000000);
    let maxDate = new Date(-8640000000000000);

    for (const task of tasks) {
      if (task.start.getTime() < minDate.getTime()) {
        minDate = task.start;
      }
      if (task.end.getTime() > maxDate.getTime()) {
        maxDate = task.end;
      }
    }

    minDate = new Date(minDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    maxDate = new Date(maxDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    return { minDate, maxDate };
  }, [tasks]);

  // Create ID mapping (string -> number for svar)
  const idMapping = useMemo(() => {
    const stringToNum = new Map<string, number>();
    const numToString = new Map<number, string>();
    tasks.forEach((task, index) => {
      const numId = index + 1;
      stringToNum.set(task.id, numId);
      numToString.set(numId, task.id);
    });
    return { stringToNum, numToString };
  }, [tasks]);

  // Convert our tasks to svar format
  const svarTasks: SvarTask[] = useMemo(() => {
    return tasks.map((task) => {
      let start = task.start;
      let end = task.end;

      // Extend tasks without original dates
      if (task.hasOriginalStartDate === false && task.hasOriginalDueDate === false) {
        start = dateRange.minDate;
        end = dateRange.maxDate;
      } else if (task.hasOriginalStartDate === false) {
        start = dateRange.minDate;
      } else if (task.hasOriginalDueDate === false) {
        end = dateRange.maxDate;
      }

      // Ensure end is after start
      if (end.getTime() <= start.getTime()) {
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      }

      // Calculate duration in days
      const duration = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));

      // Get parent ID
      const parentId = task.parent ? (idMapping.stringToNum.get(task.parent) || 0) : 0;

      return {
        id: idMapping.stringToNum.get(task.id) || 0,
        text: task.text,
        start,
        end,
        duration,
        progress: 0,
        type: task.type || 'task',
        parent: parentId,
        open: task.open !== false,
        originalId: task.id,
        issueState: task.issueState,
        hasOriginalStartDate: task.hasOriginalStartDate,
        hasOriginalDueDate: task.hasOriginalDueDate,
      };
    });
  }, [tasks, dateRange, idMapping]);

  // Scale configuration
  const scales = useMemo(() => [
    { unit: 'month' as const, step: 1, format: 'yyyy年M月' },
    { unit: 'day' as const, step: 1, format: 'd' },
  ], []);

  // Column configuration
  const columns = useMemo(() => [
    { id: 'text', header: 'タスク名', flexgrow: 1 },
    {
      id: 'start',
      header: '開始日',
      width: 100,
      template: (task: SvarTask) => {
        if (task.hasOriginalStartDate === false) return '-';
        return formatDate(task.start);
      }
    },
    {
      id: 'end',
      header: '終了日',
      width: 100,
      template: (task: SvarTask) => {
        if (task.hasOriginalDueDate === false) return '-';
        return formatDate(task.end);
      }
    },
  ], []);

  // Store callbacks in refs to avoid stale closures
  const onTaskClickRef = useRef(onTaskClick);
  const onTaskUpdateRef = useRef(onTaskUpdate);
  const idMappingRef = useRef(idMapping);

  useEffect(() => {
    onTaskClickRef.current = onTaskClick;
    onTaskUpdateRef.current = onTaskUpdate;
    idMappingRef.current = idMapping;
  }, [onTaskClick, onTaskUpdate, idMapping]);

  // Initialize Gantt API and set up event handlers
  const handleInit = useCallback((api: GanttApi) => {
    apiRef.current = api;

    // Listen for task selection (double-click to open modal)
    api.on('select-task', (ev: { id: number }) => {
      if (ev.id) {
        const originalId = idMappingRef.current.numToString.get(ev.id);
        if (originalId && originalId.startsWith('issue-') && !originalId.includes('-task-')) {
          onTaskClickRef.current(originalId);
        }
      }
    });

    // Listen for task updates (drag to change dates)
    api.on('update-task', (ev: { id: number; task: SvarTask }) => {
      if (ev.id && ev.task) {
        const originalId = idMappingRef.current.numToString.get(ev.id);
        if (originalId && ev.task.start && ev.task.end) {
          onTaskUpdateRef.current(originalId, ev.task.start, ev.task.end);
        }
      }
    });
  }, []);

  // Theme wrapper component
  const ThemeWrapper = theme === 'dark' ? WillowDark : Willow;

  if (svarTasks.length === 0) {
    return (
      <div className="gantt-empty">
        <p>表示するタスクがありません</p>
      </div>
    );
  }

  return (
    <div className="gantt-wrapper">
      <ThemeWrapper>
        <Gantt
          init={handleInit}
          tasks={svarTasks}
          scales={scales}
          columns={columns}
          cellWidth={40}
          cellHeight={36}
        />
      </ThemeWrapper>
    </div>
  );
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}
