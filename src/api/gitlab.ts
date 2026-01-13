import type { GitLabIssue, GitLabMilestone, GitLabLabel, ParsedIssue, TaskItem } from '../types/gitlab';

const GITLAB_URL = import.meta.env.VITE_GITLAB_URL || 'https://gitlab.com';
const GITLAB_TOKEN = import.meta.env.VITE_GITLAB_TOKEN || '';
const GITLAB_PROJECT_ID = import.meta.env.VITE_GITLAB_PROJECT_ID || '';

// Cache for project path (needed for GraphQL)
let cachedProjectPath: string | null = null;

// Get the project path for GraphQL (converts numeric ID to path if needed)
async function getProjectPath(): Promise<string> {
  if (cachedProjectPath) {
    return cachedProjectPath;
  }

  // If it looks like a path (contains /), decode and use it
  const decoded = decodeURIComponent(GITLAB_PROJECT_ID);
  if (decoded.includes('/')) {
    cachedProjectPath = decoded;
    return decoded;
  }

  // If it's a numeric ID, fetch the project to get its path
  if (/^\d+$/.test(GITLAB_PROJECT_ID)) {
    const response = await fetch(
      `${GITLAB_URL}/api/v4/projects/${GITLAB_PROJECT_ID}`,
      { headers: { 'PRIVATE-TOKEN': GITLAB_TOKEN } }
    );
    if (response.ok) {
      const project = await response.json();
      const path = project.path_with_namespace as string;
      cachedProjectPath = path;
      return path;
    }
  }

  // Fallback: use as-is
  cachedProjectPath = GITLAB_PROJECT_ID;
  return GITLAB_PROJECT_ID;
}

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

// GraphQL API for fetching work items with start_date via widgets
interface WorkItemNode {
  id: string;
  iid: string;
  title: string;
  description: string | null;
  state: string;
  webUrl: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  widgets: Array<{
    __typename: string;
    // StartAndDueDateWidget fields
    startDate?: string | null;
    dueDate?: string | null;
    isFixed?: boolean;
    // Assignees widget
    assignees?: {
      nodes: Array<{
        id: string;
        username: string;
        name: string;
        avatarUrl: string;
      }>;
    };
    // Labels widget
    labels?: {
      nodes: Array<{
        title: string;
      }>;
    };
    // Milestone widget
    milestone?: {
      id: string;
      iid: string;
      title: string;
      startDate: string | null;
      dueDate: string | null;
      webPath: string;
    } | null;
    // Notes widget (for description tasks)
    // Progress widget
    progress?: number;
  }>;
}

interface WorkItemsGraphQLResponse {
  data: {
    project: {
      workItems: {
        nodes: WorkItemNode[];
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
      };
    };
  };
  errors?: Array<{ message: string }>;
}

export async function fetchAllIssuesAsWorkItems(): Promise<GitLabIssue[]> {
  const graphqlHeaders = {
    'Authorization': `Bearer ${GITLAB_TOKEN}`,
    'Content-Type': 'application/json',
  };

  // Get the project path for GraphQL
  const projectPath = await getProjectPath();
  console.log('Using project path for GraphQL:', projectPath);

  const issues: GitLabIssue[] = [];
  let hasNextPage = true;
  let endCursor: string | null = null;

  while (hasNextPage) {
    const query = `
      query GetProjectWorkItems($fullPath: ID!, $after: String) {
        project(fullPath: $fullPath) {
          workItems(after: $after, first: 100, types: [ISSUE]) {
            nodes {
              id
              iid
              title
              description
              state
              webUrl
              createdAt
              updatedAt
              closedAt
              widgets {
                ... on WorkItemWidgetStartAndDueDate {
                  __typename
                  startDate
                  dueDate
                  isFixed
                }
                ... on WorkItemWidgetAssignees {
                  __typename
                  assignees {
                    nodes {
                      id
                      username
                      name
                      avatarUrl
                    }
                  }
                }
                ... on WorkItemWidgetLabels {
                  __typename
                  labels {
                    nodes {
                      title
                    }
                  }
                }
                ... on WorkItemWidgetMilestone {
                  __typename
                  milestone {
                    id
                    iid
                    title
                    startDate
                    dueDate
                    webPath
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `;

    const response = await fetch(`${GITLAB_URL}/api/graphql`, {
      method: 'POST',
      headers: graphqlHeaders,
      body: JSON.stringify({
        query,
        variables: {
          fullPath: projectPath,
          after: endCursor,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`GitLab GraphQL API error: ${response.status} ${response.statusText}`);
    }

    const result: WorkItemsGraphQLResponse = await response.json();

    if (result.errors && result.errors.length > 0) {
      console.error('GraphQL errors:', result.errors);
      throw new Error(`GraphQL error: ${result.errors[0].message}`);
    }

    if (!result.data?.project?.workItems) {
      console.error('GraphQL response:', result);
      throw new Error('Invalid GraphQL response structure');
    }

    const { nodes, pageInfo } = result.data.project.workItems;

    for (const node of nodes) {
      // Extract widgets
      let startDate: string | null = null;
      let dueDate: string | null = null;
      let assignees: GitLabIssue['assignees'] = [];
      let labels: string[] = [];
      let milestone: GitLabIssue['milestone'] = null;

      for (const widget of node.widgets) {
        if (widget.__typename === 'WorkItemWidgetStartAndDueDate') {
          startDate = widget.startDate || null;
          dueDate = widget.dueDate || null;
        }
        if (widget.__typename === 'WorkItemWidgetAssignees' && widget.assignees) {
          assignees = widget.assignees.nodes.map(a => ({
            id: parseInt(a.id.replace(/\D/g, ''), 10),
            username: a.username,
            name: a.name,
            avatar_url: a.avatarUrl,
          }));
        }
        if (widget.__typename === 'WorkItemWidgetLabels' && widget.labels) {
          labels = widget.labels.nodes.map(l => l.title);
        }
        if (widget.__typename === 'WorkItemWidgetMilestone' && widget.milestone) {
          milestone = {
            id: parseInt(widget.milestone.id.replace(/\D/g, ''), 10),
            iid: parseInt(widget.milestone.iid, 10),
            title: widget.milestone.title,
            description: null,
            state: 'active',
            start_date: widget.milestone.startDate,
            due_date: widget.milestone.dueDate,
            web_url: `${GITLAB_URL}${widget.milestone.webPath}`,
          };
        }
      }

      const issue: GitLabIssue = {
        id: parseInt(node.id.replace(/\D/g, ''), 10),
        iid: parseInt(node.iid, 10),
        title: node.title,
        description: node.description,
        state: node.state === 'OPEN' ? 'opened' : 'closed',
        labels,
        milestone,
        assignees,
        author: { id: 0, username: '', name: '', avatar_url: '' }, // Not available in work items query
        created_at: node.createdAt,
        updated_at: node.updatedAt,
        closed_at: node.closedAt,
        due_date: dueDate,
        start_date: startDate,
        web_url: node.webUrl,
        time_stats: {
          time_estimate: 0,
          total_time_spent: 0,
        },
      };
      issues.push(issue);
    }

    hasNextPage = pageInfo.hasNextPage;
    endCursor = pageInfo.endCursor;
  }

  return issues;
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
