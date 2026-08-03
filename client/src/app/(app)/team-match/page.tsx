
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RainbowButton } from "@/components/magicui/rainbow-button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, UserPlus, Loader2, ShieldCheck, Sparkles, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { SkillVerificationModal } from "@/components/team/skill-verification-modal";

interface MatchFactors {
  roleSynergy: number;
  skillScore: number;
  interestScore: number;
  availabilityScore: number;
  experienceScore: number;
}

interface VerificationInfo {
  id: string;
  overallStatus: 'in_progress' | 'verified' | 'failed';
  u1Status: string;
  u2Status: string;
}

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
  matchFactors?: MatchFactors;
  highlights?: string[];
  verification?: VerificationInfo | null;
}

export default function TeamMatchPage() {
  const { user, isAuthenticated } = useAuth();
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeammates, setExpandedTeammates] = useState<Record<string, boolean>>({});

  // Verification modal state
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Teammate | null>(null);

  const [filters, setFilters] = useState({
    skills: '',
    interests: '',
    role: '',
    availability: '',
    minScore: ''
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchMatchedTeammates();
    }
  }, [isAuthenticated]);

  const fetchMatchedTeammates = async () => {
    try {
      setLoading(true);
      
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const queryParams = new URLSearchParams({
        skills: filters.skills,
        interests: filters.interests,
        role: filters.role,
        availability: filters.availability,
        minScore: filters.minScore,
        limit: '12'
      }).toString();

      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      };
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const response = await fetch(`${backendUrl}/api/team?${queryParams}`, {
        method: 'GET',
        credentials: 'include',
        headers
      });

      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch matched teammates');
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

  const openVerificationModal = (teammate: Teammate) => {
    setSelectedPartner(teammate);
    setVerificationModalOpen(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedTeammates(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
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
    <div className="w-full relative overflow-hidden px-4 md:px-6 py-4">
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-red-500/20 rounded-full filter blur-3xl opacity-50 -z-10 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-orange-400/20 rounded-full filter blur-3xl opacity-50 -z-10 animate-pulse animation-delay-2000"></div>

      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Partner & Team Match</h1>
          <p className="text-muted-foreground">Find & verify ideal collaborators based on role synergy, skills, and 2-way verification.</p>
        </div>
      </div>
      
      <Card className="mb-6 bg-slate-950/70 border-slate-800 backdrop-blur-md">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-indigo-400" />
            <CardTitle className="text-lg">Smart Filter Controls</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input 
              placeholder="Skills (React, Node...)" 
              value={filters.skills}
              onChange={(e) => handleFilterChange('skills', e.target.value)}
              className="bg-slate-900 border-slate-700"
            />
            <Select 
              value={filters.role}
              onValueChange={(value) => handleFilterChange('role', value)}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="frontend">Frontend Developer</SelectItem>
                <SelectItem value="backend">Backend Developer</SelectItem>
                <SelectItem value="fullstack">Fullstack Developer</SelectItem>
                <SelectItem value="ui-ux">UI/UX Designer</SelectItem>
                <SelectItem value="ai-engineer">AI Engineer</SelectItem>
                <SelectItem value="devops">DevOps Engineer</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.interests}
              onValueChange={(value) => handleFilterChange('interests', value)}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700">
                <SelectValue placeholder="Interests" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ai">Artificial Intelligence</SelectItem>
                <SelectItem value="webdev">Web Development</SelectItem>
                <SelectItem value="gamedev">Game Development</SelectItem>
                <SelectItem value="mobile-dev">Mobile Apps</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.minScore}
              onValueChange={(value) => handleFilterChange('minScore', value)}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700">
                <SelectValue placeholder="Min Match Score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="80">80%+ Match</SelectItem>
                <SelectItem value="70">70%+ Match</SelectItem>
                <SelectItem value="60">60%+ Match</SelectItem>
              </SelectContent>
            </Select>

            <RainbowButton 
              onClick={handleApplyFilters}
              className="w-full h-10"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Apply Filters'}
            </RainbowButton>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
        </div>
      ) : teammates.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {teammates.map((teammate) => {
            const isVerified = teammate.verification?.overallStatus === 'verified';
            const isExpanded = !!expandedTeammates[teammate.id];

            return (
              <Card key={teammate.id} className="flex flex-col h-full bg-slate-950/80 border-slate-800 hover:border-indigo-500/50 transition-all duration-200">
                <CardHeader className="items-center relative pb-2">
                  {isVerified && (
                    <Badge className="absolute top-3 right-3 bg-emerald-900/80 text-emerald-300 border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Verified
                    </Badge>
                  )}
                  <Avatar className="w-20 h-20 border-2 border-indigo-500/40">
                    <AvatarImage 
                      src={teammate.avatarUrl || `https://github.com/${teammate.githubUsername}.png`} 
                      alt={teammate.name}
                    />
                    <AvatarFallback>{teammate.name?.substring(0, 2)?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                </CardHeader>

                <CardContent className="flex-1 space-y-3 text-center">
                  <div>
                    <CardTitle className="text-lg text-slate-100">{teammate.name}</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">@{teammate.githubUsername || 'developer'}</CardDescription>
                    {teammate.role && (
                      <Badge variant="outline" className="mt-1 bg-indigo-950/50 text-indigo-300 border-indigo-800 text-[11px]">
                        {teammate.role}
                      </Badge>
                    )}
                  </div>

                  {/* Highlights */}
                  {teammate.highlights && teammate.highlights.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 my-1">
                      {teammate.highlights.map((highlight, idx) => (
                        <span key={idx} className="text-[10px] bg-slate-900 text-indigo-200 border border-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5 text-amber-400" /> {highlight}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Skills */}
                  {teammate.skills?.length > 0 && (
                    <div className="text-left space-y-1">
                      <p className="text-xs font-semibold text-slate-400">Technical Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {teammate.skills.slice(0, 4).map((skill, i) => (
                          <span key={i} className="text-[11px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Match Score Bar */}
                  <div className="text-left pt-2 border-t border-slate-900">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-300">Match Compatibility</span>
                      <span className="font-bold text-indigo-400">{teammate.matchScore}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 mt-1 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${teammate.matchScore}%` }}
                      />
                    </div>

                    <button
                      onClick={() => toggleExpand(teammate.id)}
                      className="mt-2 text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                    >
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {isExpanded ? 'Hide Factor Breakdown' : 'View Factor Breakdown'}
                    </button>

                    {isExpanded && teammate.matchFactors && (
                      <div className="mt-2 p-2 bg-slate-900/90 rounded border border-slate-800 space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Role Synergy:</span>
                          <span className="text-indigo-300 font-medium">{teammate.matchFactors.roleSynergy}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Skill Alignment:</span>
                          <span className="text-emerald-300 font-medium">{teammate.matchFactors.skillScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Shared Interests:</span>
                          <span className="text-purple-300 font-medium">{teammate.matchFactors.interestScore}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="mt-auto flex flex-col gap-2 pt-2 border-t border-slate-900">
                  <Button 
                    variant="outline"
                    onClick={() => openVerificationModal(teammate)}
                    className={`w-full text-xs h-9 ${
                      isVerified 
                        ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60' 
                        : 'border-indigo-500/40 bg-indigo-950/30 text-indigo-300 hover:bg-indigo-900/50'
                    }`}
                  >
                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                    {isVerified ? 'Skillset Verified' : 'Verify Skillset'}
                  </Button>

                  <RainbowButton 
                    className="w-full text-xs h-9"
                    onClick={() => handleInvite(teammate.id)}
                  >
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                    Invite to Project
                  </RainbowButton>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-950/50 border border-slate-800 rounded-xl">
          <p className="text-slate-400">No teammates found matching your specified criteria.</p>
          <Button 
            variant="link"
            onClick={() => {
              setFilters({ skills: '', interests: '', role: '', availability: '', minScore: '' });
              fetchMatchedTeammates();
            }}
            className="mt-2 text-indigo-400 hover:underline text-xs"
          >
            Clear all filters
          </Button>
        </div>
      )}

      {/* Skillset Verification Modal */}
      {user && (
        <SkillVerificationModal
          isOpen={verificationModalOpen}
          onClose={() => setVerificationModalOpen(false)}
          targetUser={selectedPartner}
          currentUserId={String(user.id)}
          onVerificationComplete={fetchMatchedTeammates}
        />
      )}
    </div>
  );
}

