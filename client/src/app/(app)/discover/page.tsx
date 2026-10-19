'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowRight, Clock3, Compass, Loader2, MapPin, Search, Users } from 'lucide-react';

interface DiscoveryProject {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  tech: string[];
  location?: string | null;
  commitment?: string | null;
  lookingFor: string[];
  maxTeamSize?: number | null;
  createdAt: string;
  applicationStatus?: 'pending' | 'accepted' | 'rejected' | null;
  owner: {
    id: string;
    name?: string | null;
    githubUsername?: string | null;
    avatarUrl?: string | null;
    role?: string | null;
    location?: string | null;
  };
  _count: { members: number };
}

export default function DiscoverProjectsPage() {
  const [projects, setProjects] = useState<DiscoveryProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [selectedProject, setSelectedProject] = useState<DiscoveryProject | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (location.trim()) params.set('location', location.trim());
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${backendUrl}/api/projects/discovery?${params.toString()}`, {
        credentials: 'include',
        headers,
        signal,
      });
      if (!response.ok) throw new Error('Could not load projects');
      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Project discovery error:', error);
      toast.error('Could not load projects. Please try again.');
      setProjects([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [location, search]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => fetchProjects(controller.signal), 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fetchProjects]);

  const submitApplication = async () => {
    if (!selectedProject) return;
    setSubmitting(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`${backendUrl}/api/projects/${selectedProject.id}/applications`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ message }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not send your application');

      setProjects((current) => current.map((project) =>
        project.id === selectedProject.id ? { ...project, applicationStatus: 'pending' } : project
      ));
      setSelectedProject(null);
      setMessage('');
      toast.success('Application sent. The project owner will be notified.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send your application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
      <section className="relative mb-8 overflow-hidden rounded-3xl border border-indigo-400/15 bg-gradient-to-br from-indigo-950/80 via-slate-950 to-slate-950 p-7 md:p-10">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="relative max-w-3xl">
          <Badge className="mb-4 border-indigo-400/30 bg-indigo-400/10 text-indigo-200">
            <Compass className="mr-1.5 h-3.5 w-3.5" /> The build-together board
          </Badge>
          <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
            Find a project worth staying up for.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
            Meet a team around a real idea. Apply to join, then plan, build, and ship together in the same workspace.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard">
              <Button className="bg-indigo-500 text-white hover:bg-indigo-400">
                Start a project <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/team-match">
              <Button variant="outline" className="border-slate-600 bg-slate-950/50 text-slate-100 hover:bg-slate-900">
                Find teammates first
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            aria-label="Search projects"
            placeholder="Search ideas, categories, or tech..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="border-slate-700 bg-slate-900 pl-9 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <div className="relative md:w-72">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            aria-label="Filter by campus or location"
            placeholder="Campus or location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="border-slate-700 bg-slate-900 pl-9 text-slate-100 placeholder:text-slate-500"
          />
        </div>
      </section>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Open calls</h2>
          <p className="text-sm text-slate-400">Projects made discoverable by their creators.</p>
        </div>
        {!loading && <span className="text-xs text-slate-500">{projects.length} opportunities</span>}
      </div>

      {loading ? (
        <div className="flex min-h-56 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : projects.length === 0 ? (
        <Card className="border-dashed border-slate-700 bg-slate-950/60">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <Compass className="mb-4 h-10 w-10 text-indigo-400" />
            <h3 className="text-lg font-semibold text-slate-100">No open projects match yet</h3>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              Try another search, or be the first to post an idea and invite people to build it with you.
            </p>
            <Link href="/dashboard" className="mt-5">
              <Button className="bg-indigo-500 hover:bg-indigo-400">Create a project</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {projects.map((project) => {
            const memberCount = project._count.members + 1;
            const full = project.maxTeamSize != null && memberCount >= project.maxTeamSize;
            return (
              <Card key={project.id} className="flex flex-col border-slate-800 bg-slate-950/80 transition hover:border-indigo-400/40">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        {project.category && <Badge variant="secondary">{project.category}</Badge>}
                        {full && <Badge variant="destructive">Team full</Badge>}
                      </div>
                      <CardTitle className="text-xl text-slate-100">{project.name}</CardTitle>
                    </div>
                    <Avatar className="h-11 w-11 border border-slate-700">
                      <AvatarImage src={project.owner.avatarUrl || undefined} alt={project.owner.name || 'Project owner'} />
                      <AvatarFallback>{(project.owner.name || project.owner.githubUsername || 'P').slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                  <CardDescription className="line-clamp-3 min-h-12 text-slate-400">
                    {project.description || 'The team is still shaping this idea. Apply and help define what it becomes.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
                    {(project.location || project.owner.location) && (
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{project.location || project.owner.location}</span>
                    )}
                    {project.commitment && (
                      <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{project.commitment}</span>
                    )}
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{memberCount}{project.maxTeamSize ? ` / ${project.maxTeamSize}` : ''} teammates</span>
                  </div>

                  {project.lookingFor.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Looking for</p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.lookingFor.map((item) => <Badge key={item} variant="outline" className="border-indigo-400/25 text-indigo-200">{item}</Badge>)}
                      </div>
                    </div>
                  )}

                  {project.tech.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {project.tech.slice(0, 6).map((item) => <span key={item} className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] text-slate-400">{item}</span>)}
                    </div>
                  )}

                  <p className="text-xs text-slate-500">
                    Started by <span className="text-slate-300">{project.owner.name || project.owner.githubUsername || 'A student builder'}</span>
                    {project.owner.role ? ` · ${project.owner.role}` : ''}
                  </p>
                </CardContent>
                <CardFooter className="border-t border-slate-800 pt-4">
                  {project.applicationStatus === 'pending' ? (
                    <Button disabled className="w-full bg-slate-800 text-indigo-200">Application sent</Button>
                  ) : project.applicationStatus === 'accepted' ? (
                    <Link className="w-full" href={`/project/${project.id}`}>
                      <Button className="w-full bg-emerald-700 hover:bg-emerald-600">Open workspace <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    </Link>
                  ) : full ? (
                    <Button disabled className="w-full">Team is full</Button>
                  ) : (
                    <Button
                      className="w-full bg-indigo-500 text-white hover:bg-indigo-400"
                      onClick={() => setSelectedProject(project)}
                    >
                      Apply to build together <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(selectedProject)} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent className="border-slate-800 bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle>Apply to {selectedProject?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">Tell the team what you’re excited to contribute. Keep it human and specific.</p>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={1200}
            placeholder="I’d love to help with..."
            className="min-h-32 border-slate-700 bg-slate-900 text-slate-100"
          />
          <p className="text-right text-xs text-slate-500">{message.length}/1200</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProject(null)} className="border-slate-700">Cancel</Button>
            <Button onClick={submitApplication} disabled={submitting} className="bg-indigo-500 hover:bg-indigo-400">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
