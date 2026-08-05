
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  private: boolean;
  fork: boolean;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
}
import { RainbowButton } from '@/components/magicui/rainbow-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PlusCircle,
  MoreHorizontal,
  ArrowUpRight,
  Github,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface DashboardStats {
  activeProjects: number;
  pendingTasks: number;
  overdueTasks: number;
  completedTasks: number;
  notifications: number;
  overallProgress: number;
}

interface ProjectItem {
  id: string;
  name: string;
  description: string;
  category?: string;
  tech?: string[];
  status: string;
  progress?: number;
  githubRepoName?: string;
  githubRepoUrl?: string;
  updatedAt: string;
}

export default function Dashboard() {
  const [open, setOpen] = useState(false);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [userProjects, setUserProjects] = useState<ProjectItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    selectedRepo: '',
    category: 'Web Development',
    tech: '',
  });

  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    completedTasks: 0,
    notifications: 0,
    overallProgress: 0,
  });
  const { user, loading, checkAuth, logout } = useAuth();

  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);

  const fetchPendingInvites = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

      const res = await fetch(`${backendUrl}/api/team/invites?status=pending`, {
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const receivedPending = data.filter(i => i.receiverId === user?.id || i.receiver?.id === user?.id);
          setPendingInvitesCount(receivedPending.length);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    // Check auth status when component mounts
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      checkAuth();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    fetchPendingInvites();
  }, [checkAuth, user?.id]);

  const fetchStats = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const response = await fetch(`${backendUrl}/api/projects/stats`, {
        method: 'GET',
        credentials: 'include',
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchUserProjects = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const response = await fetch(`${backendUrl}/api/projects`, {
        method: 'GET',
        credentials: 'include',
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setUserProjects(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch user projects:', error);
    }
  };

  const fetchRepos = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const response = await fetch(`${backendUrl}/api/github/repositories`, {
        method: 'GET',
        credentials: 'include',
        headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Repositories fetch unauthorized (401)');
          return;
        }
        const errorText = await response.text();
        console.error('Failed to fetch repos:', errorText);
        return;
      }

      const data: Repository[] = await response.json();
      setRepos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRepos();
      fetchStats();
      fetchUserProjects();
    }
  }, [user]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    try {
      setIsCreating(true);
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const chosenRepo = repos.find(r => r.full_name === newProject.selectedRepo);

      const payload = {
        name: newProject.name.trim(),
        description: newProject.description.trim(),
        githubRepoId: chosenRepo ? String(chosenRepo.id) : undefined,
        githubRepoUrl: chosenRepo ? chosenRepo.html_url : undefined,
        githubRepoName: chosenRepo ? chosenRepo.name : undefined,
        repoOwner: chosenRepo ? chosenRepo.owner?.login : undefined,
        repoPrivate: chosenRepo ? chosenRepo.private : false,
        category: newProject.category,
        tech: newProject.tech ? newProject.tech.split(',').map(t => t.trim()).filter(Boolean) : (chosenRepo?.language ? [chosenRepo.language] : []),
      };

      const response = await fetch(`${backendUrl}/api/projects`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create project');
      }

      const created = await response.json();
      toast.success(`Project "${created.name}" created successfully!`);
      setOpen(false);
      setNewProject({ name: '', description: '', selectedRepo: '', category: 'Web Development', tech: '' });
      
      fetchStats();
      fetchRepos();
      fetchUserProjects();
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(error.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloneInVSCode = (repo: Repository) => {
    // Try to open in VS Code directly
    const vsCodeUrl = `vscode://vscode.git/clone?url=${encodeURIComponent(repo.html_url)}`;
    window.location.href = vsCodeUrl;
    
    // Fallback to clipboard with instructions
    navigator.clipboard.writeText(repo.html_url).then(() => {
      console.log('Repository URL copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const effectiveActiveProjects = userProjects.length > 0 ? userProjects.length : (stats.activeProjects > 0 ? stats.activeProjects : repos.length);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold md:text-2xl">
            Welcome Back, {user?.name || user?.login || 'User'}!
          </h1>
          <div className="ml-auto flex items-center gap-2">
            {user && (
              <div className="flex items-center gap-2 mr-4">
                <img 
                  src={user.avatar_url} 
                  alt={user.name || user.login}
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm text-muted-foreground">@{user.login}</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    await logout();
                    window.location.href = '/login';
                  }}
                >
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>

        {pendingInvitesCount > 0 && (
          <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border border-indigo-700/60 p-4 rounded-xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-indigo-900/60 border border-indigo-700 flex items-center justify-center text-indigo-300">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  You have {pendingInvitesCount} pending team invitation{pendingInvitesCount > 1 ? 's' : ''}!
                </h3>
                <p className="text-xs text-slate-400">
                  Collaborators have invited you to join their project workspaces.
                </p>
              </div>
            </div>
            <Link href="/invites">
              <RainbowButton className="text-xs h-8 px-4">
                View Invitations &rarr;
              </RainbowButton>
            </Link>
          </div>
        )}  <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <RainbowButton>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Create Project
                  </span>
                </RainbowButton>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleCreateProject}>
                  <DialogHeader>
                    <DialogTitle>Create a New Project</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="projectName">Project Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="projectName"
                        placeholder="e.g., AI for Education"
                        value={newProject.name}
                        onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="A brief description of your project."
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tech">Tech Stack (comma separated)</Label>
                      <Input
                        id="tech"
                        placeholder="e.g. React, Node.js, TypeScript"
                        value={newProject.tech}
                        onChange={(e) => setNewProject({ ...newProject, tech: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Connect to GitHub</Label>
                      <p className="text-sm text-muted-foreground">
                        {user ? 'Select a repository to sync with this project.' : 'Sign in with GitHub to connect repositories.'}
                      </p>
                      {user ? (
                        <select 
                          value={newProject.selectedRepo}
                          onChange={(e) => setNewProject({ ...newProject, selectedRepo: e.target.value })}
                          className="w-full p-2.5 border rounded-md bg-zinc-900 text-zinc-100 border-zinc-700 focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer text-sm"
                        >
                          <option value="" className="bg-zinc-900 text-zinc-100 py-1">Select a repository...</option>
                          {repos.map((repo: any) => (
                            <option key={repo.id} value={repo.full_name} className="bg-zinc-900 text-zinc-100 py-1">
                              {repo.full_name} {repo.private ? '(Private)' : '(Public)'}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Button variant="outline" className="w-full" asChild>
                          <a href="http://localhost:4000/api/auth/github">
                            <Github className="mr-2 h-4 w-4" />
                            Connect GitHub Account
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <RainbowButton type="submit" disabled={isCreating}>
                      {isCreating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                          Creating...
                        </>
                      ) : (
                        'Create Project'
                      )}
                    </RainbowButton>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Projects
              </CardTitle>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{effectiveActiveProjects}</div>
              <p className="text-xs text-muted-foreground">
                {repos.length > 0 ? `${repos.length} GitHub repos synced` : 'Real-time project count'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Tasks
              </CardTitle>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingTasks}</div>
              <p className="text-xs text-muted-foreground">
                {stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : `${stats.completedTasks} completed`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Notifications
              </CardTitle>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.notifications}</div>
              <p className="text-xs text-muted-foreground">
                {stats.notifications > 0 ? `${stats.notifications} unread` : 'No new notifications'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Overall Progress
              </CardTitle>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overallProgress}%</div>
              <Progress value={stats.overallProgress} aria-label={`${stats.overallProgress}% progress`} />
            </CardContent>
          </Card>
        </div>

        {/* Your Active Projects Section */}
        <div>
          <Card className="bg-slate-950/80 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  Your Active Projects
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Manage and access your created project workspaces
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setOpen(true)}
                className="bg-indigo-950/40 border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/50 flex items-center gap-1.5"
              >
                <PlusCircle className="h-4 w-4" /> Create New
              </Button>
            </CardHeader>
            <CardContent>
              {userProjects.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                  <p className="text-slate-400 text-sm mb-3">You haven't created any project workspaces yet.</p>
                  <RainbowButton onClick={() => setOpen(true)} className="text-xs h-9">
                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Create Your First Project
                  </RainbowButton>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userProjects.map((project) => (
                    <Card key={project.id} className="bg-slate-900/90 border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-lg font-bold text-slate-100 line-clamp-1">{project.name}</CardTitle>
                          <Badge variant="outline" className="bg-indigo-950/50 text-indigo-300 border-indigo-800 text-[10px] shrink-0">
                            {project.category || 'Development'}
                          </Badge>
                        </div>
                        <CardDescription className="text-slate-400 text-xs line-clamp-2 mt-1">
                          {project.description || 'No description provided.'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="py-2 space-y-3">
                        {project.tech && project.tech.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {project.tech.map((t, i) => (
                              <span key={i} className="text-[10px] bg-slate-950 text-slate-300 border border-slate-800 px-2 py-0.5 rounded">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {project.githubRepoName && (
                          <div className="flex items-center gap-1.5 text-xs text-indigo-400">
                            <Github className="h-3.5 w-3.5" />
                            <a 
                              href={project.githubRepoUrl || `https://github.com/${project.githubRepoName}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline flex items-center"
                            >
                              {project.githubRepoName} <ArrowUpRight className="h-3 w-3 ml-0.5" />
                            </a>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="pt-2 border-t border-slate-800/80">
                        <Link href={`/project/${project.id}`} className="w-full">
                          <RainbowButton className="w-full h-9 text-xs flex items-center justify-center">
                            Open Workspace <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                          </RainbowButton>
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {user && repos.length > 0 && (
          <div>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Your Repositories</CardTitle>
                    <CardDescription>
                      Your GitHub repositories are listed below
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchRepos}
                    className="flex items-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-refresh-ccw"
                    >
                      <path d="M21 2v6h-6" />
                      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                      <path d="M3 22v-6h6" />
                      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                    </svg>
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {repos.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No repositories found. Try refreshing or check your GitHub connection.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Language</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repos.map((repo) => (
                        <TableRow key={repo.id}>
                          <TableCell className="font-medium">
                            <a
                              href={repo.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline flex items-center"
                            >
                              {repo.name}
                              <ArrowUpRight className="ml-1 h-4 w-4" />
                            </a>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500 line-clamp-1">
                            {repo.description || 'No description'}
                          </TableCell>
                          <TableCell>
                            {repo.language ? (
                              <Badge variant="outline">
                                {repo.language}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(repo.updated_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCloneInVSCode(repo)}
                              className="flex items-center gap-1"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="lucide lucide-git-branch-plus"
                              >
                                <path d="M6 3v12" />
                                <path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                                <path d="M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                                <path d="M15 6a9 9 0 0 0-9 9" />
                                <path d="M18 15v6" />
                                <path d="M21 18h-6" />
                              </svg>
                              Clone
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
              <CardFooter>
                <div className="text-xs text-muted-foreground">
                  Showing <strong>1-{Math.min(5, repos.length)}</strong> of <strong>{repos.length}</strong> repositories
                </div>
              </CardFooter>
            </Card>
          </div>
        )}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                A log of recent changes and updates across your projects.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <div className="font-medium">AI for Education</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">New Task</Badge> "Setup database
                      schema"
                    </TableCell>
                    <TableCell className="text-right">2023-06-23</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="font-medium">Mobile App Dev</div>
                    </TableCell>
                    <TableCell>
                      <Badge>Progress Update</Badge> "Login screen UI complete"
                    </TableCell>
                    <TableCell className="text-right">2023-06-23</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="font-medium">AI for Education</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Comment</Badge> by Jane Doe on
                      "API integration"
                    </TableCell>
                    <TableCell className="text-right">2023-06-22</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-muted-foreground">
                Showing <strong>1-3</strong> of <strong>15</strong> activities
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
