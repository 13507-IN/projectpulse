
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RainbowButton } from '@/components/magicui/rainbow-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Github, MoreVertical, Plus } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type TaskStatus = 'feature' | 'bug' | 'docs';
type ColumnName = 'To Do' | 'In Progress' | 'Done';

interface Task {
  id: number;
  title: string;
  assigneeId: string;
  status: TaskStatus;
  column: ColumnName;
}

const initialTasks: Task[] = [
  {
    id: 1,
    title: 'Design user profile page mockups',
    assigneeId: 'avatar4',
    status: 'feature',
    column: 'To Do',
  },
  {
    id: 2,
    title: 'Fix login authentication bug',
    assigneeId: 'avatar2',
    status: 'bug',
    column: 'To Do',
  },
  {
    id: 3,
    title: 'Set up project database schema',
    assigneeId: 'avatar3',
    status: 'feature',
    column: 'To Do',
  },
  {
    id: 4,
    title: 'Develop API for team matching',
    assigneeId: 'avatar3',
    status: 'feature',
    column: 'In Progress',
  },
  {
    id: 5,
    title: 'Write documentation for Kanban component',
    assigneeId: 'avatar1',
    status: 'docs',
    column: 'In Progress',
  },
  {
    id: 6,
    title: 'Initial project setup and configuration',
    assigneeId: 'avatar1',
    status: 'docs',
    column: 'Done',
  },
  {
    id: 7,
    title: 'Create landing page wireframe',
    assigneeId: 'avatar4',
    status: 'feature',
    column: 'Done',
  },
];

const TaskCard = ({
  title,
  assigneeId,
  status,
}: {
  title: string;
  assigneeId: string;
  status: TaskStatus;
}) => {
  const assigneeAvatar = PlaceHolderImages.find((img) => img.id === assigneeId);

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <p className="font-medium pr-2">{title}</p>
          <MoreVertical className="h-4 w-4 text-muted-foreground cursor-pointer shrink-0" />
        </div>
        <div className="flex justify-between items-center mt-4">
          <Badge
            variant={
              status === 'bug'
                ? 'destructive'
                : status === 'docs'
                ? 'default'
                : 'secondary'
            }
          >
            {status}
          </Badge>
          <Avatar className="h-6 w-6">
            <AvatarImage
              src={assigneeAvatar?.imageUrl}
              data-ai-hint={assigneeAvatar?.imageHint}
            />
            <AvatarFallback>
              {assigneeAvatar?.description.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
      </CardContent>
    </Card>
  );
};

const AddTaskDialog = ({
  column,
  onAddTask,
}: {
  column: ColumnName;
  onAddTask: (task: Omit<Task, 'id' | 'column'>) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [status, setStatus] = useState<TaskStatus>('feature');
  const teamAvatars = ['avatar1', 'avatar2', 'avatar3', 'avatar4'];

  const handleSubmit = () => {
    if (title && assigneeId) {
      onAddTask({ title, assigneeId, status });
      setOpen(false);
      setTitle('');
      setAssigneeId('');
      setStatus('feature');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Task to {column}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Implement dark mode"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignee">Assignee</Label>
            <Select onValueChange={setAssigneeId} value={assigneeId}>
              <SelectTrigger id="assignee">
                <SelectValue placeholder="Select an assignee" />
              </SelectTrigger>
              <SelectContent>
                {teamAvatars.map((id) => {
                  const avatar = PlaceHolderImages.find((img) => img.id === id);
                  return (
                    <SelectItem key={id} value={id}>
                      {avatar?.description || id}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Type</Label>
            <Select
              onValueChange={(value) => setStatus(value as TaskStatus)}
              value={status}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select task type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="docs">Docs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <RainbowButton onClick={handleSubmit}>Add Task</RainbowButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const KanbanColumn = ({
  title,
  tasks,
  onAddTask,
}: {
  title: ColumnName;
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'column'>) => void;
}) => {
  return (
    <div className="flex flex-col w-full md:w-1/3 bg-muted/50 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">{title}</h2>
        <AddTaskDialog column={title} onAddTask={onAddTask} />
      </div>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          title={task.title}
          assigneeId={task.assigneeId}
          status={task.status}
        />
      ))}
    </div>
  );
};

export default function ProjectWorkspacePage() {
  const teamAvatars = ['avatar1', 'avatar2', 'avatar3', 'avatar4'];
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();

  const handleSyncWithGitHub = async () => {
    if (!user) {
      alert('Please log in with GitHub to sync repositories');
      return;
    }

    setSyncing(true);
    try {
      // For this demo, we'll sync with the projectpulse-main repository
      // In a real app, you'd get the repo info from the project data
      const response = await fetch(`http://localhost:4000/api/github/sync/${user.login}/projectpulse-main`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.message}`);
      } else {
        const error = await response.json();
        alert(`❌ Sync failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('❌ Failed to sync with GitHub. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleAddTask = (column: ColumnName) => (
    newTask: Omit<Task, 'id' | 'column'>
  ) => {
    setTasks((prevTasks) => [
      ...prevTasks,
      {
        ...newTask,
        id: prevTasks.length + 1,
        column,
      },
    ]);
  };

  const columns: ColumnName[] = ['To Do', 'In Progress', 'Done'];

  return (
    <div className="w-full">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Project: AI for Education</h1>
          <p className="text-muted-foreground">
            Workspace for team collaboration and task management.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2 overflow-hidden">
            {teamAvatars.map((id) => {
              const avatar = PlaceHolderImages.find((img) => img.id === id);
              return (
                <Avatar
                  key={id}
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-background"
                >
                  <AvatarImage
                    src={avatar?.imageUrl}
                    data-ai-hint={avatar?.imageHint}
                  />
                  <AvatarFallback>
                    {avatar?.description.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              );
            })}
          </div>
          <RainbowButton onClick={handleSyncWithGitHub} disabled={syncing}>
            <Github className="mr-2 h-4 w-4" />
            {syncing ? 'Syncing...' : 'Sync with GitHub'}
          </RainbowButton>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        {columns.map((colName) => (
          <KanbanColumn
            key={colName}
            title={colName}
            tasks={tasks.filter((t) => t.column === colName)}
            onAddTask={handleAddTask(colName)}
          />
        ))}
      </div>
    </div>
  );
}
