export interface GitLabLabel {
  id: number;
  name: string;
  color: string;
  text_color: string;
  description: string | null;
}

export interface GitLabMilestone {
  id: number;
  iid: number;
  title: string;
  description: string | null;
  state: 'active' | 'closed';
  start_date: string | null;
  due_date: string | null;
  web_url: string;
}

export interface GitLabIssue {
  id: number;
  iid: number;
  title: string;
  description: string | null;
  state: 'opened' | 'closed';
  labels: string[];
  milestone: GitLabMilestone | null;
  assignees: GitLabUser[];
  author: GitLabUser;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  due_date: string | null;
  start_date?: string | null;
  web_url: string;
  time_stats: {
    time_estimate: number;
    total_time_spent: number;
  };
  task_completion_status?: {
    count: number;
    completed_count: number;
  };
}

export interface GitLabUser {
  id: number;
  username: string;
  name: string;
  avatar_url: string;
}

export interface TaskItem {
  text: string;
  checked: boolean;
}

export interface ParsedIssue extends GitLabIssue {
  tasks: TaskItem[];
  labelObjects: GitLabLabel[];
}
