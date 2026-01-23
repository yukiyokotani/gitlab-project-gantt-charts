import { ExternalLink, Check, Square, Calendar, Milestone } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ParsedIssue } from '../types/gitlab';

interface IssueDetailModalProps {
  issue: ParsedIssue | null;
  onClose: () => void;
}

export function IssueDetailModal({ issue, onClose }: IssueDetailModalProps) {
  if (!issue) return null;

  const completedTasks = issue.tasks.filter((t) => t.checked).length;
  const totalTasks = issue.tasks.length;
  const progress =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <Dialog open={!!issue} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-2xl">
          <DialogClose />

          <DialogHeader>
            <div className="flex items-center gap-2 mt-1 mb-1">
              <Badge variant={issue.state === 'opened' ? 'success' : 'secondary'}>
                {issue.state === 'opened' ? 'Open' : 'Closed'}
              </Badge>
              <span className="text-sm text-muted-foreground">#{issue.iid}</span>
            </div>
            <DialogTitle className="text-xl leading-tight">
              {issue.title}
            </DialogTitle>
          </DialogHeader>

          {/* Labels */}
          {issue.labelObjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {issue.labelObjects.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
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

          <Separator />

          {/* Metadata Rows */}
          <div className="space-y-4">
            {/* Row 1: Author & Assignees */}
            <div className="grid grid-cols-2 gap-4">
              {/* Author */}
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  作成者
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="size-6">
                    <AvatarImage
                      src={issue.author.avatar_url}
                      alt={issue.author.name}
                    />
                    <AvatarFallback className="text-xs">
                      {issue.author.name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{issue.author.name || '不明'}</span>
                </div>
              </div>

              {/* Assignees */}
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  担当者
                </span>
                {issue.assignees.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {issue.assignees.map((assignee) => (
                      <div key={assignee.id} className="flex items-center gap-2 mt-1">
                        <Avatar className="size-6">
                          <AvatarImage
                            src={assignee.avatar_url}
                            alt={assignee.name}
                          />
                          <AvatarFallback className="text-xs">
                            {assignee.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{assignee.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    未設定
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Milestone */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                マイルストーン
              </span>
              <div className="flex items-center gap-2 mt-1 text-sm">
                <Milestone className="size-4 text-muted-foreground" />
                {issue.milestone ? (
                  <span>{issue.milestone.title}</span>
                ) : (
                  <span className="text-muted-foreground">未設定</span>
                )}
              </div>
            </div>

            {/* Row 3: Start Date & Due Date */}
            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  開始日
                </span>
                <div className="flex items-center gap-2 mt-1 text-sm">
                  <Calendar className="size-4 text-muted-foreground" />
                  {issue.start_date || (
                    <span className="text-muted-foreground">未設定</span>
                  )}
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  期限
                </span>
                <div className="flex items-center gap-2 mt-1 text-sm">
                  <Calendar className="size-4 text-muted-foreground" />
                  {issue.due_date || (
                    <span className="text-muted-foreground">未設定</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Task Progress */}
          {totalTasks > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">タスク進捗</span>
                  <span className="text-sm text-muted-foreground">
                    {completedTasks}/{totalTasks} ({progress}%)
                  </span>
                </div>
                <Progress value={progress} />
                <ul className="space-y-1.5">
                  {issue.tasks.map((task, index) => (
                    <li
                      key={index}
                      className={`flex items-start gap-2 text-sm ${
                        task.checked ? 'text-muted-foreground line-through' : ''
                      }`}
                    >
                      {task.checked ? (
                        <Check className="size-4 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <Square className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                      )}
                      <span>{task.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Description */}
          {issue.description && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-medium">説明</h3>
                <div className="prose prose-sm max-w-none text-sm rounded-lg bg-muted/50 p-3 text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary prose-code:text-foreground prose-code:bg-border dark:prose-code:bg-zinc-700 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:text-foreground prose-li:marker:text-foreground prose-ul:text-foreground prose-ol:text-foreground">
                  <ReactMarkdown rehypePlugins={[rehypeRaw]}>{issue.description.replace(/\\n/g, '\n')}</ReactMarkdown>
                </div>
              </div>
            </>
          )}

          <Separator />

          <DialogFooter>
            <a
              href={issue.web_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="gap-2">
                GitLabで開く
                <ExternalLink className="size-3.5" />
              </Button>
            </a>
            <Button variant="secondary" onClick={onClose}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
