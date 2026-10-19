'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Check, Loader2, MapPin, X } from 'lucide-react';

interface Application {
  id: string;
  message?: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  applicant: {
    id: string;
    name?: string | null;
    githubUsername?: string | null;
    avatarUrl?: string | null;
    role?: string | null;
    location?: string | null;
    bio?: string | null;
    skills: string[];
    interests: string[];
    availability?: string | null;
  };
}

export default function ProjectApplicationsPage() {
  const params = useParams();
  const projectId = String(params?.id || '');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`${backendUrl}/api/projects/${projectId}/applications`, {
        credentials: 'include',
        headers,
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error('Only the project owner can review applications.');
        throw new Error('Could not load applications.');
      }
      const data = await response.json();
      setApplications(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load applications.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) fetchApplications();
  }, [fetchApplications, projectId]);

  const respond = async (applicationId: string, action: 'accept' | 'reject') => {
    setBusyId(applicationId);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`${backendUrl}/api/projects/applications/${applicationId}/respond`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update application.');
      setApplications((current) => current.map((item) => item.id === applicationId ? { ...item, status: data.status } : item));
      toast.success(action === 'accept' ? 'Teammate accepted and added to the workspace.' : 'Application declined.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update application.');
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = applications.filter((application) => application.status === 'pending').length;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <Link href={`/project/${projectId}`} className="mb-6 inline-flex items-center text-sm text-indigo-300 hover:text-indigo-200">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to project workspace
      </Link>

      <div className="mb-7">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black text-white">Builder applications</h1>
          <Badge className="border-indigo-400/25 bg-indigo-400/10 text-indigo-200">{pendingCount} waiting</Badge>
        </div>
        <p className="mt-2 text-sm text-slate-400">Find people who want to turn this idea into something real.</p>
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>
      ) : applications.length === 0 ? (
        <Card className="border-slate-800 bg-slate-950/70">
          <CardContent className="py-12 text-center">
            <h2 className="text-lg font-semibold text-slate-100">No applications yet</h2>
            <p className="mt-2 text-sm text-slate-400">Keep your project discoverable and make the call-to-action clear. The right builders will find it.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => {
            const person = application.applicant;
            return (
              <Card key={application.id} className="border-slate-800 bg-slate-950/80">
                <CardHeader className="pb-3">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border border-slate-700">
                        <AvatarImage src={person.avatarUrl || undefined} alt={person.name || 'Applicant'} />
                        <AvatarFallback>{(person.name || person.githubUsername || 'S').slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base text-slate-100">{person.name || person.githubUsername || 'Student builder'}</CardTitle>
                        <CardDescription className="mt-1 text-slate-400">
                          {[person.role, person.githubUsername && `@${person.githubUsername}`].filter(Boolean).join(' · ') || 'Project contributor'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={application.status === 'accepted' ? 'default' : application.status === 'rejected' ? 'destructive' : 'secondary'}>
                        {application.status}
                      </Badge>
                      <span className="text-xs text-slate-500">{new Date(application.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {person.bio && <p className="text-sm leading-6 text-slate-300">{person.bio}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
                    {person.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{person.location}</span>}
                    {person.availability && <span>Availability: {person.availability}</span>}
                  </div>
                  {person.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {person.skills.slice(0, 12).map((skill) => <Badge key={skill} variant="outline" className="border-slate-700 text-slate-300">{skill}</Badge>)}
                    </div>
                  )}
                  {application.message && (
                    <blockquote className="rounded-lg border-l-2 border-indigo-400 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
                      “{application.message}”
                    </blockquote>
                  )}
                  {application.status === 'pending' && (
                    <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                      <Button onClick={() => respond(application.id, 'accept')} disabled={busyId === application.id} className="bg-emerald-700 hover:bg-emerald-600">
                        {busyId === application.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        Accept & add to workspace
                      </Button>
                      <Button variant="outline" onClick={() => respond(application.id, 'reject')} disabled={busyId === application.id} className="border-slate-700 text-slate-300 hover:bg-slate-900">
                        <X className="mr-2 h-4 w-4" /> Decline
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
