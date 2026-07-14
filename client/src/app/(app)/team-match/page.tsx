
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RainbowButton } from "@/components/magicui/rainbow-button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Teammate {
  id: string;
  name: string;
  githubUsername: string;
  avatarUrl: string;
  role: string;
  skills: string[];
  interests: string[];
  availability: string;
  experience: string;
  bio: string;
  matchScore: number;
}

export default function TeamMatchPage() {
  const { user, isAuthenticated } = useAuth();
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    skills: '',
    interests: '',
    availability: ''
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchMatchedTeammates();
    }
  }, [isAuthenticated]);

  const fetchMatchedTeammates = async () => {
    try {
      setLoading(true);
      
      // Get the session token from cookies
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };

      const sessionToken = getCookie('connect.sid');
      if (!sessionToken) {
        throw new Error('No active session. Please log in again.');
      }

      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const queryParams = new URLSearchParams({
        skills: filters.skills,
        interests: filters.interests,
        availability: filters.availability,
        limit: '12'
      }).toString();

      const response = await fetch(`${backendUrl}/api/team?${queryParams}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.status === 401) {
        // Handle unauthorized - possibly session expired
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        throw new Error(errorData.message || errorData.error || 'Failed to fetch matched teammates');
      }

      const data = await response.json();
      setTeammates(data);
    } catch (error) {
      console.error('Error fetching teammates:', error);
      toast.error('Failed to load matched teammates');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (teammateId: string) => {
    try {
      // In a real app, you would open a modal to select a project
      // and then send the invite
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: teammateId,
          message: `Hi! I'd love to collaborate with you on a project.`
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to send invite');
      }

      toast.success('Invite sent successfully!');
    } catch (error) {
      console.error('Error sending invite:', error);
      toast.error('Failed to send invite');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApplyFilters = () => {
    fetchMatchedTeammates();
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Please log in to view team matches</p>
      </div>
    );
  }

  return (
    <div className="w-full relative overflow-hidden px-4 md:px-6">
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-red-500/20 rounded-full filter blur-3xl opacity-50 -z-10 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-orange-400/20 rounded-full filter blur-3xl opacity-50 -z-10 animate-pulse animation-delay-2000"></div>
      <div className="absolute top-10 right-1/3 w-72 h-72 bg-red-300/20 rounded-full filter blur-3xl opacity-50 -z-10 animate-pulse animation-delay-4000"></div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">AI Team Match</h1>
        <p className="text-muted-foreground">Find the perfect collaborators for your next project.</p>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
            <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                <CardTitle>Filters</CardTitle>
            </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Input 
          placeholder="Filter by skills (e.g., React, Python...)" 
          value={filters.skills}
          onChange={(e) => handleFilterChange('skills', e.target.value)}
        />
        <Select 
          value={filters.interests}
          onValueChange={(value) => handleFilterChange('interests', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by interests" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ai">Artificial Intelligence</SelectItem>
            <SelectItem value="webdev">Web Development</SelectItem>
            <SelectItem value="gamedev">Game Development</SelectItem>
            <SelectItem value="ai-engineer">AI Engineer</SelectItem>
            <SelectItem value="ui-ux">UI/UX Designer</SelectItem>
            <SelectItem value="product-manager">Product Manager</SelectItem>
            <SelectItem value="devops">DevOps Engineer</SelectItem>
            <SelectItem value="data-scientist">Data Scientist</SelectItem>
            <SelectItem value="mobile-dev">Mobile Development</SelectItem>
          </SelectContent>
        </Select>
        <Select 
          value={filters.availability}
          onValueChange={(value) => handleFilterChange('availability', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full-time">Full-time</SelectItem>
            <SelectItem value="part-time">Part-time (10-20 hrs/week)</SelectItem>
            <SelectItem value="flexible">Flexible</SelectItem>
          </SelectContent>
        </Select>
        <RainbowButton 
          onClick={handleApplyFilters}
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : 'Apply Filters'}
        </RainbowButton>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : teammates.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {teammates.map((teammate) => (
            <Card key={teammate.id} className="flex flex-col h-full">
              <CardHeader className="items-center">
                <Avatar className="w-24 h-24 border-4 border-muted">
                  <AvatarImage 
                    src={teammate.avatarUrl || `https://github.com/${teammate.githubUsername}.png`} 
                    alt={teammate.name}
                  />
                  <AvatarFallback>{teammate.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-center">
                  <CardTitle>{teammate.name}</CardTitle>
                  <CardDescription>@{teammate.githubUsername}</CardDescription>
                  {teammate.role && (
                    <p className="mt-1 text-sm text-muted-foreground">{teammate.role}</p>
                  )}
                  
                  <div className="mt-4 space-y-2 text-left">
                    {teammate.skills?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium">Skills</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {teammate.skills.slice(0, 3).map((skill, i) => (
                            <span key={i} className="text-xs bg-muted px-2 py-1 rounded-full">
                              {skill}
                            </span>
                          ))}
                          {teammate.skills.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{teammate.skills.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4">
                      <p className="text-sm font-medium">Match Score</p>
                      <div className="w-full bg-muted rounded-full h-2.5 mt-1">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2.5 rounded-full" 
                          style={{ width: `${teammate.matchScore}%` }}
                        />
                      </div>
                      <p className="text-2xl font-bold text-primary mt-1">{teammate.matchScore}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="mt-auto">
                <RainbowButton 
                  className="w-full"
                  onClick={() => handleInvite(teammate.id)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite to Project
                </RainbowButton>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No teammates found matching your criteria.</p>
          <button 
            onClick={() => {
              setFilters({ skills: '', interests: '', availability: '' });
              fetchMatchedTeammates();
            }}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
