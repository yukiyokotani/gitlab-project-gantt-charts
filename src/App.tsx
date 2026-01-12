import { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { GanttChart } from './components/GanttChart';
import { IssueDetailModal } from './components/IssueDetailModal';
import { useGitLabData } from './hooks/useGitLabData';
import { useTheme } from './hooks/useTheme';
import { getGitLabConfig } from './api/gitlab';
import type { ParsedIssue } from './types/gitlab';
import './App.css';

function App() {
  const { theme, toggleTheme } = useTheme();
  const { tasks, issues, loading, error, refresh, updateTaskDates } = useGitLabData();
  const [selectedIssue, setSelectedIssue] = useState<ParsedIssue | null>(null);

  const config = getGitLabConfig();

  const handleTaskClick = useCallback(
    (taskId: string) => {
      // Extract issue ID from task ID (format: "issue-{id}")
      const match = taskId.match(/^issue-(\d+)$/);
      if (match) {
        const issueId = parseInt(match[1], 10);
        const issue = issues.find(i => i.id === issueId);
        if (issue) {
          setSelectedIssue(issue);
        }
      }
    },
    [issues]
  );

  const handleTaskUpdate = useCallback(
    async (taskId: string, start: Date, end: Date) => {
      await updateTaskDates(taskId, start, end);
    },
    [updateTaskDates]
  );

  const handleCloseModal = useCallback(() => {
    setSelectedIssue(null);
  }, []);

  // Show configuration error if not set up
  if (!config.hasToken || !config.projectId) {
    return (
      <div className="app" data-theme={theme}>
        <Header
          theme={theme}
          onThemeToggle={toggleTheme}
          onRefresh={refresh}
          loading={loading}
        />
        <div className="config-error">
          <div className="error-card">
            <h2>⚠️ 設定が必要です</h2>
            <p>GitLabに接続するには、以下の環境変数を設定してください：</p>
            <ul>
              <li>
                <code>VITE_GITLAB_URL</code> - GitLabのURL
                <span className="status">
                  {config.url ? `✅ ${config.url}` : '❌ 未設定'}
                </span>
              </li>
              <li>
                <code>VITE_GITLAB_TOKEN</code> - アクセストークン
                <span className="status">
                  {config.hasToken ? '✅ 設定済み' : '❌ 未設定'}
                </span>
              </li>
              <li>
                <code>VITE_GITLAB_PROJECT_ID</code> - プロジェクトID
                <span className="status">
                  {config.projectId ? `✅ ${config.projectId}` : '❌ 未設定'}
                </span>
              </li>
            </ul>
            <p className="hint">
              <code>.env</code> ファイルを作成し、
              <code>.env.example</code> を参考に設定してください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app" data-theme={theme}>
      <Header
        theme={theme}
        onThemeToggle={toggleTheme}
        onRefresh={refresh}
        loading={loading}
      />

      <main className="main-content">
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={refresh}>再試行</button>
          </div>
        )}

        {loading && tasks.length === 0 ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>データを読み込んでいます...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <p>📋 表示するタスクがありません</p>
            <p className="hint">GitLabプロジェクトにIssueを作成してください。</p>
          </div>
        ) : (
          <GanttChart
            tasks={tasks}
            theme={theme}
            onTaskClick={handleTaskClick}
            onTaskUpdate={handleTaskUpdate}
          />
        )}
      </main>

      <IssueDetailModal issue={selectedIssue} onClose={handleCloseModal} />
    </div>
  );
}

export default App;
