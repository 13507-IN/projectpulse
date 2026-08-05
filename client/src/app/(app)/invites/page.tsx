'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Check, X, Clock, FolderGit2, User, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface TeamInvite {
  id: string;
  projectId: string;
  senderId: string;
  receiverId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  project: {
    id: string;
    name: string;
    description: string;
  };
  sender: {
    id: string;
    name: string;
    githubUsername: string;
    avatarUrl: string;
  };
  receiver?: {
    id: string;
    name: string;
    githubUsername: string;
    avatarUrl: string;
  };
}

export default function InvitesPage() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'received' | 'sent'>('received');
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

      const res = await fetch(`${backendUrl}/api/team/invites`, {
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setInvites(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch team invites:', err);
      toast.error('Failed to load team invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleRespond = async (inviteId: string, action: 'accept' | 'reject') => {
    try {
      setRespondingId(inviteId);
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

      const res = await fetch(`${backendUrl}/api/team/invites/${inviteId}/respond`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        toast.success(action === 'accept' ? 'Invitation accepted! You joined the project workspace.' : 'Invitation declined.');
        setInvites(prev => prev.map(inv => inv.id === inviteId ? { ...inv, status: action === 'accept' ? 'accepted' : 'rejected' } : inv));
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to respond to invitation');
      }
    } catch (err) {
      toast.error('Error responding to invitation');
    } finally {
      setRespondingId(null);
    }
  };

  const receivedInvites = invites.filter(i => i.receiverId === user?.id || i.receiver?.id === user?.id);
  const sentInvites = invites.filter(i => i.senderId === user?.id || i.sender?.id === user?.id);
  const displayedInvites = filter === 'received' ? receivedInvites : sentInvites;

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-6 w-6 text-indigo-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Project Invitations</h1>
          </div>
          <p className="text-sm text-slate-400">
            View, accept, and manage incoming team project invitations from collaborators.
          </p>
        </div>

        <div className="flex bg-slate-900/90 p-1 border border-slate-800 rounded-xl gap-1">
          <Button
            size="sm"
            variant={filter === 'received' ? 'default' : 'ghost'}
            onClick={() => setFilter('received')}
            className={`text-xs font-medium ${filter === 'received' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Received ({receivedInvites.length})
          </Button>
          <Button
            size="sm"
            variant={filter === 'sent' ? 'default' : 'ghost'}
            onClick={() => setFilter('sent')}
            className={`text-xs font-medium ${filter === 'sent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Sent ({sentInvites.length})
          </Button>
        </div>
      </div>

      {/* Main List Container */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : displayedInvites.length === 0 ? (
        <Card className="bg-slate-950/60 border-slate-800 text-center py-16">
          <CardContent className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                No {filter === 'received' ? 'Received' : 'Sent'} Invitations
              </h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
                {filter === 'received' 
                  ? "You don't have any pending project invitations right now. Find teammates or showcase your profile on Team Match!"
                  : "You haven't sent any invitations to teammates yet. Go to Team Match to invite collaborators."
                }
              </p>
            </div>
            <Link href="/team-match">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs mt-2">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Explore Teammates
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {displayedInvites.map((invite) => {
            const isPending = invite.status === 'pending';
            const isAccepted = invite.status === 'accepted';
            const isRejected = invite.status === 'rejected';

            return (
              <Card key={invite.id} className="bg-slate-950/80 border-slate-800/80 hover:border-slate-700/80 transition-all shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="flex items-center gap-3">
                      {filter === 'received' ? (
                        <img
                          src={invite.sender?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${invite.sender?.name || 'user'}`}
                          alt={invite.sender?.name}
                          className="h-10 w-10 rounded-full border border-slate-700 object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-300">
                          <FolderGit2 className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                          {filter === 'received' 
                            ? `${invite.sender?.name || 'A teammate'} invited you to join:` 
                            : `Invitation sent to ${invite.receiver?.name || 'Teammate'}:`
                          }
                          <span className="text-indigo-400 font-bold">{invite.project?.name}</span>
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <Clock className="h-3 w-3 text-slate-500" />
                          {new Date(invite.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </CardDescription>
                      </div>
                    </div>

                    <Badge className={`text-xs capitalize ${
                      isPending ? 'bg-amber-950/90 text-amber-300 border-amber-800' :
                      isAccepted ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800' :
                      'bg-rose-950/90 text-rose-300 border-rose-800'
                    }`}>
                      {invite.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="py-2 text-xs space-y-2 text-slate-300">
                  {invite.message && (
                    <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 italic text-slate-300">
                      "{invite.message}"
                    </div>
                  )}
                  {invite.project?.description && (
                    <p className="text-slate-400">
                      <span className="font-medium text-slate-300">Project Goal:</span> {invite.project.description}
                    </p>
                  )}
                </CardContent>

                <CardFooter className="pt-3 border-t border-slate-900 flex justify-between items-center">
                  <Link href={`/project/${invite.projectId}`} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium">
                    View Project Workspace <ArrowRight className="h-3 w-3" />
                  </Link>

                  {filter === 'received' && isPending && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRespond(invite.id, 'reject')}
                        disabled={respondingId === invite.id}
                        className="h-8 text-xs border-slate-700 bg-slate-900 hover:bg-rose-950 hover:border-rose-800 text-rose-400"
                      >
                        <X className="mr-1 h-3.5 w-3.5" /> Decline
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRespond(invite.id, 'accept')}
                        disabled={respondingId === invite.id}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md"
                      >
                        <Check className="mr-1 h-3.5 w-3.5" /> Accept & Join Project
                      </Button>
                    </div>
                  )}

                  {isAccepted && (
                    <Link href={`/project/${invite.projectId}`}>
                      <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white">
                        Open Project Workspace
                      </Button>
                    </Link>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
