import { useState, useEffect, useCallback, useRef } from 'react';
import type { GitLabMilestone, ParsedIssue, GitLabLabel } from '../types/gitlab';
import type { GanttTask } from '../types/gantt';
import {
  fetchAllMilestones,
  fetchAllIssuesAsWorkItems,
  fetchLabels,
  enrichIssuesWithLabels,
  updateIssue,
} from '../api/gitlab';

interface UseGitLabDataResult {
  tasks: GanttTask[];
  milestones: GitLabMilestone[];
  issues: ParsedIssue[];
  labels: GitLabLabel[];
  loading: boolean;
  error: string | null;
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

  // Create milestone tasks (summary type)
  for (const milestone of milestones) {
    const hasOriginalStartDate = !!parseDate(milestone.start_date);
    const hasOriginalDueDate = !!parseDate(milestone.due_date);
    const start = parseDate(milestone.start_date) || today;
    const end = parseDate(milestone.due_date) || new Date(start.getTime() + defaultDuration * 24 * 60 * 60 * 1000);

    tasks.push({
      id: `milestone-${milestone.id}`,
      text: `📁 ${milestone.title}`,
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

export function useGitLabData(): UseGitLabDataResult {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [milestones, setMilestones] = useState<GitLabMilestone[]>([]);
  const [issues, setIssues] = useState<ParsedIssue[]>([]);
  const [labels, setLabels] = useState<GitLabLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);
  const useDemoDataRef = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Use demo data if enabled (for testing)
    if (useDemoDataRef.current) {
      setTasks(getDemoTasks());
      setLoading(false);
      return;
    }

    try {
      const [milestonesData, issuesData, labelsData] = await Promise.all([
        fetchAllMilestones(),
        fetchAllIssuesAsWorkItems(),
        fetchLabels(),
      ]);

      const enrichedIssues = enrichIssuesWithLabels(issuesData, labelsData);
      const ganttTasks = convertToGanttTasks(milestonesData, enrichedIssues);

      setMilestones(milestonesData);
      setIssues(enrichedIssues);
      setLabels(labelsData);
      setTasks(ganttTasks);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      // Fallback to demo data on error for testing
      console.warn('Using demo data due to error:', errorMessage);
      setTasks(getDemoTasks());
      useDemoDataRef.current = true;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTaskDates = useCallback(
    async (taskId: string, start: Date, end: Date) => {
      // Extract issue IID from task ID
      const match = taskId.match(/^issue-(\d+)$/);
      if (!match) return;

      const issueId = parseInt(match[1], 10);
      const issue = issues.find(i => i.id === issueId);
      if (!issue) return;

      try {
        await updateIssue(issue.iid, {
          start_date: formatDate(start),
          due_date: formatDate(end),
        });

        // Update local state
        setTasks(prev =>
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

  return {
    tasks,
    milestones,
    issues,
    labels,
    loading,
    error,
    refresh: loadData,
    updateTaskDates,
  };
}
