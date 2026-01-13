import { IconButton, Spinner } from '@radix-ui/themes';
import { ReloadIcon, SunIcon, MoonIcon } from '@radix-ui/react-icons';
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
        <IconButton
          variant="ghost"
          onClick={onRefresh}
          disabled={loading}
          aria-label="更新"
        >
          {loading ? <Spinner /> : <ReloadIcon />}
        </IconButton>
        <IconButton
          variant="ghost"
          onClick={onThemeToggle}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </IconButton>
      </div>
    </header>
  );
}
