import { useCallback, useMemo, useRef, useEffect, useState, memo } from 'react';
import { Gantt, Tooltip, Willow, WillowDark } from '@svar-ui/react-gantt';
import '@svar-ui/react-gantt/all.css';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Milestone } from 'lucide-react';
import type { GanttTask } from '../types/gantt';
import './GanttChart.css';

interface DateRangeFilter {
  startDate: Date | null;
  endDate: Date | null;
}

interface GanttChartProps {
  tasks: GanttTask[];
  theme: 'light' | 'dark';
  onTaskClick: (taskId: string) => void;
  onTaskUpdate: (taskId: string, start: Date, end: Date) => void;
  dateRange?: DateRangeFilter;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GanttApi = any;

// Custom comparison function for memo - only re-render if tasks, theme, or dateRange actually change
function arePropsEqual(prevProps: GanttChartProps, nextProps: GanttChartProps): boolean {
  // Compare theme
  if (prevProps.theme !== nextProps.theme) return false;

  // Compare dateRange
  if (prevProps.dateRange?.startDate?.getTime() !== nextProps.dateRange?.startDate?.getTime()) return false;
  if (prevProps.dateRange?.endDate?.getTime() !== nextProps.dateRange?.endDate?.getTime()) return false;

  // Compare tasks by reference first (fast path)
  if (prevProps.tasks === nextProps.tasks) return true;

  // Compare tasks length
  if (prevProps.tasks.length !== nextProps.tasks.length) return false;

  // Compare task IDs to detect actual data changes
  for (let i = 0; i < prevProps.tasks.length; i++) {
    if (prevProps.tasks[i].id !== nextProps.tasks[i].id) return false;
    if (prevProps.tasks[i].start?.getTime() !== nextProps.tasks[i].start?.getTime()) return false;
    if (prevProps.tasks[i].end?.getTime() !== nextProps.tasks[i].end?.getTime()) return false;
  }

  return true;
}

export const GanttChart = memo(function GanttChart({ tasks, theme, onTaskClick, onTaskUpdate, dateRange: filterDateRange }: GanttChartProps) {
  const apiRef = useRef<GanttApi>(null);
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const holidaysFetchedRef = useRef(false);

  // Fetch Japanese holidays (prevent duplicate in StrictMode)
  useEffect(() => {
    if (holidaysFetchedRef.current) return;
    holidaysFetchedRef.current = true;

    fetch('https://holidays-jp.github.io/api/v1/date.json')
      .then(res => res.json())
      .then((data: Record<string, string>) => {
        setHolidays(new Set(Object.keys(data)));
      })
      .catch(err => {
        console.warn('Failed to fetch holidays:', err);
      });
  }, []);

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

      // Use filter date range for undefined dates (display range as bounds)
      const displayStartBound = filterDateRange?.startDate || dateRange.minDate;
      const displayEndBound = filterDateRange?.endDate || dateRange.maxDate;

      // Use provided date or extend to display bounds based on hasOriginal flags
      if (hasOriginalStart && task.start instanceof Date && !isNaN(task.start.getTime())) {
        start = task.start;
      } else {
        // No original start date - use display range start as bound
        start = displayStartBound;
      }

      if (hasOriginalEnd && task.end instanceof Date && !isNaN(task.end.getTime())) {
        end = task.end;
      } else {
        // No original end date - use display range end as bound
        end = displayEndBound;
      }

      // Ensure end is after start
      if (end.getTime() <= start.getTime()) {
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      }

      // Basic task object matching svar's expected structure
      // Note: We use 'task' type for milestones too to prevent SVAR's auto date calculation
      // The original type is stored in 'originalType' for rendering purposes
      const isMilestone = task.type === 'summary';
      const svarTask: {
        id: number;
        text: string;
        start: Date;
        end: Date;
        progress: number;
        type: string;
        originalType: string;
        css?: string;
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
        // Always use 'task' type to prevent SVAR from auto-calculating summary dates
        type: 'task',
        originalType: task.type || 'task',
        // Add CSS class for milestones
        css: isMilestone ? 'milestone-row' : undefined,
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

      // Set open for milestone rows (they were originally 'summary' type)
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
  }, [tasks, idMapping.stringToNum, idMapping.numToString, filterDateRange?.startDate, filterDateRange?.endDate, dateRange.minDate, dateRange.maxDate]);

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

  // Highlight weekends and holidays - only for day unit, not month header
  const highlightWeekendsAndHolidays = useCallback((date: Date, unit: 'day' | 'hour') => {
    // Only highlight day cells, not month headers
    if (unit !== 'day') return '';

    // Check weekend
    const day = date.getDay();
    if (day === 0 || day === 6) {
      return 'wx-weekend';
    }

    // Check holiday (format: YYYY-MM-DD)
    const dateStr = format(date, 'yyyy-MM-dd');
    if (holidays.has(dateStr)) {
      return 'wx-weekend';
    }

    return '';
  }, [holidays]);

  // Task name cell component with milestone icon
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TaskNameCell = ({ row }: { row: any }) => {
    const isMilestone = row.originalType === 'summary';
    return (
      <div className="task-name-cell">
        {isMilestone && <Milestone className="milestone-icon" />}
        <span className="task-name-text">{row.text}</span>
      </div>
    );
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

  // Custom tooltip content
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TooltipContent = ({ data }: { data: any }) => {
    if (!data) return null;

    const startDate = data.originalStart instanceof Date
      ? format(data.originalStart, 'yyyy/MM/dd')
      : '-';
    const endDate = data.originalEnd instanceof Date
      ? format(data.originalEnd, 'yyyy/MM/dd')
      : '-';
    const assignees = data.assignees || [];

    return (
      <div className="gantt-tooltip">
        <div className="gantt-tooltip-title">{data.text}</div>
        <div className="gantt-tooltip-row">
          <span className="gantt-tooltip-label">開始日:</span>
          <span>{startDate}</span>
        </div>
        <div className="gantt-tooltip-row">
          <span className="gantt-tooltip-label">終了日:</span>
          <span>{endDate}</span>
        </div>
        {assignees.length > 0 && (
          <div className="gantt-tooltip-row">
            <span className="gantt-tooltip-label">担当者:</span>
            <span>{assignees.map((a: { name: string }) => a.name).join(', ')}</span>
          </div>
        )}
      </div>
    );
  };

  // Custom task bar template for different colors
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TaskTemplate = ({ data }: { data: any }) => {
    const isMilestone = data.originalType === 'summary';
    const progress = data.progress || 0;
    const bgColor = isMilestone ? '#9C27B0' : '#2196F3';

    return (
      <div
        className="custom-task-bar"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          backgroundColor: bgColor,
          border: 'none',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          className="task-bar-progress"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${progress}%`,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
          }}
        />
        <span
          className="task-bar-text"
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '0 6px',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: 'white',
          }}
        >
          {data.text}
        </span>
      </div>
    );
  };

  // Column configuration
  const columns = useMemo(() => [
    { id: 'text', header: 'タスク名', flexgrow: 1, cell: TaskNameCell },
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

  // Scroll to a specific date
  const scrollToDate = useCallback((api: GanttApi, targetDate: Date) => {
    // Wait for render to complete
    setTimeout(() => {
      try {
        const state = api.getState();
        const scales = state._scales;
        if (!scales) return;

        const date = new Date(targetDate);
        date.setHours(0, 0, 0, 0);

        // Calculate pixel position for the target date
        const scaleStart = scales.start;
        if (!scaleStart) return;

        // Use scale's diff function to calculate position
        const diffDays = scales.diff(date, scaleStart);
        const pixelPosition = diffDays * scales.lengthUnitWidth;

        // Scroll to position
        const scrollLeft = Math.max(0, pixelPosition);

        api.exec('scroll-chart', { left: scrollLeft });
      } catch (err) {
        console.warn('Failed to scroll to date:', err);
      }
    }, 100);
  }, []);

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
        if (originalId) {
          // Handle both issue and milestone updates
          const isIssue = originalId.startsWith('issue-') && !originalId.includes('-task-');
          const isMilestone = originalId.startsWith('milestone-');
          if ((isIssue || isMilestone) && ev.task.start && ev.task.end) {
            onTaskUpdateRef.current(originalId, ev.task.start, ev.task.end);
          }
        }
      }
    });
  }, []);

  // Scroll to filter start date when API is ready
  useEffect(() => {
    if (apiRef.current && filterDateRange?.startDate) {
      scrollToDate(apiRef.current, filterDateRange.startDate);
    }
  }, [filterDateRange?.startDate, scrollToDate]);

  // Theme wrapper component
  const ThemeWrapper = theme === 'dark' ? WillowDark : Willow;

  // Calculate the start date for the Gantt chart view
  const ganttStartDate = useMemo(() => {
    // Use filter start date if available
    if (filterDateRange?.startDate) {
      return filterDateRange.startDate;
    }
    // Otherwise use the earliest task date
    return dateRange.minDate;
  }, [filterDateRange?.startDate, dateRange.minDate]);

  // Calculate the end date for the Gantt chart view
  const ganttEndDate = useMemo(() => {
    // Use filter end date if available
    if (filterDateRange?.endDate) {
      return filterDateRange.endDate;
    }
    // Otherwise use the latest task date
    return dateRange.maxDate;
  }, [filterDateRange?.endDate, dateRange.maxDate]);

  // Generate a stable key based on task IDs and date range to force re-mount when dataset changes significantly
  // This prevents SVAR Gantt from crashing during transitions
  const ganttKey = useMemo(() => {
    if (svarTasks.length === 0) return 'empty';
    // Use first few task IDs, count, and date range to create a stable key
    const firstIds = svarTasks.slice(0, 5).map(t => t.id).join('-');
    const startKey = ganttStartDate.getTime();
    const endKey = ganttEndDate.getTime();
    return `gantt-${svarTasks.length}-${firstIds}-${startKey}-${endKey}`;
  }, [svarTasks, ganttStartDate, ganttEndDate]);

  if (tasks.length === 0 || svarTasks.length === 0) {
    return (
      <div className="gantt-empty">
        <p>表示するタスクがありません</p>
      </div>
    );
  }

  return (
    <div className="gantt-wrapper" key={ganttKey}>
      <ThemeWrapper>
        <Tooltip api={apiRef.current} content={TooltipContent}>
          <Gantt
            init={handleInit}
            tasks={svarTasks}
            links={[]}
            scales={scales}
            columns={columns}
            cellHeight={28}
            cellWidth={60}
            start={ganttStartDate}
            end={ganttEndDate}
            autoScale={false}
            highlightTime={highlightWeekendsAndHolidays}
            taskTemplate={TaskTemplate}
          />
        </Tooltip>
      </ThemeWrapper>
    </div>
  );
}, arePropsEqual);
