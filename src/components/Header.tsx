import { RefreshCw, Sun, Moon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FilterOptions } from '../hooks/useGitLabData';

interface HeaderProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onRefresh: () => void;
  loading: boolean;
  filterOptions?: FilterOptions;
  onFilterChange?: (options: FilterOptions) => void;
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

  const handleStartDateChange = (date: Date | null) => {
    if (filterOptions && onFilterChange) {
      onFilterChange({
        ...filterOptions,
        dateRange: {
          ...filterOptions.dateRange,
          startDate: date,
        },
      });
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    if (filterOptions && onFilterChange) {
      onFilterChange({
        ...filterOptions,
        dateRange: {
          ...filterOptions.dateRange,
          endDate: date,
        },
      });
    }
  };

  return (
    <header className="flex items-center justify-between gap-4 px-6 py-3 bg-card border-b border-border shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10">
          <span className="text-lg">📊</span>
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          GitLab Gantt Chart
        </h1>
      </div>

      {filterOptions && onFilterChange && (
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">
              状態:
            </label>
            <Select
              value={filterOptions.issueState}
              onValueChange={handleStateChange}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="選択..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="opened">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">
              期間:
            </label>
            <DatePicker
              date={filterOptions.dateRange.startDate}
              onDateChange={handleStartDateChange}
              placeholder="開始日"
            />
            <span className="text-muted-foreground">〜</span>
            <DatePicker
              date={filterOptions.dateRange.endDate}
              onDateChange={handleEndDateChange}
              placeholder="終了日"
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={loading}
          aria-label="更新"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onThemeToggle}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <Moon className="size-4" />
          ) : (
            <Sun className="size-4" />
          )}
        </Button>
      </div>
    </header>
  );
}
