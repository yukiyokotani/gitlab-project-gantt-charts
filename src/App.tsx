import { useState, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Header } from './components/Header';
import { GanttChart } from './components/GanttChart';
import { IssueDetailModal } from './components/IssueDetailModal';
import { Button } from '@/components/ui/button';
import { useGitLabData } from './hooks/useGitLabData';
import { useTheme } from './hooks/useTheme';
import { getGitLabConfig } from './api/gitlab';
import type { ParsedIssue } from './types/gitlab';

function App() {
  const { theme, toggleTheme } = useTheme();
  const {
    tasks,
    issues,
    loading,
    error,
    filterOptions,
    setFilterOptions,
    refresh,
    updateTaskDates,
  } = useGitLabData();
  const [selectedIssue, setSelectedIssue] = useState<ParsedIssue | null>(null);

  const config = getGitLabConfig();

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const handleTaskClick = useCallback(
    (taskId: string) => {
      // Extract issue ID from task ID (format: "issue-{id}")
      const match = taskId.match(/^issue-(\d+)$/);
      if (match) {
        const issueId = parseInt(match[1], 10);
        const issue = issues.find((i) => i.id === issueId);
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
      <div className="min-h-screen bg-background">
        <Header
          theme={theme}
          onThemeToggle={toggleTheme}
          onRefresh={refresh}
          loading={loading}
        />
        <div className="flex items-center justify-center p-8">
          <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">設定が必要です</h2>
            <p className="text-muted-foreground mb-6">
              GitLabに接続するには、以下の環境変数を設定してください：
            </p>
            <ul className="space-y-3">
              <li className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/50">
                <div>
                  <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                    VITE_GITLAB_URL
                  </code>
                  <span className="block text-sm text-muted-foreground mt-1">
                    GitLabのURL
                  </span>
                </div>
                <span className="shrink-0">
                  {config.url ? (
                    <span className="text-green-500">✓ {config.url}</span>
                  ) : (
                    <span className="text-destructive">未設定</span>
                  )}
                </span>
              </li>
              <li className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/50">
                <div>
                  <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                    VITE_GITLAB_TOKEN
                  </code>
                  <span className="block text-sm text-muted-foreground mt-1">
                    アクセストークン
                  </span>
                </div>
                <span className="shrink-0">
                  {config.hasToken ? (
                    <span className="text-green-500">✓ 設定済み</span>
                  ) : (
                    <span className="text-destructive">未設定</span>
                  )}
                </span>
              </li>
              <li className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/50">
                <div>
                  <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                    VITE_GITLAB_PROJECT_ID
                  </code>
                  <span className="block text-sm text-muted-foreground mt-1">
                    プロジェクトID
                  </span>
                </div>
                <span className="shrink-0">
                  {config.projectId ? (
                    <span className="text-green-500">✓ {config.projectId}</span>
                  ) : (
                    <span className="text-destructive">未設定</span>
                  )}
                </span>
              </li>
            </ul>
            <p className="text-sm text-muted-foreground mt-6">
              <code className="bg-muted px-2 py-0.5 rounded">.env</code>{' '}
              ファイルを作成し、
              <code className="bg-muted px-2 py-0.5 rounded">.env.example</code>{' '}
              を参考に設定してください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header
        theme={theme}
        onThemeToggle={toggleTheme}
        onRefresh={refresh}
        loading={loading}
        filterOptions={filterOptions}
        onFilterChange={setFilterOptions}
      />

      <main className="flex-1 overflow-hidden">
        {error && (
          <div className="flex items-center justify-between gap-4 px-4 py-2 bg-destructive/10 border-b border-destructive/20">
            <span className="text-sm text-destructive flex items-center gap-2">
              ⚠️ {error}
            </span>
            <Button variant="ghost" size="sm" onClick={refresh}>
              再試行
            </Button>
          </div>
        )}

        {loading && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-muted-foreground">データを読み込んでいます...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="text-lg font-medium">表示するタスクがありません</p>
            <p className="text-muted-foreground">
              GitLabプロジェクトにIssueを作成してください。
            </p>
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
