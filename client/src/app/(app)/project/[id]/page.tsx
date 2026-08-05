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
import { Github, MoreVertical, Plus, Loader2, ArrowLeft, CheckCircle2, AlertTriangle, Layers, Calendar, User } from 'lucide-react';
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

type TaskStatus = 'feature' | 'bug' | 'docs';
type ColumnName = 'To Do' | 'In Progress' | 'Done';

interface Task {
  id: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assignee?: {
    id: string;
    name: string;
    githubUsername?: string;
    avatarUrl?: string;
  };
  type?: TaskStatus;
  status?: string;
  column?: string;
}

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
}: {
  task: Task;
  onStatusChange?: (taskId: string, newColumn: ColumnName) => void;
}) => {
  const taskType = (task.type || 'feature') as TaskStatus;

  return (
    <Card className="mb-4 bg-slate-900/90 border-slate-800 hover:border-indigo-500/40 transition-all">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <p className="font-medium pr-2 text-slate-100 text-sm">{task.title}</p>
          <MoreVertical className="h-4 w-4 text-slate-400 cursor-pointer shrink-0" />
        </div>
        {task.description && (
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{task.description}</p>
        )}
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
          {task.assignee ? (
            <Avatar className="h-6 w-6 border border-slate-700">
              <AvatarImage src={task.assignee.avatarUrl} alt={task.assignee.name} />
              <AvatarFallback className="text-[10px]">{task.assignee.name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
          ) : (
            <span className="text-[10px] text-slate-500">Unassigned</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const AddTaskDialog = ({
  column,
  projectId,
  members,
  onTaskCreated,
}: {
  column: ColumnName;
  projectId: string;
  members: ProjectMember[];
  onTaskCreated: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [type, setType] = useState<TaskStatus>('feature');
  const [submitting, setSubmitting] = useState(false);

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
      <DialogContent className="bg-slate-950 text-slate-100 border-slate-800">
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
              </SelectContent>
            </Select>
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

  const [recommendedTeammates, setRecommendedTeammates] = useState<any[]>([]);

  useEffect(() => {
    fetchProjectDetails();
    fetchRecommendedTeammates();
  }, [projectId]);

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

      if (res.ok) {
        toast.success('Project invite sent!');
      } else {
        toast.error('Failed to send project invite');
      }
    } catch (err) {
      toast.error('Error sending project invite');
    }
  };

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

      const res = await fetch(`${backendUrl}/api/projects/${projectId}`, {
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

      // Fetch tasks for this project
      const tasksRes = await fetch(`${backendUrl}/api/tasks/project/${projectId}`, {
        credentials: 'include',
        headers,
      });
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(Array.isArray(tasksData) ? tasksData : []);
      }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!project) return null;

  const columns: ColumnName[] = ['To Do', 'In Progress', 'Done'];

  return (
    <div className="w-full relative px-4 md:px-6 py-4">
      <div className="mb-4">
        <Link href="/dashboard" className="inline-flex items-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Dashboard
        </Link>
      </div>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-slate-950/80 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
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
        <Card className="mb-6 bg-slate-950/70 border-slate-800 backdrop-blur-md">
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
                <Card key={candidate.id} className="bg-slate-900/90 border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between">
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
                    <Button 
                      size="sm" 
                      onClick={() => handleInviteTeammate(candidate.id)}
                      className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      Invite to Project
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((colName) => {
          const colTasks = tasks.filter(t => 
            (t.column === colName) || 
            (!t.column && colName === 'To Do' && t.status === 'todo') ||
            (!t.column && colName === 'In Progress' && t.status === 'in_progress') ||
            (!t.column && colName === 'Done' && t.status === 'done')
          );

          return (
            <div key={colName} className="flex flex-col w-full bg-slate-950/70 border border-slate-800 rounded-xl p-4 backdrop-blur-sm min-h-[400px]">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-200 text-sm">{colName}</h2>
                  <span className="text-xs bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                    {colTasks.length}
                  </span>
                </div>
                <AddTaskDialog 
                  column={colName} 
                  projectId={projectId} 
                  members={project.members || []} 
                  onTaskCreated={fetchProjectDetails} 
                />
              </div>

              <div className="flex-1 space-y-3">
                {colTasks.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-900 rounded-lg">
                    <p className="text-xs text-slate-500">No tasks in {colName}</p>
                  </div>
                ) : (
                  colTasks.map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
