import { RefreshCw, Sun, Moon, Loader2, Milestone, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FilterOptions } from '../hooks/useGitLabData';
import type { GitLabMilestone } from '../types/gitlab';

interface HeaderProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onRefresh: () => void;
  loading: boolean;
  filterOptions?: FilterOptions;
  onFilterChange?: (options: FilterOptions) => void;
  milestones?: GitLabMilestone[];
}

export function Header({
  theme,
  onThemeToggle,
  onRefresh,
  loading,
  filterOptions,
  onFilterChange,
  milestones = [],
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

  const handleMilestoneToggle = (milestoneId: number) => {
    if (filterOptions && onFilterChange) {
      const currentIds = filterOptions.selectedMilestoneIds;
      const newIds = currentIds.includes(milestoneId)
        ? currentIds.filter(id => id !== milestoneId)
        : [...currentIds, milestoneId];
      onFilterChange({
        ...filterOptions,
        selectedMilestoneIds: newIds,
      });
    }
  };

  const handleSelectAllMilestones = () => {
    if (filterOptions && onFilterChange) {
      onFilterChange({
        ...filterOptions,
        selectedMilestoneIds: [],
      });
    }
  };

  const selectedMilestoneCount = filterOptions?.selectedMilestoneIds.length || 0;
  const milestoneFilterLabel = selectedMilestoneCount === 0
    ? 'すべて'
    : `${selectedMilestoneCount}件選択中`;

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

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">
              マイルストーン:
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  disabled={milestones.length === 0}
                  className="flex h-9 w-[140px] items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <Milestone className="size-4" />
                    {milestones.length === 0 ? '読込中...' : milestoneFilterLabel}
                  </span>
                  <ChevronDown className="size-4 opacity-50" />
                </button>
              </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-2">
                  <div className="space-y-1">
                    <button
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                      onClick={handleSelectAllMilestones}
                    >
                      <div className="flex size-4 items-center justify-center rounded border">
                        {selectedMilestoneCount === 0 && <Check className="size-3" />}
                      </div>
                      <span>すべて表示</span>
                    </button>
                    <div className="my-1 h-px bg-border" />
                    {milestones.map(milestone => {
                      const isSelected = filterOptions.selectedMilestoneIds.includes(milestone.id);
                      return (
                        <button
                          key={milestone.id}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                          onClick={() => handleMilestoneToggle(milestone.id)}
                        >
                          <div className="flex size-4 items-center justify-center rounded border">
                            {isSelected && <Check className="size-3" />}
                          </div>
                          <span className="truncate">{milestone.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
            </Popover>
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
