'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, MessageSquare, Trash2 } from 'lucide-react';

export interface WorkspaceTask {
  id: string;
  title: string;
  description?: string | null;
  status?: string;
  column?: string;
  priority?: string;
  type?: string;
  dueDate?: string | null;
  assigneeId?: string | null;
  assignee?: {
    id: string;
    name?: string | null;
    avatarUrl?: string | null;
    githubUsername?: string | null;
  } | null;
  _count?: { comments: number };
}

interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name?: string | null;
    githubUsername?: string | null;
    avatarUrl?: string | null;
  };
}

interface TaskDetail extends WorkspaceTask {
  comments: TaskComment[];
}

interface Person {
  id: string;
  name?: string | null;
  avatarUrl?: string | null;
}

interface TaskDraft {
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  assigneeId: string;
  dueDate: string;
}

const initialDraft: TaskDraft = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  type: 'feature',
  assigneeId: '',
  dueDate: '',
};

const apiRequest = async (path: string, options: RequestInit = {}) => {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${backendUrl}${path}`, {
    credentials: 'include',
    ...options,
    headers: { ...headers, ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export function TaskDetailsDialog({
  taskId,
  onClose,
  onUpdated,
  onDeleted,
  onCommentAdded,
  people,
  canEdit,
  canDelete,
}: {
  taskId: string | null;
  onClose: () => void;
  onUpdated: (task: WorkspaceTask) => void;
  onDeleted: (taskId: string) => void;
  onCommentAdded: (taskId: string) => void;
  people: Person[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(initialDraft);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setDraft(initialDraft);
      setComment('');
      setLoadError(null);
      return;
    }

    let active = true;
    setTask(null);
    setLoadError(null);
    setLoading(true);
    apiRequest(`/api/tasks/${taskId}`)
      .then((data: TaskDetail) => {
        if (!active) return;
        setTask(data);
        setDraft({
          title: data.title,
          description: data.description || '',
          status: data.status || 'todo',
          priority: data.priority || 'medium',
          type: data.type || 'feature',
          assigneeId: data.assigneeId || '',
          dueDate: data.dueDate ? data.dueDate.slice(0, 10) : '',
        });
      })
      .catch((error) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Could not open task');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [taskId, loadAttempt]);

  useEffect(() => {
    if (!taskId) return;
    const interval = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const comments: TaskComment[] = await apiRequest(`/api/tasks/${taskId}/comments`);
        setTask((current) => current?.id === taskId ? { ...current, comments } : current);
      } catch {
        // The current task stays usable during a temporary connection failure.
      }
    }, 12000);
    return () => window.clearInterval(interval);
  }, [taskId]);

  const save = async () => {
    if (!taskId || !task) return;
    if (!draft.title.trim()) return toast.error('Task title is required');
    setSaving(true);
    try {
      const updated: WorkspaceTask = await apiRequest(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: draft.title.trim(),
          description: draft.description.trim(),
          status: draft.status,
          priority: draft.priority,
          type: draft.type,
          assigneeId: draft.assigneeId || null,
          dueDate: draft.dueDate ? new Date(`${draft.dueDate}T00:00:00.000Z`).toISOString() : null,
        }),
      });
      setTask((current) => current ? { ...current, ...updated } : current);
      onUpdated(updated);
      toast.success('Task saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save task');
    } finally {
      setSaving(false);
    }
  };

  const postComment = async () => {
    if (!taskId || !comment.trim()) return;
    setPosting(true);
    try {
      const created: TaskComment = await apiRequest(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: comment.trim() }),
      });
      setTask((current) => current ? { ...current, comments: [created, ...current.comments] } : current);
      setComment('');
      onCommentAdded(taskId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not post comment');
    } finally {
      setPosting(false);
    }
  };

  const deleteTask = async () => {
    if (!taskId || !task || !window.confirm(`Delete "${task.title}" and its discussion?`)) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/tasks/${taskId}`, { method: 'DELETE' });
      onDeleted(taskId);
      onClose();
      toast.success('Task deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete task');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={Boolean(taskId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-800 bg-slate-950 text-slate-100 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Task workspace {task && <Badge variant="outline" className="border-slate-700 text-slate-400">{task.status?.replace('_', ' ')}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {loadError ? (
          <div role="alert" className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-rose-300">{loadError}</p>
            <Button variant="outline" onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="border-slate-700 text-slate-100">
              Try again
            </Button>
          </div>
        ) : loading || !task ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
          </div>
        ) : (
          <div className="grid gap-7 py-2 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-detail-title">Title</Label>
                <Input
                  id="task-detail-title"
                  maxLength={200}
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  disabled={!canEdit}
                  className="border-slate-700 bg-slate-900 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-detail-description">What needs to happen?</Label>
                <Textarea
                  id="task-detail-description"
                  maxLength={5000}
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  disabled={!canEdit}
                  className="min-h-32 border-slate-700 bg-slate-900 text-slate-100"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="task-detail-status">Status</Label>
                  <select
                    id="task-detail-status"
                    value={draft.status}
                    onChange={(event) => setDraft({ ...draft, status: event.target.value })}
                    disabled={!canEdit}
                    className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-detail-priority">Priority</Label>
                  <select
                    id="task-detail-priority"
                    value={draft.priority}
                    onChange={(event) => setDraft({ ...draft, priority: event.target.value })}
                    disabled={!canEdit}
                    className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-detail-type">Type</Label>
                  <select
                    id="task-detail-type"
                    value={draft.type}
                    onChange={(event) => setDraft({ ...draft, type: event.target.value })}
                    disabled={!canEdit}
                    className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
                  >
                    <option value="feature">Feature</option>
                    <option value="bug">Bug</option>
                    <option value="docs">Docs</option>
                    <option value="improvement">Improvement</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-detail-due">Due date</Label>
                  <Input
                    id="task-detail-due"
                    type="date"
                    value={draft.dueDate}
                    onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}
                    disabled={!canEdit}
                    className="border-slate-700 bg-slate-900 text-slate-100"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-detail-assignee">Owner of this task</Label>
                <select
                  id="task-detail-assignee"
                  value={draft.assigneeId}
                  onChange={(event) => setDraft({ ...draft, assigneeId: event.target.value })}
                  disabled={!canEdit}
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
                >
                  <option value="">Unassigned</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>{person.name || 'Teammate'}</option>
                  ))}
                </select>
              </div>
              {canEdit && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Button onClick={save} disabled={saving || deleting} className="bg-indigo-500 text-white hover:bg-indigo-400">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save task
                  </Button>
                  {canDelete && (
                    <Button variant="ghost" onClick={deleteTask} disabled={saving || deleting} className="text-rose-400 hover:bg-rose-950/40 hover:text-rose-300">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete task
                    </Button>
                  )}
                </div>
              )}
            </div>

            <section className="border-t border-slate-800 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-200">
                <MessageSquare className="h-4 w-4 text-indigo-400" />
                Discussion <span className="text-slate-500">({task.comments.length})</span>
              </h3>
              <div className="max-h-72 space-y-4 overflow-y-auto pr-1">
                {task.comments.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-800 p-5 text-sm text-slate-500">
                    No discussion yet. Use this space for decisions, blockers, and links.
                  </p>
                ) : task.comments.slice().reverse().map((item) => (
                  <div key={item.id} className="flex items-start gap-2.5">
                    <Avatar className="h-7 w-7 border border-slate-700">
                      <AvatarImage src={item.user.avatarUrl || undefined} alt={item.user.name || 'Teammate'} />
                      <AvatarFallback>{(item.user.name || 'T').slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 rounded-xl bg-slate-900 px-3 py-2.5">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-slate-200">{item.user.name || item.user.githubUsername || 'Teammate'}</span>
                        <time className="text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleString()}</time>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm text-slate-300">{item.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              {canEdit && (
                <div className="mt-5 space-y-2">
                  <Label htmlFor="task-comment">Add an update</Label>
                  <Textarea
                    id="task-comment"
                    maxLength={3000}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="What changed? What do you need from the team?"
                    className="min-h-24 border-slate-700 bg-slate-900 text-slate-100"
                  />
                  <Button onClick={postComment} disabled={posting || !comment.trim()} variant="outline" className="border-indigo-500/40 text-indigo-200">
                    {posting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Post update
                  </Button>
                </div>
              )}
            </section>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
