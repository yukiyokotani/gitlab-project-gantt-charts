import * as Dialog from '@radix-ui/react-dialog';
import * as Avatar from '@radix-ui/react-avatar';
import * as Progress from '@radix-ui/react-progress';
import * as Separator from '@radix-ui/react-separator';
import type { ParsedIssue } from '../types/gitlab';
import './IssueDetailModal.css';

interface IssueDetailModalProps {
  issue: ParsedIssue | null;
  onClose: () => void;
}

export function IssueDetailModal({ issue, onClose }: IssueDetailModalProps) {
  if (!issue) return null;

  const completedTasks = issue.tasks.filter(t => t.checked).length;
  const totalTasks = issue.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <Dialog.Root open={!!issue} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <div className="dialog-header">
            <div className="dialog-title-row">
              <span className={`issue-state-badge ${issue.state}`}>
                {issue.state === 'opened' ? 'Open' : 'Closed'}
              </span>
              <Dialog.Title className="dialog-title">
                #{issue.iid} {issue.title}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="dialog-close-button" aria-label="Close">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path
                    d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                    fill="currentColor"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          <Separator.Root className="separator" />

          <div className="dialog-body">
            {/* Labels */}
            {issue.labelObjects.length > 0 && (
              <div className="labels-section">
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

            {/* Metadata Grid */}
            <div className="meta-grid">
              {/* Author */}
              {issue.author.name && (
                <div className="meta-item">
                  <span className="meta-label">作成者</span>
                  <div className="meta-value user-info">
                    <Avatar.Root className="avatar-root">
                      <Avatar.Image
                        className="avatar-image"
                        src={issue.author.avatar_url}
                        alt={issue.author.name}
                      />
                      <Avatar.Fallback className="avatar-fallback">
                        {issue.author.name.charAt(0).toUpperCase()}
                      </Avatar.Fallback>
                    </Avatar.Root>
                    <span className="user-name">{issue.author.name}</span>
                  </div>
                </div>
              )}

              {/* Assignees */}
              {issue.assignees.length > 0 && (
                <div className="meta-item">
                  <span className="meta-label">担当者</span>
                  <div className="meta-value assignees-list">
                    {issue.assignees.map(assignee => (
                      <div key={assignee.id} className="user-info">
                        <Avatar.Root className="avatar-root">
                          <Avatar.Image
                            className="avatar-image"
                            src={assignee.avatar_url}
                            alt={assignee.name}
                          />
                          <Avatar.Fallback className="avatar-fallback">
                            {assignee.name.charAt(0).toUpperCase()}
                          </Avatar.Fallback>
                        </Avatar.Root>
                        <span className="user-name">{assignee.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Milestone */}
              {issue.milestone && (
                <div className="meta-item">
                  <span className="meta-label">マイルストーン</span>
                  <div className="meta-value milestone-info">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm2-.5a.5.5 0 00-.5.5v8a.5.5 0 00.5.5h8a.5.5 0 00.5-.5V4a.5.5 0 00-.5-.5H4z"/>
                    </svg>
                    <span>{issue.milestone.title}</span>
                  </div>
                </div>
              )}

              {/* Start Date */}
              <div className="meta-item">
                <span className="meta-label">開始日</span>
                <div className="meta-value">
                  {issue.start_date || <span className="not-set">未設定</span>}
                </div>
              </div>

              {/* Due Date */}
              <div className="meta-item">
                <span className="meta-label">期限</span>
                <div className="meta-value">
                  {issue.due_date || <span className="not-set">未設定</span>}
                </div>
              </div>
            </div>

            {/* Task Progress */}
            {totalTasks > 0 && (
              <>
                <Separator.Root className="separator" />
                <div className="progress-section">
                  <div className="progress-header">
                    <span className="progress-title">タスク進捗</span>
                    <span className="progress-stats">{completedTasks}/{totalTasks} ({progress}%)</span>
                  </div>
                  <Progress.Root className="progress-root" value={progress}>
                    <Progress.Indicator
                      className="progress-indicator"
                      style={{ transform: `translateX(-${100 - progress}%)` }}
                    />
                  </Progress.Root>
                  <ul className="task-list">
                    {issue.tasks.map((task, index) => (
                      <li key={index} className={`task-item ${task.checked ? 'completed' : ''}`}>
                        <span className="task-checkbox">
                          {task.checked ? (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" opacity="0.3">
                              <path d="M4 4h8v8H4V4zm-1 0a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4z"/>
                            </svg>
                          )}
                        </span>
                        <span className="task-text">{task.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Description */}
            {issue.description && (
              <div className="description-section">
                <h3 className="section-title">説明</h3>
                <div className="description-content">
                  {issue.description}
                </div>
              </div>
            )}
          </div>

          <Separator.Root className="separator" />

          <div className="dialog-footer">
            <a
              href={issue.web_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              GitLabで開く
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: '4px' }}>
                <path d="M3.5 3C3.22386 3 3 3.22386 3 3.5C3 3.77614 3.22386 4 3.5 4H7.29289L3.14645 8.14645C2.95118 8.34171 2.95118 8.65829 3.14645 8.85355C3.34171 9.04882 3.65829 9.04882 3.85355 8.85355L8 4.70711V8.5C8 8.77614 8.22386 9 8.5 9C8.77614 9 9 8.77614 9 8.5V3.5C9 3.22386 8.77614 3 8.5 3H3.5Z" fill="currentColor"/>
              </svg>
            </a>
            <Dialog.Close asChild>
              <button className="btn btn-secondary">閉じる</button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
