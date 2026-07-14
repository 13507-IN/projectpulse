
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
      const response = await fetch('http://localhost:4000/api/github/repositories', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('Authentication required, trying to refresh...');
          // Try to refresh the session
          const refreshResponse = await fetch('http://localhost:4000/api/auth/refresh', {
            method: 'POST',
            credentials: 'include'
          });
          
          if (refreshResponse.ok) {
            // Retry the original request
            return fetchRepos();
          } else {
            throw new Error('Session expired. Please log in again.');
          }
        }
        throw new Error(`Failed to fetch repositories: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Handle both array and object response formats
      const repos = Array.isArray(data) ? data : (data.repositories || data.repos || []);
      
      // Filter and sort repositories
      const activeRepos = repos
        .filter((repo: GitHubRepo) => !repo.fork && repo.updated_at) // Exclude forks and repos without recent activity
        .sort((a: GitHubRepo, b: GitHubRepo) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
        .slice(0, 6); // Show top 6 most recent repos
        
      setRepos(activeRepos);
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      // You might want to show an error message to the user here
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
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Avatar className="w-28 h-28 mb-4 border-4 border-muted">
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
          <Card>
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

          <Card>
            <CardHeader>
              <CardTitle>Current Projects</CardTitle>
              <CardDescription>Projects where {displayUser.name.split(' ')[0]} is an active member.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {reposLoading ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Loading GitHub repositories...</p>
                </div>
              ) : user && repos.length > 0 ? (
                repos.map((repo: GitHubRepo) => (
                  <div key={repo.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <h3 className="font-semibold">{repo.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {repo.description || "No description available"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {repo.language && (
                          <Badge variant="outline" className="text-xs">
                            {repo.language}
                          </Badge>
                        )}
                        <Badge variant={repo.private ? "secondary" : "outline"} className="text-xs">
                          {repo.private ? "Private" : "Public"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => window.open(repo.html_url, '_blank')}
                        className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                        title="View on GitHub"
                      >
                        <Github className="h-4 w-4" />
                      </button>
                      <Link href="/project/1">
                        <button className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                          <ArrowUpRight className="h-4 w-4" />
                        </button>
                      </Link>
                    </div>
                  </div>
                ))
              ) : user ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">No active repositories found.</p>
                </div>
              ) : (
                fallbackProjects.map((project) => (
                  <div key={project.name} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <h3 className="font-semibold">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    </div>
                    <Link href="/project/1">
                      <RainbowButton>
                        <ArrowUpRight className="h-4 w-4" />
                      </RainbowButton>
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
