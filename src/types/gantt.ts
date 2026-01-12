export interface GanttTask {
  id: string;
  text: string;
  start: Date;
  end: Date;
  duration?: number;
  progress?: number;
  type?: 'task' | 'summary' | 'milestone';
  parent?: string;
  open?: boolean;
  // Custom fields for GitLab integration
  gitlabId?: number;
  gitlabIid?: number;
  webUrl?: string;
  labels?: LabelInfo[];
  assignees?: AssigneeInfo[];
  issueState?: 'opened' | 'closed';
  isSubtask?: boolean;
  milestoneId?: number;
  // Flags for original date existence
  hasOriginalStartDate?: boolean;
  hasOriginalDueDate?: boolean;
}

export interface LabelInfo {
  name: string;
  color: string;
  textColor: string;
}

export interface AssigneeInfo {
  id: number;
  name: string;
  avatarUrl: string;
}

export interface GanttLink {
  id: string;
  source: string;
  target: string;
  type: 'e2s' | 's2s' | 'e2e' | 's2e';
}

export interface GanttScale {
  unit: 'hour' | 'day' | 'week' | 'month' | 'year';
  step: number;
  format: string;
}
