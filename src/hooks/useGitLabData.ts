import { useState, useEffect, useCallback, useRef } from 'react';
import type { GitLabMilestone, ParsedIssue, GitLabLabel } from '../types/gitlab';
import type { GanttTask } from '../types/gantt';
import {
  fetchAllMilestones,
  fetchAllIssuesAsWorkItems,
  fetchLabels,
  enrichIssuesWithLabels,
  updateIssue,
  updateMilestone,
  type FetchIssuesOptions,
} from '../api/gitlab';

export interface DateRangeFilter {
  startDate: Date | null;
  endDate: Date | null;
}

export interface FilterOptions {
  issueState: 'opened' | 'closed' | 'all';
  dateRange: DateRangeFilter;
}

interface UseGitLabDataResult {
  tasks: GanttTask[];
  milestones: GitLabMilestone[];
  issues: ParsedIssue[];
  labels: GitLabLabel[];
  loading: boolean;
  error: string | null;
  filterOptions: FilterOptions;
  setFilterOptions: (options: FilterOptions) => void;
  refresh: () => Promise<void>;
  updateTaskDates: (taskId: string, start: Date, end: Date) => Promise<void>;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

function convertToGanttTasks(
  milestones: GitLabMilestone[],
  issues: ParsedIssue[]
): GanttTask[] {
  const tasks: GanttTask[] = [];
  const today = new Date();
  const defaultDuration = 7; // days

  // Create milestone tasks using GitLab's start_date and due_date
  for (const milestone of milestones) {
    const hasOriginalStartDate = !!parseDate(milestone.start_date);
    const hasOriginalDueDate = !!parseDate(milestone.due_date);
    const start = parseDate(milestone.start_date) || today;
    const end = parseDate(milestone.due_date) || new Date(start.getTime() + defaultDuration * 24 * 60 * 60 * 1000);

    tasks.push({
      id: `milestone-${milestone.id}`,
      text: milestone.title,
      start,
      end,
      type: 'summary',
      open: true,
      gitlabId: milestone.id,
      webUrl: milestone.web_url,
      milestoneId: milestone.id,
      hasOriginalStartDate,
      hasOriginalDueDate,
    });
  }

  // Create issue tasks
  for (const issue of issues) {
    const milestoneId = issue.milestone?.id;
    const parentId = milestoneId ? `milestone-${milestoneId}` : undefined;

    // Calculate progress from task completion
    let progress = 0;
    if (issue.task_completion_status && issue.task_completion_status.count > 0) {
      progress = Math.round(
        (issue.task_completion_status.completed_count / issue.task_completion_status.count) * 100
      );
    } else if (issue.state === 'closed') {
      progress = 100;
    }

    const hasOriginalStartDate = !!parseDate(issue.start_date);
    const hasOriginalDueDate = !!parseDate(issue.due_date);
    const start = parseDate(issue.start_date) || parseDate(issue.created_at) || today;
    const end = parseDate(issue.due_date) || new Date(start.getTime() + defaultDuration * 24 * 60 * 60 * 1000);

    tasks.push({
      id: `issue-${issue.id}`,
      text: issue.title,
      start,
      end,
      progress,
      type: 'task',
      parent: parentId,
      open: true,
      gitlabId: issue.id,
      gitlabIid: issue.iid,
      webUrl: issue.web_url,
      labels: issue.labelObjects.map(l => ({
        name: l.name,
        color: l.color,
        textColor: l.text_color,
      })),
      assignees: issue.assignees.map(a => ({
        id: a.id,
        name: a.name,
        avatarUrl: a.avatar_url,
      })),
      issueState: issue.state,
      hasOriginalStartDate,
      hasOriginalDueDate,
    });

    // Create subtasks from task list items
    if (issue.tasks.length > 0) {
      issue.tasks.forEach((task, index) => {
        tasks.push({
          id: `issue-${issue.id}-task-${index}`,
          text: task.text,
          start,
          end,
          progress: task.checked ? 100 : 0,
          type: 'task',
          parent: `issue-${issue.id}`,
          isSubtask: true,
          gitlabId: issue.id,
          gitlabIid: issue.iid,
        });
      });
    }
  }

  return tasks;
}

// Demo data for testing without GitLab connection
function getDemoTasks(): GanttTask[] {
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  return [
    {
      id: 'milestone-1',
      text: 'Sprint 1',
      start: today,
      end: nextMonth,
      progress: 25,
      type: 'summary',
      open: true,
    },
    {
      id: 'issue-1',
      text: 'Feature: User Authentication',
      start: today,
      end: nextWeek,
      progress: 50,
      type: 'task',
      parent: 'milestone-1',
      labels: [{ name: 'feature', color: '#428bca', textColor: '#fff' }],
    },
    {
      id: 'issue-2',
      text: 'Bug: Fix login redirect',
      start: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
      end: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000),
      progress: 0,
      type: 'task',
      parent: 'milestone-1',
      labels: [{ name: 'bug', color: '#d9534f', textColor: '#fff' }],
    },
  ];
}

// Default filter: 1 month before to 2 months after today
function getDefaultDateRange(): DateRangeFilter {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 1);
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 2);
  return { startDate, endDate };
}

const defaultFilterOptions: FilterOptions = {
  issueState: 'opened',
  dateRange: getDefaultDateRange(),
};

// Filter tasks by date range
function filterTasksByDateRange(
  tasks: GanttTask[],
  dateRange: DateRangeFilter
): GanttTask[] {
  if (!dateRange.startDate && !dateRange.endDate) {
    return tasks;
  }

  // First pass: filter regular tasks by date range
  const filteredTasks = tasks.filter(task => {
    // Skip milestones in first pass (we'll handle them after)
    if (task.type === 'summary') return false;
    // Always include subtasks if their parent is included
    if (task.isSubtask) return true;

    // Include issues without explicit dates (they will extend to display bounds)
    if (!task.hasOriginalStartDate && !task.hasOriginalDueDate) {
      return true;
    }

    // Check if task overlaps with date range
    const taskStart = task.start;
    const taskEnd = task.end;

    if (dateRange.startDate && dateRange.endDate) {
      // Task overlaps if it starts before range ends AND ends after range starts
      return taskStart <= dateRange.endDate && taskEnd >= dateRange.startDate;
    } else if (dateRange.startDate) {
      return taskEnd >= dateRange.startDate;
    } else if (dateRange.endDate) {
      return taskStart <= dateRange.endDate;
    }
    return true;
  });

  // Collect parent IDs that have children in the filtered set
  const parentIdsWithChildren = new Set<string>();
  for (const task of filteredTasks) {
    if (task.parent) {
      parentIdsWithChildren.add(task.parent);
    }
  }

  // Second pass: include milestones only if they have children
  const milestones = tasks.filter(
    task => task.type === 'summary' && parentIdsWithChildren.has(task.id)
  );

  // Filter subtasks to only include those whose parent issue is in filteredTasks
  const issueIds = new Set(filteredTasks.filter(t => !t.isSubtask).map(t => t.id));
  const validSubtasks = filteredTasks.filter(
    task => !task.isSubtask || (task.parent && issueIds.has(task.parent))
  );

  return [...milestones, ...validSubtasks];
}

export function useGitLabData(): UseGitLabDataResult {
  const [allTasks, setAllTasks] = useState<GanttTask[]>([]);
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [milestones, setMilestones] = useState<GitLabMilestone[]>([]);
  const [issues, setIssues] = useState<ParsedIssue[]>([]);
  const [labels, setLabels] = useState<GitLabLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptionsState] = useState<FilterOptions>(defaultFilterOptions);
  const initialLoadDone = useRef(false);
  const useDemoDataRef = useRef(false);

  // Apply date range filter when allTasks or filterOptions change
  useEffect(() => {
    const filtered = filterTasksByDateRange(allTasks, filterOptions.dateRange);
    setTasks(filtered);
  }, [allTasks, filterOptions.dateRange]);

  const loadData = useCallback(async (options?: FetchIssuesOptions) => {
    setLoading(true);
    setError(null);

    // Use demo data if enabled (for testing)
    if (useDemoDataRef.current) {
      setAllTasks(getDemoTasks());
      setLoading(false);
      return;
    }

    const fetchOptions: FetchIssuesOptions = {
      state: options?.state || filterOptions.issueState,
      ...options,
    };

    try {
      const [milestonesData, issuesData, labelsData] = await Promise.all([
        fetchAllMilestones(),
        fetchAllIssuesAsWorkItems(fetchOptions),
        fetchLabels(),
      ]);

      const enrichedIssues = enrichIssuesWithLabels(issuesData, labelsData);
      const ganttTasks = convertToGanttTasks(milestonesData, enrichedIssues);

      setMilestones(milestonesData);
      setIssues(enrichedIssues);
      setLabels(labelsData);
      setAllTasks(ganttTasks);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      // Fallback to demo data on error for testing
      console.warn('Using demo data due to error:', errorMessage);
      setAllTasks(getDemoTasks());
      useDemoDataRef.current = true;
    } finally {
      setLoading(false);
    }
  }, [filterOptions.issueState]);

  const setFilterOptions = useCallback((options: FilterOptions) => {
    const stateChanged = options.issueState !== filterOptions.issueState;
    setFilterOptionsState(options);
    // Re-fetch from API if state filter changed
    if (stateChanged) {
      loadData({ state: options.issueState });
    }
  }, [filterOptions.issueState, loadData]);

  const updateTaskDates = useCallback(
    async (taskId: string, start: Date, end: Date) => {
      // Handle milestone updates
      const milestoneMatch = taskId.match(/^milestone-(\d+)$/);
      if (milestoneMatch) {
        const milestoneId = parseInt(milestoneMatch[1], 10);
        try {
          await updateMilestone(milestoneId, {
            start_date: formatDate(start),
            due_date: formatDate(end),
          });

          // Update local state
          setAllTasks(prev =>
            prev.map(task =>
              task.id === taskId
                ? {
                    ...task,
                    start,
                    end,
                    hasOriginalStartDate: true,
                    hasOriginalDueDate: true,
                  }
                : task
            )
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to update milestone');
        }
        return;
      }

      // Handle issue updates
      const issueMatch = taskId.match(/^issue-(\d+)$/);
      if (!issueMatch) return;

      const issueId = parseInt(issueMatch[1], 10);
      const issue = issues.find(i => i.id === issueId);
      if (!issue) return;

      try {
        await updateIssue(issue.iid, {
          start_date: formatDate(start),
          due_date: formatDate(end),
        });

        // Update local state
        setAllTasks(prev =>
          prev.map(task =>
            task.id === taskId
              ? {
                  ...task,
                  start,
                  end,
                  hasOriginalStartDate: true,
                  hasOriginalDueDate: true,
                }
              : task
            )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update issue');
      }
    },
    [issues]
  );

  useEffect(() => {
    // Prevent duplicate requests in StrictMode
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    loadData();
  }, [loadData]);

  const refresh = useCallback(() => loadData(), [loadData]);

  return {
    tasks,
    milestones,
    issues,
    labels,
    loading,
    error,
    filterOptions,
    setFilterOptions,
    refresh,
    updateTaskDates,
  };
}
