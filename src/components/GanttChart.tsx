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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GanttApi = any;

export function GanttChart({ tasks, theme, onTaskClick, onTaskUpdate }: GanttChartProps) {
  const apiRef = useRef<GanttApi>(null);

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

  // Convert our tasks to svar format - minimal structure
  const svarTasks = useMemo(() => {
    if (tasks.length === 0) return [];

    // First pass: convert all tasks
    const converted = tasks.map((task) => {
      const numId = idMapping.stringToNum.get(task.id) || 1;
      const parentNumId = task.parent ? idMapping.stringToNum.get(task.parent) : undefined;

      // Ensure valid dates
      const start = task.start instanceof Date && !isNaN(task.start.getTime())
        ? task.start
        : new Date();
      const end = task.end instanceof Date && !isNaN(task.end.getTime())
        ? task.end
        : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Basic task object matching svar's expected structure
      const svarTask: {
        id: number;
        text: string;
        start: Date;
        end: Date;
        progress: number;
        type: string;
        parent?: number;
        open?: boolean;
      } = {
        id: numId,
        text: task.text || 'Untitled',
        start,
        end,
        progress: task.progress || 0,
        type: task.type || 'task',
      };

      // Only add parent if it exists in the mapping
      if (parentNumId !== undefined && idMapping.numToString.has(parentNumId)) {
        svarTask.parent = parentNumId;
      }

      if (task.type === 'summary') {
        svarTask.open = true;
      }

      return svarTask;
    });

    // Sort: parent tasks first, then children
    // Tasks without parent come first, then tasks with parents
    return converted.sort((a, b) => {
      const aHasParent = a.parent !== undefined;
      const bHasParent = b.parent !== undefined;
      if (!aHasParent && bHasParent) return -1;
      if (aHasParent && !bHasParent) return 1;
      // If both have parents, sort by parent id to group siblings
      if (aHasParent && bHasParent) {
        if (a.parent! < b.parent!) return -1;
        if (a.parent! > b.parent!) return 1;
      }
      return a.id - b.id;
    });
  }, [tasks, idMapping]);

  // Scale configuration
  const scales = useMemo(() => [
    { unit: 'month', step: 1, format: 'MMMM yyy' },
    { unit: 'day', step: 1, format: 'd' },
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

    api.on('select-task', (ev: { id: number }) => {
      if (ev.id) {
        const originalId = idMappingRef.current.numToString.get(ev.id);
        if (originalId && originalId.startsWith('issue-') && !originalId.includes('-task-')) {
          onTaskClickRef.current(originalId);
        }
      }
    });

    api.on('update-task', (ev: { id: number; task: { start: Date; end: Date } }) => {
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

  if (tasks.length === 0 || svarTasks.length === 0) {
    return (
      <div className="gantt-empty">
        <p>表示するタスクがありません</p>
      </div>
    );
  }

  // Debug: log tasks
  console.log('svarTasks:', svarTasks);

  return (
    <div className="gantt-wrapper">
      <ThemeWrapper>
        <Gantt
          init={handleInit}
          tasks={svarTasks}
          links={[]}
          scales={scales}
        />
      </ThemeWrapper>
    </div>
  );
}
