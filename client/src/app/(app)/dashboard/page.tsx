
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
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

export default function Dashboard() {
  const [open, setOpen] = useState(false);
  const [repos, setRepos] = useState([]);
  const { user, loading, checkAuth, logout } = useAuth();

  useEffect(() => {
    // Check auth status when component mounts
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      checkAuth();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [checkAuth]);

  const fetchRepos = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/github/repos', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setRepos(data.repos);
      }
    } catch (error) {
      console.error('Failed to fetch repos:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRepos();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

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
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <RainbowButton>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Create Project
                  </span>
                </RainbowButton>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a New Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectName">Project Name</Label>
                    <Input
                      id="projectName"
                      placeholder="e.g., AI for Education"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="A brief description of your project."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Connect to GitHub</Label>
                    <p className="text-sm text-muted-foreground">
                      {user ? 'Select a repository to sync with this project.' : 'Sign in with GitHub to connect repositories.'}
                    </p>
                    {user ? (
                      <select className="w-full p-2 border rounded-md">
                        <option value="">Select a repository...</option>
                        {repos.map((repo: any) => (
                          <option key={repo.id} value={repo.full_name}>
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
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <RainbowButton onClick={() => setOpen(false)}>
                    Create Project
                  </RainbowButton>
                </DialogFooter>
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
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">
                +2 since last week
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
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">5 overdue</p>
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
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">
                2 mentions, 3 reviews
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
              <div className="text-2xl font-bold">75%</div>
              <Progress value={75} aria-label="75% progress" />
            </CardContent>
          </Card>
        </div>
        {user && repos.length > 0 && (
          <div>
            <Card>
              <CardHeader>
                <CardTitle>GitHub Repositories</CardTitle>
                <CardDescription>
                  Your connected GitHub repositories for project sync.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Repository</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repos.slice(0, 5).map((repo: any) => (
                      <TableRow key={repo.id}>
                        <TableCell>
                          <div className="font-medium">{repo.name}</div>
                          <div className="text-sm text-muted-foreground">{repo.description}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={repo.private ? "secondary" : "outline"}>
                            {repo.private ? "Private" : "Public"}
                          </Badge>
                        </TableCell>
                        <TableCell>{repo.language || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={async () => {
                              try {
                                const response = await fetch(`http://localhost:4000/api/github/sync/${repo.owner.login}/${repo.name}`, {
                                  method: 'POST',
                                  credentials: 'include',
                                });
                                if (response.ok) {
                                  alert(`Repository ${repo.name} synced successfully!`);
                                }
                              } catch (error) {
                                console.error('Sync failed:', error);
                                alert('Sync failed. Please try again.');
                              }
                            }}
                          >
                            Sync
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
