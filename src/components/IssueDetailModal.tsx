import type { ParsedIssue } from '../types/gitlab';
import './IssueDetailModal.css';

interface IssueDetailModalProps {
  issue: ParsedIssue | null;
  onClose: () => void;
}

export function IssueDetailModal({ issue, onClose }: IssueDetailModalProps) {
  if (!issue) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const completedTasks = issue.tasks.filter(t => t.checked).length;
  const totalTasks = issue.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-title-row">
            <span className={`issue-state ${issue.state}`}>
              {issue.state === 'opened' ? '🔵' : '✅'}
            </span>
            <h2 className="modal-title">
              #{issue.iid} {issue.title}
            </h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Labels */}
          {issue.labelObjects.length > 0 && (
            <div className="issue-labels">
              {issue.labelObjects.map(label => (
                <span
                  key={label.id}
                  className="label-badge"
                  style={{
                    backgroundColor: label.color,
                    color: label.text_color,
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div className="issue-meta">
            <div className="meta-item">
              <span className="meta-label">作成者</span>
              <span className="meta-value">
                <img
                  src={issue.author.avatar_url}
                  alt={issue.author.name}
                  className="avatar"
                />
                {issue.author.name}
              </span>
            </div>

            {issue.assignees.length > 0 && (
              <div className="meta-item">
                <span className="meta-label">担当者</span>
                <span className="meta-value assignees">
                  {issue.assignees.map(assignee => (
                    <span key={assignee.id} className="assignee">
                      <img
                        src={assignee.avatar_url}
                        alt={assignee.name}
                        className="avatar"
                      />
                      {assignee.name}
                    </span>
                  ))}
                </span>
              </div>
            )}

            {issue.milestone && (
              <div className="meta-item">
                <span className="meta-label">マイルストーン</span>
                <span className="meta-value">📁 {issue.milestone.title}</span>
              </div>
            )}

            <div className="meta-item">
              <span className="meta-label">期限</span>
              <span className="meta-value">
                {issue.due_date || '未設定'}
              </span>
            </div>

            {issue.start_date && (
              <div className="meta-item">
                <span className="meta-label">開始日</span>
                <span className="meta-value">{issue.start_date}</span>
              </div>
            )}
          </div>

          {/* Task Progress */}
          {totalTasks > 0 && (
            <div className="task-progress-section">
              <div className="progress-header">
                <span>タスク進捗</span>
                <span>{completedTasks}/{totalTasks} ({progress}%)</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <ul className="task-list">
                {issue.tasks.map((task, index) => (
                  <li key={index} className={task.checked ? 'completed' : ''}>
                    <span className="task-checkbox">
                      {task.checked ? '☑' : '☐'}
                    </span>
                    {task.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Description */}
          {issue.description && (
            <div className="issue-description">
              <h3>説明</h3>
              <div className="description-content">
                {issue.description}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <a
            href={issue.web_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            GitLabで開く ↗
          </a>
          <button className="btn btn-secondary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
