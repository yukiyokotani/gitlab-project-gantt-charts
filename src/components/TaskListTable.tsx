import { Task } from 'gantt-task-react';
import type { GanttTask } from '../types/gantt';
import './TaskList.css';

interface TaskListTableProps {
  tasks: Task[];
  rowHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
  locale: string;
  onExpanderClick: (task: Task) => void;
  columnWidths: { name: number; from: number; to: number };
  originalTaskMap: Map<string, GanttTask>;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '-';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

export function TaskListTable({
  tasks,
  rowHeight,
  fontFamily,
  fontSize,
  onExpanderClick,
  columnWidths,
  originalTaskMap,
}: TaskListTableProps) {
  return (
    <div
      className="task-list-table"
      style={{ fontFamily, fontSize }}
    >
      {tasks.map((task, index) => {
        const isProject = task.type === 'project';
        const isChild = !!task.project;
        const originalTask = originalTaskMap.get(task.id);

        // Get original dates - show '-' if no original date was set in GitLab
        // hasOriginalStartDate/DueDate are true when the issue has start_date/due_date set
        const startDate = originalTask?.hasOriginalStartDate === true ? originalTask.start : null;
        const endDate = originalTask?.hasOriginalDueDate === true ? originalTask.end : null;

        return (
          <div
            key={task.id}
            className={`task-list-row ${index % 2 === 0 ? 'even' : 'odd'}`}
            style={{ height: rowHeight }}
          >
            <div
              className="task-list-cell name-cell"
              style={{ width: columnWidths.name }}
              title={task.name}
            >
              {isProject && (
                <button
                  className="expander"
                  onClick={() => onExpanderClick(task)}
                >
                  {task.hideChildren ? '▶' : '▼'}
                </button>
              )}
              {isChild && !isProject && <span className="indent" />}
              <span className={`task-name ${isProject ? 'project' : ''}`}>
                {task.name}
              </span>
            </div>
            <div
              className="task-list-cell date-cell"
              style={{ width: columnWidths.from }}
            >
              {formatDate(startDate)}
            </div>
            <div
              className="task-list-cell date-cell"
              style={{ width: columnWidths.to }}
            >
              {formatDate(endDate)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
