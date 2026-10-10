
"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RainbowButton } from "@/components/magicui/rainbow-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Github, Linkedin, Mail, Pencil, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useProfileStore } from "@/hooks/use-profile-store";
import { useAuth } from "@/context/auth-context";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  updated_at: string;
  language: string | null;
  fork: boolean;
  private: boolean;
  html_url: string;
}

export default function ProfilePage() {
  const { profile } = useProfileStore();
  const { user, loading } = useAuth();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);

  // Use GitHub user data if available, otherwise fall back to profile store
  const displayUser = user ? {
    name: user.name || user.login,
    email: user.email || profile.email,
    avatar: user.avatar_url,
    github: `https://github.com/${user.login}`,
    login: user.login
  } : {
    name: profile.name,
    email: profile.email,
    avatar: PlaceHolderImages.find(img => img.id === profile.avatarId)?.imageUrl,
    github: profile.github,
    login: null
  };

  const fetchRepos = async () => {
    if (!user) return;
    
    setReposLoading(true);
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
        credentials: 'include',
        headers
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Repositories request unauthorized (401)');
          return;
        }
        throw new Error(`Failed to fetch repositories: ${response.statusText}`);
      }
      
      const data = await response.json();
      const repos = Array.isArray(data) ? data : (data.repositories || data.repos || []);
      
      const activeRepos = repos
        .filter((repo: GitHubRepo) => !repo.fork && repo.updated_at)
        .sort((a: GitHubRepo, b: GitHubRepo) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
        .slice(0, 6);
        
      setRepos(activeRepos);
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
    } finally {
      setReposLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRepos();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  // Fallback projects for non-GitHub users
  const fallbackProjects = [
    { name: "AI for Education", description: "Workspace for team collaboration and task management.", progress: 75 },
    { name: "Mobile App Dev", description: "Developing a new social media application.", progress: 40 },
  ];

  const userAvatar = PlaceHolderImages.find(img => img.id === profile.avatarId);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row items-start gap-8">
        {/* Left Column */}
        <div className="w-full md:w-1/3">
          <Card className="glass-card border-none relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full filter blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Avatar className="w-28 h-28 mb-4 ring-4 ring-indigo-500/30 ring-offset-4 ring-offset-slate-950 shadow-[0_0_30px_rgba(99,102,241,0.4)]">
                <AvatarImage src={displayUser.avatar} />
                <AvatarFallback>{displayUser.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-bold">{displayUser.name}</h1>
              {displayUser.login && (
                <p className="text-muted-foreground">@{displayUser.login}</p>
              )}
              <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${displayUser.email}`} className="hover:underline">{displayUser.email}</a>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <a href={displayUser.github} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                  <Github className="h-6 w-6" />
                </a>
                {!user && (
                  <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                    <Linkedin className="h-6 w-6" />
                  </a>
                )}
              </div>
              <Link href="/profile/edit" className="w-full mt-6">
                <RainbowButton className="w-full">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Your Profile
                </RainbowButton>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="w-full md:w-2/3 space-y-6">
          <Card className="glass-card border-none">
            <CardHeader>
              <CardTitle>Skills & Interests</CardTitle>
              <CardDescription>A collection of skills and professional interests.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.tags.map(tag => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-none">
            <CardHeader>
              <CardTitle>Current Projects</CardTitle>
              <CardDescription>Projects where {displayUser.name.split(' ')[0]} is an active member.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={user && repos.length > 0 ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
                {reposLoading ? (
                  <div className="text-center py-4 md:col-span-2">
                    <p className="text-muted-foreground">Loading GitHub repositories...</p>
                  </div>
                ) : user && repos.length > 0 ? (
                  repos.map((repo: GitHubRepo) => (
                    <div key={repo.id} className="flex flex-col justify-between p-4 glass hover-glow border-slate-800/50 rounded-xl transition-all h-full">
                      <div className="mb-4">
                        <h3 className="font-bold text-slate-100">{repo.name}</h3>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {repo.description || "No description available"}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          {repo.language && (
                            <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-300">
                              {repo.language}
                            </Badge>
                          )}
                          <Badge variant={repo.private ? "secondary" : "outline"} className="text-[10px]">
                            {repo.private ? "Private" : "Public"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => window.open(repo.html_url, '_blank')}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
                          title="View on GitHub"
                        >
                          <Github className="h-3.5 w-3.5 mr-1.5" /> Repo
                        </button>
                        <Link href={`/project/${repo.id}`}>
                          <button className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-[0_0_10px_rgba(79,70,229,0.3)]">
                            <ArrowUpRight className="h-3.5 w-3.5 mr-1" /> Open
                          </button>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : user ? (
                  <div className="text-center py-4 md:col-span-2">
                    <p className="text-muted-foreground">No active repositories found.</p>
                  </div>
                ) : (
                  fallbackProjects.map((project) => (
                    <div key={project.name} className="flex flex-col justify-between p-4 glass hover-glow border-slate-800/50 rounded-xl transition-all h-full">
                      <div className="mb-4">
                        <h3 className="font-bold text-slate-100">{project.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                      </div>
                      <div className="flex justify-end">
                        <Link href="/project/1">
                          <RainbowButton className="h-8 px-4 text-xs">
                            <ArrowUpRight className="h-3.5 w-3.5 mr-1" /> View Project
                          </RainbowButton>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
