import { useCallback, useMemo, useRef, useEffect } from 'react';
import { Gantt, Willow, WillowDark } from '@svar-ui/react-gantt';
import '@svar-ui/react-gantt/all.css';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
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

  // Calculate the overall date range for extending tasks without dates
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
      if (task.start && task.start.getTime() < minDate.getTime()) {
        minDate = task.start;
      }
      if (task.end && task.end.getTime() > maxDate.getTime()) {
        maxDate = task.end;
      }
    }

    // Add padding
    minDate = new Date(minDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    maxDate = new Date(maxDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    return { minDate, maxDate };
  }, [tasks]);

  // Convert our tasks to svar format
  const svarTasks = useMemo(() => {
    if (tasks.length === 0) return [];

    // First pass: convert all tasks
    const converted = tasks.map((task) => {
      const numId = idMapping.stringToNum.get(task.id) || 1;
      const parentNumId = task.parent ? idMapping.stringToNum.get(task.parent) : undefined;

      // Determine start and end dates
      let start: Date;
      let end: Date;

      const hasOriginalStart = task.hasOriginalStartDate === true;
      const hasOriginalEnd = task.hasOriginalDueDate === true;

      if (hasOriginalStart && task.start instanceof Date && !isNaN(task.start.getTime())) {
        start = task.start;
      } else {
        // No original start date - extend to the minimum
        start = dateRange.minDate;
      }

      if (hasOriginalEnd && task.end instanceof Date && !isNaN(task.end.getTime())) {
        end = task.end;
      } else {
        // No original end date - extend to the maximum
        end = dateRange.maxDate;
      }

      // Ensure end is after start
      if (end.getTime() <= start.getTime()) {
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      }

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
        // Custom fields to track original dates
        hasOriginalStart: boolean;
        hasOriginalEnd: boolean;
        originalStart: Date | null;
        originalEnd: Date | null;
        // Assignees
        assignees: { id: number; name: string; avatarUrl: string }[];
      } = {
        id: numId,
        text: task.text || 'Untitled',
        start,
        end,
        progress: task.progress || 0,
        type: task.type || 'task',
        hasOriginalStart,
        hasOriginalEnd,
        originalStart: hasOriginalStart ? task.start : null,
        originalEnd: hasOriginalEnd ? task.end : null,
        assignees: task.assignees || [],
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
    return converted.sort((a, b) => {
      const aHasParent = a.parent !== undefined;
      const bHasParent = b.parent !== undefined;
      if (!aHasParent && bHasParent) return -1;
      if (aHasParent && !bHasParent) return 1;
      if (aHasParent && bHasParent) {
        if (a.parent! < b.parent!) return -1;
        if (a.parent! > b.parent!) return 1;
      }
      return a.id - b.id;
    });
  }, [tasks, idMapping, dateRange]);

  // Scale configuration - using date-fns format functions
  const scales = useMemo(() => [
    {
      unit: 'month',
      step: 1,
      format: (date: Date) => format(date, 'yyyy年M月', { locale: ja }),
    },
    {
      unit: 'day',
      step: 1,
      format: (date: Date) => format(date, 'd (E)', { locale: ja }),
    },
  ], []);

  // Highlight weekends (Saturday and Sunday)
  const highlightWeekends = (date: Date) => {
    const day = date.getDay();
    if (day === 0 || day === 6) {
      return 'wx-weekend';
    }
    return '';
  };

  // Assignee cell component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AssigneeCell = ({ row }: { row: any }) => {
    if (!row.assignees || row.assignees.length === 0) return null;
    return (
      <div className="assignee-cell">
        {row.assignees.map((a: { id: number; avatarUrl: string; name: string }) => (
          <div key={a.id} className="assignee-item">
            <img
              src={a.avatarUrl}
              alt={a.name}
              className="assignee-avatar"
            />
            <span className="assignee-name">{a.name}</span>
          </div>
        ))}
      </div>
    );
  };

  // Column configuration
  const columns = useMemo(() => [
    { id: 'text', header: 'タスク名', flexgrow: 1 },
    {
      id: 'assignees',
      header: '担当者',
      width: 120,
      cell: AssigneeCell,
    },
    {
      id: 'start',
      header: '開始日',
      width: 100,
      template: (_value: unknown, task: Record<string, unknown>) => {
        if (!task.hasOriginalStart) return '-';
        return task.originalStart instanceof Date ? format(task.originalStart, 'yyyy/MM/dd') : '-';
      },
    },
    {
      id: 'end',
      header: '終了日',
      width: 100,
      template: (_value: unknown, task: Record<string, unknown>) => {
        if (!task.hasOriginalEnd) return '-';
        return task.originalEnd instanceof Date ? format(task.originalEnd, 'yyyy/MM/dd') : '-';
      },
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

    api.on('select-task', (ev: { id: number }) => {
      if (ev.id) {
        const originalId = idMappingRef.current.numToString.get(ev.id);
        if (originalId && originalId.startsWith('issue-') && !originalId.includes('-task-')) {
          onTaskClickRef.current(originalId);
        }
      }
    });

    api.on('update-task', (ev: { id: number; task: { start: Date; end: Date }; inProgress?: boolean }) => {
      // Only update when drag is complete (inProgress is false or undefined)
      if (ev.id && ev.task && !ev.inProgress) {
        const originalId = idMappingRef.current.numToString.get(ev.id);
        if (originalId && originalId.startsWith('issue-') && !originalId.includes('-task-')) {
          if (ev.task.start && ev.task.end) {
            onTaskUpdateRef.current(originalId, ev.task.start, ev.task.end);
          }
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

  return (
    <div className="gantt-wrapper">
      <ThemeWrapper>
        <Gantt
          init={handleInit}
          tasks={svarTasks}
          links={[]}
          scales={scales}
          columns={columns}
          cellHeight={28}
          cellWidth={60}
          highlightTime={highlightWeekends}
        />
      </ThemeWrapper>
    </div>
  );
}
