import { IconButton, Spinner, Select, TextField } from '@radix-ui/themes';
import { ReloadIcon, SunIcon, MoonIcon } from '@radix-ui/react-icons';
import type { FilterOptions } from '../hooks/useGitLabData';
import './Header.css';

interface HeaderProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onRefresh: () => void;
  loading: boolean;
  filterOptions?: FilterOptions;
  onFilterChange?: (options: FilterOptions) => void;
}

function formatDateForInput(date: Date | null): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

export function Header({
  theme,
  onThemeToggle,
  onRefresh,
  loading,
  filterOptions,
  onFilterChange,
}: HeaderProps) {
  const handleStateChange = (value: string) => {
    if (filterOptions && onFilterChange) {
      onFilterChange({
        ...filterOptions,
        issueState: value as 'opened' | 'closed' | 'all',
      });
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (filterOptions && onFilterChange) {
      const value = e.target.value;
      onFilterChange({
        ...filterOptions,
        dateRange: {
          ...filterOptions.dateRange,
          startDate: value ? new Date(value) : null,
        },
      });
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (filterOptions && onFilterChange) {
      const value = e.target.value;
      onFilterChange({
        ...filterOptions,
        dateRange: {
          ...filterOptions.dateRange,
          endDate: value ? new Date(value) : null,
        },
      });
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="app-title">
          <span className="logo">📊</span>
          GitLab Gantt Chart
        </h1>
      </div>

      {filterOptions && onFilterChange && (
        <div className="header-filters">
          <div className="filter-group">
            <label className="filter-label">状態:</label>
            <Select.Root
              value={filterOptions.issueState}
              onValueChange={handleStateChange}
              size="1"
            >
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="opened">Open</Select.Item>
                <Select.Item value="closed">Closed</Select.Item>
                <Select.Item value="all">All</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>
          <div className="filter-group">
            <label className="filter-label">期間:</label>
            <TextField.Root
              type="date"
              size="1"
              value={formatDateForInput(filterOptions.dateRange.startDate)}
              onChange={handleStartDateChange}
            />
            <span className="date-separator">〜</span>
            <TextField.Root
              type="date"
              size="1"
              value={formatDateForInput(filterOptions.dateRange.endDate)}
              onChange={handleEndDateChange}
            />
          </div>
        </div>
      )}

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
