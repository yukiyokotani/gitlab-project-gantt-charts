import type { GitLabIssue, GitLabMilestone, GitLabLabel, ParsedIssue, TaskItem } from '../types/gitlab';

const GITLAB_URL = import.meta.env.VITE_GITLAB_URL || 'https://gitlab.com';
const GITLAB_TOKEN = import.meta.env.VITE_GITLAB_TOKEN || '';
const GITLAB_PROJECT_ID = import.meta.env.VITE_GITLAB_PROJECT_ID || '';

const headers = {
  'PRIVATE-TOKEN': GITLAB_TOKEN,
  'Content-Type': 'application/json',
};

async function fetchAllPages<T>(url: string): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const separator = url.includes('?') ? '&' : '?';
    const response = await fetch(`${url}${separator}page=${page}&per_page=${perPage}`, { headers });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    results.push(...data);

    const totalPages = parseInt(response.headers.get('x-total-pages') || '1', 10);
    if (page >= totalPages) break;
    page++;
  }

  return results;
}

export async function fetchMilestones(): Promise<GitLabMilestone[]> {
  const url = `${GITLAB_URL}/api/v4/projects/${encodeURIComponent(GITLAB_PROJECT_ID)}/milestones?state=active`;
  return fetchAllPages<GitLabMilestone>(url);
}

export async function fetchAllMilestones(): Promise<GitLabMilestone[]> {
  const url = `${GITLAB_URL}/api/v4/projects/${encodeURIComponent(GITLAB_PROJECT_ID)}/milestones`;
  return fetchAllPages<GitLabMilestone>(url);
}

export async function fetchIssues(): Promise<GitLabIssue[]> {
  const url = `${GITLAB_URL}/api/v4/projects/${encodeURIComponent(GITLAB_PROJECT_ID)}/issues?state=opened`;
  return fetchAllPages<GitLabIssue>(url);
}

export async function fetchAllIssues(): Promise<GitLabIssue[]> {
  const url = `${GITLAB_URL}/api/v4/projects/${encodeURIComponent(GITLAB_PROJECT_ID)}/issues`;
  return fetchAllPages<GitLabIssue>(url);
}

export async function fetchLabels(): Promise<GitLabLabel[]> {
  const url = `${GITLAB_URL}/api/v4/projects/${encodeURIComponent(GITLAB_PROJECT_ID)}/labels`;
  return fetchAllPages<GitLabLabel>(url);
}

export async function updateIssue(
  issueIid: number,
  updates: { due_date?: string; start_date?: string }
): Promise<GitLabIssue> {
  const url = `${GITLAB_URL}/api/v4/projects/${encodeURIComponent(GITLAB_PROJECT_ID)}/issues/${issueIid}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update issue: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function parseTasksFromDescription(description: string | null): TaskItem[] {
  if (!description) return [];

  const taskRegex = /^[\s]*[-*]\s*\[([ xX])\]\s*(.+)$/gm;
  const tasks: TaskItem[] = [];
  let match;

  while ((match = taskRegex.exec(description)) !== null) {
    tasks.push({
      checked: match[1].toLowerCase() === 'x',
      text: match[2].trim(),
    });
  }

  return tasks;
}

export function enrichIssuesWithLabels(
  issues: GitLabIssue[],
  labels: GitLabLabel[]
): ParsedIssue[] {
  const labelMap = new Map(labels.map(l => [l.name, l]));

  return issues.map(issue => ({
    ...issue,
    tasks: parseTasksFromDescription(issue.description),
    labelObjects: issue.labels
      .map(name => labelMap.get(name))
      .filter((l): l is GitLabLabel => l !== undefined),
  }));
}

export function getGitLabConfig() {
  return {
    url: GITLAB_URL,
    projectId: GITLAB_PROJECT_ID,
    hasToken: !!GITLAB_TOKEN,
  };
}
