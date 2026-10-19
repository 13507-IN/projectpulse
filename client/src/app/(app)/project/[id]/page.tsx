'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RainbowButton } from '@/components/magicui/rainbow-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Github, MoreVertical, Plus, Loader2, ArrowLeft, CheckCircle2, AlertTriangle, Layers, Calendar, User, UserPlus, MessageSquare, CalendarDays, RefreshCw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import Link from 'next/link';
import { TaskDetailsDialog, type WorkspaceTask } from '@/components/project/task-details-dialog';

type TaskStatus = 'feature' | 'bug' | 'docs' | 'improvement';
type ColumnName = 'To Do' | 'In Progress' | 'Done';

type Task = WorkspaceTask;

interface ProjectMember {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    githubUsername?: string;
    avatarUrl?: string;
  };
}

interface ProjectData {
  id: string;
  name: string;
  description: string;
  category?: string;
  tech?: string[];
  isDiscoverable?: boolean;
  githubRepoName?: string;
  githubRepoUrl?: string;
  owner?: {
    id: string;
    name: string;
    githubUsername?: string;
    avatarUrl?: string;
  };
  members?: ProjectMember[];
  tasks?: Task[];
}

const TaskCard = ({
  task,
  onStatusChange,
  onOpen,
  canEdit,
}: {
  task: Task;
  onStatusChange: (task: Task, newColumn: ColumnName) => void;
  onOpen: (taskId: string) => void;
  canEdit: boolean;
}) => {
  const taskType = (task.type || 'feature') as TaskStatus;
  const currentColumn: ColumnName =
    task.column === 'In Progress' || task.status === 'in_progress'
      ? 'In Progress'
      : task.column === 'Done' || task.status === 'done'
        ? 'Done'
        : 'To Do';

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Open task ${task.title}`}
      onClick={() => onOpen(task.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(task.id);
        }
      }}
      draggable={canEdit}
      onDragStart={(event) => {
        if (!canEdit) return event.preventDefault();
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', task.id);
      }}
      className={`mb-4 glass-card hover-glow border-none transition-all duration-300 group cursor-pointer ${canEdit ? 'active:cursor-grabbing' : ''}`}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <p className="font-bold pr-2 text-slate-100 text-sm group-hover:text-indigo-300 transition-colors">{task.title}</p>
          <MoreVertical className="h-4 w-4 text-slate-400 cursor-pointer shrink-0" />
        </div>
        {task.description && (
          <p className="text-[11px] text-slate-400/80 mt-1.5 line-clamp-2 font-medium">{task.description}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
          {task.priority === 'high' && <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">High priority</Badge>}
          {task.dueDate && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {task._count?.comments || 0}
          </span>
        </div>
        <div className="flex justify-between items-center mt-4 pt-2 border-t border-slate-800/80">
          <Badge
            variant={
              taskType === 'bug'
                ? 'destructive'
                : taskType === 'docs'
                ? 'default'
                : 'secondary'
            }
            className="text-[10px]"
          >
            {taskType}
          </Badge>
          <div className="flex items-center gap-2">
            {task.assignee ? (
              <Avatar className="h-6 w-6 ring-2 ring-indigo-500/30 ring-offset-1 ring-offset-slate-900">
                <AvatarImage src={task.assignee.avatarUrl || undefined} alt={task.assignee.name || 'Assignee'} />
                <AvatarFallback className="text-[10px]">{task.assignee.name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
            ) : (
              <span className="text-[10px] text-slate-500">Unassigned</span>
            )}
            <select
              aria-label={`Move ${task.title}`}
              value={currentColumn}
              disabled={!canEdit}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              onChange={(event) => onStatusChange(task, event.target.value as ColumnName)}
              className="max-w-24 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-[10px] text-slate-300 outline-none focus:border-indigo-500"
            >
              <option value="To Do">To do</option>
              <option value="In Progress">Doing</option>
              <option value="Done">Done</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AddTaskDialog = ({
  column,
  projectId,
  members,
  owner,
  onTaskCreated,
}: {
  column: ColumnName;
  projectId: string;
  members: ProjectMember[];
  owner?: ProjectData['owner'];
  onTaskCreated: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [type, setType] = useState<TaskStatus>('feature');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const people = [owner, ...members.filter((member) => member.role !== 'viewer').map((member) => member.user)]
    .filter((person): person is NonNullable<typeof person> => Boolean(person))
    .filter((person, index, all) => all.findIndex((candidate) => candidate.id === person.id) === index);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Task title is required');
      return;
    }

    try {
      setSubmitting(true);
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

      const dbStatus = column === 'Done' ? 'done' : column === 'In Progress' ? 'in_progress' : 'todo';

      const response = await fetch(`${backendUrl}/api/tasks`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          projectId,
          title: title.trim(),
          description: description.trim(),
          column,
          status: dbStatus,
          type,
          priority,
          dueDate: dueDate ? new Date(`${dueDate}T00:00:00.000Z`).toISOString() : null,
          assigneeId: assigneeId || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to create task');
      toast.success('Task created!');
      setOpen(false);
      setTitle('');
      setDescription('');
      setAssigneeId('');
      setType('feature');
      setPriority('medium');
      setDueDate('');
      onTaskCreated();
    } catch (error) {
      console.error('Task creation error:', error);
      toast.error('Could not create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-400 hover:text-indigo-300 hover:bg-slate-800">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-slate-950 text-slate-100 border-slate-800">
        <DialogHeader>
          <DialogTitle>Add New Task to {column}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs">Task Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Implement OAuth authentication flow"
              className="bg-slate-900 border-slate-700 text-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc" className="text-xs">Description</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief details about what needs to be built..."
              className="bg-slate-900 border-slate-700 text-slate-200 min-h-[60px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="type" className="text-xs">Task Type</Label>
            <Select onValueChange={(value) => setType(value as TaskStatus)} value={type}>
              <SelectTrigger id="type" className="bg-slate-900 border-slate-700">
                <SelectValue placeholder="Select task type" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 text-zinc-100">
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="docs">Docs</SelectItem>
                <SelectItem value="improvement">Improvement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="taskPriority" className="text-xs">Priority</Label>
              <select
                id="taskPriority"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taskDueDate" className="text-xs">Due date</Label>
              <Input
                id="taskDueDate"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="border-slate-700 bg-slate-900 text-slate-200"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="taskAssignee" className="text-xs">Assign to</Label>
            <select
              id="taskAssignee"
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200"
            >
              <option value="">Unassigned</option>
              {people.map((person) => <option key={person.id} value={person.id}>{person.name || 'Teammate'}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <RainbowButton onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Add Task
          </RainbowButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function DynamicProjectWorkspace() {
  const params = useParams();
  const projectId = String(params?.id || '1');
  const router = useRouter();
  const { user } = useAuth();

  const [project, setProject] = useState<ProjectData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [updatingDiscovery, setUpdatingDiscovery] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskQuery, setTaskQuery] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'mine' | 'overdue'>('all');

  const [recommendedTeammates, setRecommendedTeammates] = useState<any[]>([]);

  useEffect(() => {
    fetchProjectDetails();
    fetchRecommendedTeammates();
  }, [projectId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !movingTaskId) refreshTasks();
    }, 12000);
    return () => window.clearInterval(interval);
  }, [projectId, movingTaskId]);

  const fetchRecommendedTeammates = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

      const res = await fetch(`${backendUrl}/api/team?projectId=${projectId}&limit=3`, {
        credentials: 'include',
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        setRecommendedTeammates(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch recommended teammates for project:', err);
    }
  };

  const handleInviteTeammate = async (teammateId: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

      const res = await fetch(`${backendUrl}/api/team/invite`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          receiverId: teammateId,
          projectId,
          message: `Hi! I'd love to invite you to collaborate on ${project?.name || 'this project'}.`
        }),
      });

      const resData = await res.json().catch(() => ({}));

      if (res.ok) {
        setRecommendedTeammates(prev => prev.map(c => c.id === teammateId ? { ...c, inviteStatus: 'pending' } : c));
        toast.success('Project invite sent!');
      } else {
        if (res.status === 400 && resData.error && resData.error.includes('already sent')) {
          setRecommendedTeammates(prev => prev.map(c => c.id === teammateId ? { ...c, inviteStatus: 'pending' } : c));
          toast.info('Invite already sent to this user');
          return;
        }
        toast.error(resData.error || 'Failed to send project invite');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error sending project invite');
    }
  };

  const refreshTasks = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (storedToken) headers.Authorization = `Bearer ${storedToken}`;
      const response = await fetch(`${backendUrl}/api/tasks/project/${projectId}`, {
        credentials: 'include',
        headers,
      });
      if (!response.ok) throw new Error('Could not refresh tasks');
      const data = await response.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Task refresh error:', error);
    }
  };

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

      const res = await fetch(`${backendUrl}/api/projects/${projectId}?includeTasks=false`, {
        credentials: 'include',
        headers,
      });

      if (!res.ok) {
        if (res.status === 404) {
          toast.error('Project workspace not found');
          router.push('/dashboard');
          return;
        }
        throw new Error('Failed to load project details');
      }

      const data: ProjectData = await res.json();
      setProject(data);

      await refreshTasks();
    } catch (error) {
      console.error(error);
      toast.error('Could not load project workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncWithGitHub = async () => {
    if (!user || !project?.githubRepoName) {
      toast.error('Please connect a GitHub repository to sync');
      return;
    }

    setSyncing(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

      const response = await fetch(`${backendUrl}/api/github/sync/${user.login}/${project.githubRepoName}`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Sync complete: ${data.message || 'GitHub repositories synchronized'}`);
        await refreshTasks();
      } else {
        toast.error('Sync failed. Please check repository connections.');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync with GitHub.');
    } finally {
      setSyncing(false);
    }
  };

  const moveTask = async (task: Task, newColumn: ColumnName) => {
    const statusByColumn: Record<ColumnName, string> = {
      'To Do': 'todo',
      'In Progress': 'in_progress',
      Done: 'done',
    };
    const newStatus = statusByColumn[newColumn];

    if (task.column === newColumn && task.status === newStatus) return;

    const previousTasks = tasks;
    setMovingTaskId(task.id);
    setTasks((currentTasks) =>
      currentTasks.map((currentTask) =>
        currentTask.id === task.id
          ? { ...currentTask, column: newColumn, status: newStatus }
          : currentTask
      )
    );

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) headers.Authorization = `Bearer ${storedToken}`;

      const response = await fetch(`${backendUrl}/api/tasks/${task.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({ column: newColumn, status: newStatus }),
      });

      if (!response.ok) throw new Error('Could not save task status');
      toast.success(`Moved "${task.title}" to ${newColumn}`);
    } catch (error) {
      console.error('Task move error:', error);
      setTasks(previousTasks);
      toast.error('Could not move task. Please try again.');
    } finally {
      setMovingTaskId(null);
    }
  };

  const toggleDiscovery = async () => {
    if (!project) return;
    setUpdatingDiscovery(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) headers.Authorization = `Bearer ${storedToken}`;
      const response = await fetch(`${backendUrl}/api/projects/${projectId}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({ isDiscoverable: !project.isDiscoverable }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update discovery settings');
      setProject((current) => current ? { ...current, isDiscoverable: data.isDiscoverable } : current);
      toast.success(data.isDiscoverable ? 'Your project is now on the discovery board' : 'Your project is no longer discoverable');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update discovery settings');
    } finally {
      setUpdatingDiscovery(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!project) return null;

  const columns: ColumnName[] = ['To Do', 'In Progress', 'Done'];
  const isProjectOwner = Boolean(project.owner?.id && user?.id && String(project.owner.id) === String(user.id));
  const myMembership = project.members?.find((member) => user?.id && String(member.user.id) === String(user.id));
  const canEditTasks = isProjectOwner || ['owner', 'admin', 'member'].includes(myMembership?.role || '');
  const canDeleteTasks = isProjectOwner || ['owner', 'admin'].includes(myMembership?.role || '');
  const people = [project.owner, ...(project.members || [])
    .filter((member) => member.role !== 'viewer')
    .map((member) => member.user)]
    .filter((person): person is NonNullable<typeof person> => Boolean(person))
    .filter((person, index, all) => all.findIndex((candidate) => candidate.id === person.id) === index);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const normalizedTaskQuery = taskQuery.trim().toLocaleLowerCase();
  const visibleTasks = tasks.filter((task) => {
    if (taskFilter === 'mine' && String(task.assigneeId || '') !== String(user?.id || '')) return false;
    if (taskFilter === 'overdue' &&
      (!task.dueDate || task.dueDate.slice(0, 10) >= today || task.status === 'done')) return false;
    if (!normalizedTaskQuery) return true;
    return `${task.title} ${task.description || ''}`.toLocaleLowerCase().includes(normalizedTaskQuery);
  });

  return (
    <div className="w-full relative px-4 md:px-6 py-4">
      <div className="mb-4">
        <Link href="/dashboard" className="inline-flex items-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Dashboard
        </Link>
      </div>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 glass-card p-6 rounded-3xl border-none">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-100">{project.name}</h1>
            {project.category && (
              <Badge className="bg-indigo-950 text-indigo-300 border-indigo-800 text-xs">
                {project.category}
              </Badge>
            )}
          </div>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            {project.description || 'Workspace for team collaboration and task management.'}
          </p>

          {project.tech && project.tech.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {project.tech.map((t, idx) => (
                <span key={idx} className="text-[11px] bg-slate-900 border border-slate-800 text-indigo-300 px-2 py-0.5 rounded-full">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
          {isProjectOwner && (
            <>
              <Button
                variant="outline"
                onClick={toggleDiscovery}
                disabled={updatingDiscovery}
                className="border-indigo-500/40 bg-indigo-950/30 text-indigo-200 hover:bg-indigo-950/60"
              >
                {updatingDiscovery ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {project.isDiscoverable ? 'Take off discovery' : 'Make discoverable'}
              </Button>
              <Link href={`/project/${projectId}/applications`}>
                <Button variant="outline" className="border-indigo-500/40 bg-indigo-950/30 text-indigo-200 hover:bg-indigo-950/60">
                  <UserPlus className="mr-2 h-4 w-4" /> Review applications
                </Button>
              </Link>
            </>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Team:</span>
            <div className="flex -space-x-2 overflow-hidden">
              {project.owner && (
                <Avatar className="inline-block h-8 w-8 rounded-full ring-2 ring-indigo-500/50" title={`Owner: ${project.owner.name}`}>
                  <AvatarImage src={project.owner.avatarUrl} />
                  <AvatarFallback>{project.owner.name?.charAt(0) || 'O'}</AvatarFallback>
                </Avatar>
              )}
              {project.members?.map((m) => (
                <Avatar key={m.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-800" title={m.user.name}>
                  <AvatarImage src={m.user.avatarUrl} />
                  <AvatarFallback>{m.user.name?.charAt(0) || 'M'}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>

          <RainbowButton onClick={handleSyncWithGitHub} disabled={syncing} className="text-xs h-9">
            <Github className="mr-1.5 h-4 w-4" />
            {syncing ? 'Syncing...' : 'Sync with GitHub'}
          </RainbowButton>
        </div>
      </header>

      {/* AI Suggested Teammates Section */}
      {recommendedTeammates.length > 0 && (
        <Card className="mb-6 glass-card border-indigo-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full filter blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                  </span>
                  AI Suggested Teammates for {project.name}
                </span>
              </div>
              <Link href="/team-match">
                <Button variant="ghost" size="sm" className="text-xs text-indigo-400 hover:text-indigo-300">
                  View All Candidates →
                </Button>
              </Link>
            </div>
            <CardDescription className="text-slate-400 text-xs">
              Collaborators automatically matched based on {project.name}'s tech stack and domain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendedTeammates.map((candidate) => (
                <Card key={candidate.id} className="glass-card hover-glow border-none transition-all flex flex-col justify-between group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-slate-700">
                          <AvatarImage src={candidate.avatarUrl} alt={candidate.name} />
                          <AvatarFallback>{candidate.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-sm font-bold text-slate-100">{candidate.name}</CardTitle>
                          <CardDescription className="text-[11px] text-indigo-400 font-medium">
                            {candidate.role || 'Developer'}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className="bg-emerald-950/80 text-emerald-300 border-emerald-800 text-[10px]">
                        {candidate.matchScore}% Match
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 space-y-2">
                    {candidate.highlights && candidate.highlights.length > 0 && (
                      <div className="space-y-1">
                        {candidate.highlights.slice(0, 2).map((h: string, idx: number) => (
                          <div key={idx} className="text-[11px] text-slate-300 flex items-center gap-1.5">
                            <span className="text-indigo-400 text-xs">✓</span> {h}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-2 border-t border-slate-800/80">
                    {candidate.inviteStatus === 'pending' ? (
                      <Button 
                        disabled 
                        size="sm"
                        className="w-full h-8 text-xs bg-slate-800 text-indigo-300 border border-indigo-700/60 cursor-not-allowed opacity-90"
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-indigo-400" />
                        Invite Sent (Pending)
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => handleInviteTeammate(candidate.id)}
                        className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                      >
                        Invite to Project
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Build board</h2>
          <p className="text-xs text-slate-400">
            Open a task to assign work, set a deadline, and discuss progress. Teammates see updates within about 12 seconds.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshTasks} className="border-slate-700 text-slate-300">
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/40 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Label htmlFor="board-task-search" className="sr-only">Search tasks</Label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="board-task-search"
            value={taskQuery}
            onChange={(event) => setTaskQuery(event.target.value)}
            placeholder="Search tasks"
            className="border-slate-700 bg-slate-950 pl-9 text-slate-100"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {([
            ['all', 'All work'],
            ['mine', 'Assigned to me'],
            ['overdue', 'Overdue'],
          ] as const).map(([filter, label]) => (
            <Button
              key={filter}
              type="button"
              size="sm"
              variant={taskFilter === filter ? 'secondary' : 'ghost'}
              aria-pressed={taskFilter === filter}
              onClick={() => setTaskFilter(filter)}
              className={taskFilter === filter ? 'bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30' : 'text-slate-400 hover:text-slate-100'}
            >
              {label}
            </Button>
          ))}
          <span className="ml-1 text-xs text-slate-500">{visibleTasks.length} of {tasks.length}</span>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((colName) => {
          const colTasks = visibleTasks.filter(t =>
            (t.column === colName) || 
            (!t.column && colName === 'To Do' && t.status === 'todo') ||
            (!t.column && colName === 'In Progress' && t.status === 'in_progress') ||
            (!t.column && colName === 'Done' && t.status === 'done')
          );

          return (
            <div
              key={colName}
              onDragOver={(event) => { if (canEditTasks) event.preventDefault(); }}
              onDrop={(event) => {
                if (!canEditTasks) return;
                event.preventDefault();
                const taskId = event.dataTransfer.getData('text/plain');
                const task = tasks.find((item) => item.id === taskId);
                if (task) moveTask(task, colName);
              }}
              className="flex flex-col w-full glass rounded-2xl p-4 min-h-[400px] border border-slate-800/40 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]"
            >
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-200 text-sm">{colName}</h2>
                  <span className="text-xs bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                    {colTasks.length}
                  </span>
                </div>
                {canEditTasks && (
                  <AddTaskDialog
                    column={colName}
                    projectId={projectId}
                    members={project.members || []}
                    owner={project.owner}
                    onTaskCreated={refreshTasks}
                  />
                )}
              </div>

              <div className="flex-1 space-y-3">
                {colTasks.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-900 rounded-lg">
                    <p className="text-xs text-slate-500">
                      {taskQuery || taskFilter !== 'all' ? 'No matching tasks' : `No tasks in ${colName}`}
                    </p>
                  </div>
                ) : (
                  colTasks.map((t) => (
                    <div key={t.id} className={movingTaskId === t.id ? 'opacity-60 pointer-events-none' : ''}>
                      <TaskCard
                        task={t}
                        onStatusChange={moveTask}
                        onOpen={setSelectedTaskId}
                        canEdit={canEditTasks}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      <TaskDetailsDialog
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdated={(updated) => setTasks((current) => current.map((task) =>
          task.id === updated.id ? { ...task, ...updated } : task
        ))}
        onDeleted={(taskId) => setTasks((current) => current.filter((task) => task.id !== taskId))}
        onCommentAdded={(taskId) => setTasks((current) => current.map((task) =>
          task.id === taskId
            ? { ...task, _count: { comments: (task._count?.comments || 0) + 1 } }
            : task
        ))}
        people={people}
        canEdit={canEditTasks}
        canDelete={canDeleteTasks}
      />
    </div>
  );
}
