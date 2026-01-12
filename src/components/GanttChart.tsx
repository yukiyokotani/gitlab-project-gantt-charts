import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Gantt, Task, ViewMode, StylingOption } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import type { GanttTask } from '../types/gantt';
import { TaskListHeader } from './TaskListHeader';
import { TaskListTable } from './TaskListTable';
import './GanttChart.css';

interface GanttChartProps {
  tasks: GanttTask[];
  theme: 'light' | 'dark';
  onTaskClick: (taskId: string) => void;
  onTaskUpdate: (taskId: string, start: Date, end: Date) => void;
}

export function GanttChart({ tasks, theme, onTaskClick, onTaskUpdate }: GanttChartProps) {
  // Column widths state for resizable columns
  const [columnWidths, setColumnWidths] = useState({
    name: 250,
    from: 100,
    to: 100,
  });

  // Track collapsed milestones
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const handleColumnResize = useCallback((column: 'name' | 'from' | 'to', width: number) => {
    setColumnWidths(prev => ({ ...prev, [column]: width }));
  }, []);

  // Calculate the overall date range for tasks without dates
  const dateRange = useMemo(() => {
    const tasksWithDates = tasks.filter(t => t.hasOriginalStartDate || t.hasOriginalDueDate);
    if (tasksWithDates.length === 0) {
      // Default range: 3 months before and after today
      const today = new Date();
      return {
        minDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
        maxDate: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000),
      };
    }

    let minDate = new Date(8640000000000000); // Max date
    let maxDate = new Date(-8640000000000000); // Min date

    for (const task of tasks) {
      if (task.start.getTime() < minDate.getTime()) {
        minDate = task.start;
      }
      if (task.end.getTime() > maxDate.getTime()) {
        maxDate = task.end;
      }
    }

    // Add 30 days padding on each side for tasks without dates
    minDate = new Date(minDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    maxDate = new Date(maxDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    return { minDate, maxDate };
  }, [tasks]);

  // Create a map of original task data for the table display
  const originalTaskMap = useMemo(() => {
    const map = new Map<string, GanttTask>();
    tasks.forEach(task => map.set(task.id, task));
    return map;
  }, [tasks]);

  // Convert our tasks to gantt-task-react format and sort for proper nesting
  const ganttTasks: Task[] = useMemo(() => {
    const converted = tasks.map((task) => {
      // Extend tasks without original dates to the full range
      let start = task.start;
      let end = task.end;

      if (task.hasOriginalStartDate === false && task.hasOriginalDueDate === false) {
        // No dates at all: extend to full range
        start = dateRange.minDate;
        end = dateRange.maxDate;
      } else if (task.hasOriginalStartDate === false) {
        // No start date: extend to the beginning
        start = dateRange.minDate;
      } else if (task.hasOriginalDueDate === false) {
        // No due date: extend to the end
        end = dateRange.maxDate;
      }

      // Ensure end is after start
      if (end.getTime() <= start.getTime()) {
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      }

      // Determine task type for gantt-task-react
      let type: 'task' | 'milestone' | 'project' = 'task';
      if (task.type === 'summary') {
        type = 'project';
      } else if (task.type === 'milestone') {
        type = 'milestone';
      }

      // Jira-like colors: closed = green, open = blue
      const isClosed = task.issueState === 'closed';
      const taskStyles = isClosed
        ? {
            backgroundColor: '#36B37E',
            backgroundSelectedColor: '#00875A',
            progressColor: '#00875A',
            progressSelectedColor: '#006644',
          }
        : {
            backgroundColor: '#4C9AFF',
            backgroundSelectedColor: '#2684FF',
            progressColor: '#0065FF',
            progressSelectedColor: '#0052CC',
          };

      return {
        id: task.id,
        name: task.text,
        start: start,
        end: end,
        progress: 0, // Progress disabled
        type: type,
        project: task.parent, // Parent reference
        hideChildren: collapsedIds.has(task.id),
        isDisabled: false,
        styles: taskStyles,
      };
    });

    // Sort tasks: projects first, then their children immediately after
    const projects = converted.filter(t => t.type === 'project');
    const result: Task[] = [];

    for (const project of projects) {
      result.push(project);
      // Add all children of this project
      const children = converted.filter(t => t.project === project.id);
      result.push(...children);
    }

    // Add tasks without a parent (orphans)
    const orphans = converted.filter(t => t.type !== 'project' && !t.project);
    result.push(...orphans);

    return result;
  }, [tasks, dateRange, collapsedIds]);

  // Calculate total list width
  const listCellWidth = useMemo(() => {
    return `${columnWidths.name + columnWidths.from + columnWidths.to}px`;
  }, [columnWidths]);

  // Styling based on theme
  const styling: StylingOption = useMemo(() => ({
    headerHeight: 50,
    columnWidth: 60,
    listCellWidth,
    rowHeight: 40,
    barCornerRadius: 4,
    barFill: 60,
    handleWidth: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
    barProgressColor: theme === 'dark' ? '#579dff' : '#0052cc',
    barProgressSelectedColor: theme === 'dark' ? '#388bfd' : '#0747a6',
    barBackgroundColor: theme === 'dark' ? '#3b4048' : '#deebff',
    barBackgroundSelectedColor: theme === 'dark' ? '#4a5568' : '#b3d4ff',
    projectProgressColor: theme === 'dark' ? '#9f8fef' : '#6554c0',
    projectProgressSelectedColor: theme === 'dark' ? '#8777d9' : '#5243aa',
    projectBackgroundColor: theme === 'dark' ? '#2d3748' : '#f4f5f7',
    projectBackgroundSelectedColor: theme === 'dark' ? '#4a5568' : '#ebecf0',
    milestoneBackgroundColor: theme === 'dark' ? '#f5cd47' : '#ffab00',
    milestoneBackgroundSelectedColor: theme === 'dark' ? '#f0b429' : '#ff991f',
    arrowColor: theme === 'dark' ? '#6b778c' : '#5e6c84',
    arrowIndent: 20,
    todayColor: 'rgba(255, 86, 48, 0.3)',
    TooltipContent: undefined,
  }), [theme, listCellWidth]);

  // Handle task click
  const handleClick = useCallback((task: Task) => {
    if (task.id.startsWith('issue-') && !task.id.includes('-task-')) {
      onTaskClick(task.id);
    }
  }, [onTaskClick]);

  // Handle task date change (drag)
  const handleDateChange = useCallback((task: Task) => {
    onTaskUpdate(task.id, task.start, task.end);
    return Promise.resolve(true);
  }, [onTaskUpdate]);

  // Handle expander click (collapse/expand milestones)
  const handleExpanderClick = useCallback((task: Task) => {
    setCollapsedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(task.id)) {
        newSet.delete(task.id);
      } else {
        newSet.add(task.id);
      }
      return newSet;
    });
  }, []);

  // Custom header component
  const TaskListHeaderComponent = useCallback(
    ({ headerHeight, fontFamily, fontSize, rowWidth }: {
      headerHeight: number;
      fontFamily: string;
      fontSize: string;
      rowWidth: string;
    }) => (
      <TaskListHeader
        headerHeight={headerHeight}
        rowWidth={rowWidth}
        fontFamily={fontFamily}
        fontSize={fontSize}
        columnWidths={columnWidths}
        onColumnResize={handleColumnResize}
      />
    ),
    [columnWidths, handleColumnResize]
  );

  // Custom table component
  const TaskListTableComponent = useCallback(
    ({ tasks, rowHeight, rowWidth, fontFamily, fontSize, locale, onExpanderClick }: {
      tasks: Task[];
      rowHeight: number;
      rowWidth: string;
      fontFamily: string;
      fontSize: string;
      locale: string;
      onExpanderClick: (task: Task) => void;
    }) => (
      <TaskListTable
        tasks={tasks}
        rowHeight={rowHeight}
        rowWidth={rowWidth}
        fontFamily={fontFamily}
        fontSize={fontSize}
        locale={locale}
        onExpanderClick={onExpanderClick}
        columnWidths={columnWidths}
        originalTaskMap={originalTaskMap}
      />
    ),
    [columnWidths, originalTaskMap]
  );

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fix calendar header background colors (gantt-task-react uses inline styles)
  useEffect(() => {
    if (!wrapperRef.current) return;

    const updateCalendarColors = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      const headerColor = theme === 'dark' ? '#2d333b' : '#f4f5f7';
      const textColor = theme === 'dark' ? '#adbac7' : '#5e6c84';

      // Try multiple selectors for calendar headers
      const selectors = [
        '.calendarTop rect',
        '.calendarBottom rect',
        '[class*="calendar"] rect',
        'g[class*="calendar"] rect',
      ];

      selectors.forEach(selector => {
        const rects = wrapper.querySelectorAll(selector);
        rects.forEach(rect => {
          (rect as SVGRectElement).style.fill = headerColor;
        });
      });

      // Update calendar header text
      const textSelectors = [
        '.calendarTop text',
        '.calendarBottom text',
        '[class*="calendar"] text',
      ];

      textSelectors.forEach(selector => {
        const texts = wrapper.querySelectorAll(selector);
        texts.forEach(text => {
          (text as SVGTextElement).style.fill = textColor;
        });
      });
    };

    // Run after render with a small delay
    const timeoutId = setTimeout(updateCalendarColors, 100);

    // Also observe for DOM changes
    const observer = new MutationObserver(() => {
      setTimeout(updateCalendarColors, 0);
    });
    if (wrapperRef.current) {
      observer.observe(wrapperRef.current, { childList: true, subtree: true });
    }

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [theme, ganttTasks]);

  if (ganttTasks.length === 0) {
    return (
      <div className="gantt-empty">
        <p>表示するタスクがありません</p>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={`gantt-wrapper ${theme}`}>
      <Gantt
        tasks={ganttTasks}
        viewMode={ViewMode.Day}
        onClick={handleClick}
        onDateChange={handleDateChange}
        onExpanderClick={handleExpanderClick}
        listCellWidth={listCellWidth}
        columnWidth={60}
        ganttHeight={0}
        TaskListHeader={TaskListHeaderComponent}
        TaskListTable={TaskListTableComponent}
        {...styling}
      />
    </div>
  );
}
