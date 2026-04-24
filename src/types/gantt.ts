export type GanttTask = {
  id: string;
  text: string;
  start: Date;
  end: Date;
  duration?: number;
  progress?: number;
  type?: 'task' | 'summary' | 'milestone';
  parent?: string;
  open?: boolean;
  gitlabId?: number;
  gitlabIid?: number;
  webUrl?: string;
  labels?: LabelInfo[];
  assignees?: AssigneeInfo[];
  issueState?: 'opened' | 'closed';
  isSubtask?: boolean;
  milestoneId?: number;
  hasOriginalStartDate?: boolean;
  hasOriginalDueDate?: boolean;
};

export type LabelInfo = {
  name: string;
  color: string;
  textColor: string;
};

export type AssigneeInfo = {
  id: number;
  name: string;
  avatarUrl: string;
};

export type GanttLink = {
  id: string;
  source: string;
  target: string;
  type: 'e2s' | 's2s' | 'e2e' | 's2e';
};

export type GanttScale = {
  unit: 'hour' | 'day' | 'week' | 'month' | 'year';
  step: number;
  format: string;
};
