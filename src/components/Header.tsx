import { ThemeToggle } from './ThemeToggle';
import './Header.css';

interface HeaderProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export function Header({ theme, onThemeToggle, onRefresh, loading }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="app-title">
          <span className="logo">📊</span>
          GitLab Gantt Chart
        </h1>
      </div>
      <div className="header-right">
        <button
          className="refresh-btn"
          onClick={onRefresh}
          disabled={loading}
        >
          <span className={`refresh-icon ${loading ? 'spinning' : ''}`}>🔄</span>
          {loading ? '読み込み中...' : '更新'}
        </button>
        <ThemeToggle theme={theme} onToggle={onThemeToggle} />
      </div>
    </header>
  );
}
