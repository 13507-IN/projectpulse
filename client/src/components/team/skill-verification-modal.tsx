'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, ShieldCheck, HelpCircle, Send, Award, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: number;
  text: string;
  skill?: string;
}

interface Answer {
  questionId: number;
  answer: string;
}

interface VerificationData {
  id: string;
  user1Id: string;
  user2Id: string;
  u1Questions: Question[];
  u1Answers: Answer[];
  u1Status: 'pending' | 'questions_set' | 'answered' | 'verified' | 'rejected';
  u2Questions: Question[];
  u2Answers: Answer[];
  u2Status: 'pending' | 'questions_set' | 'answered' | 'verified' | 'rejected';
  overallStatus: 'in_progress' | 'verified' | 'failed';
  user1?: { id: string; name: string; avatarUrl?: string; role?: string; skills?: string[] };
  user2?: { id: string; name: string; avatarUrl?: string; role?: string; skills?: string[] };
}

interface SkillVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    id: string;
    name: string;
    skills?: string[];
    role?: string;
  } | null;
  currentUserId: string;
  onVerificationComplete?: () => void;
}

const PRESET_QUESTION_TEMPLATES: Record<string, string[]> = {
  React: [
    'How do you manage state and avoid unnecessary re-renders in React?',
    'Explain the difference between useEffect, useMemo, and useCallback hooks.',
  ],
  'Node.js': [
    'How do you handle asynchronous error handling and middleware in Express/Node.js?',
    'What strategy do you use for database connection pooling and transaction handling?',
  ],
  Python: [
    'How do you manage virtual environments, dependencies, and asynchronous execution in Python?',
    'Explain how decorators and context managers work in Python projects.',
  ],
  TypeScript: [
    'How do generics and utility types (like Partial, Pick, Omit) help build type-safe applications?',
    'How do you define strict interface boundaries for API request/response types?',
  ],
  'UI/UX': [
    'What is your process for designing responsive component design systems and micro-interactions?',
    'How do you test and ensure web accessibility (WCAG) compliance?',
  ],
  General: [
    'Describe a complex technical challenge you solved recently in a team project.',
    'How do you approach git branching, code reviews, and automated testing?',
  ],
};

export function SkillVerificationModal({
  isOpen,
  onClose,
  targetUser,
  currentUserId,
  onVerificationComplete,
}: SkillVerificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verification, setVerification] = useState<VerificationData | null>(null);

  // Question setting state
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');

  // Answering state
  const [ans1, setAns1] = useState('');
  const [ans2, setAns2] = useState('');

  useEffect(() => {
    if (isOpen && targetUser) {
      initiateOrFetchVerification();
    }
  }, [isOpen, targetUser]);

  const initiateOrFetchVerification = async () => {
    if (!targetUser) return;
    try {
      setLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${backendUrl}/api/team/verification/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetUser.id }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to load verification status');
      const data: VerificationData = await response.json();
      setVerification(data);

      // Pre-fill existing questions if current user already set them
      const isUser1 = data.user1Id === currentUserId;
      const myQuestions = isUser1 ? data.u1Questions : data.u2Questions;
      if (myQuestions && myQuestions.length > 0) {
        setQ1(myQuestions[0]?.text || '');
        setQ2(myQuestions[1]?.text || '');
      } else {
        setQ1('');
        setQ2('');
      }

      // Pre-fill existing answers if current user already answered
      const partnerQuestions = isUser1 ? data.u2Questions : data.u1Questions;
      const myAnswers = isUser1 ? data.u2Answers : data.u1Answers;

      if (myAnswers && myAnswers.length > 0) {
        setAns1(myAnswers.find((a) => a.questionId === partnerQuestions[0]?.id)?.answer || '');
        setAns2(myAnswers.find((a) => a.questionId === partnerQuestions[1]?.id)?.answer || '');
      } else {
        setAns1('');
        setAns2('');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Could not connect to skill verification server');
    } finally {
      setLoading(false);
    }
  };

  const handleSetQuestions = async () => {
    if (!verification) return;
    const questions: Question[] = [];
    if (q1.trim()) questions.push({ id: 1, text: q1.trim() });
    if (q2.trim()) questions.push({ id: 2, text: q2.trim() });

    if (questions.length === 0) {
      toast.error('Please enter at least 1 verification question for your partner.');
      return;
    }

    try {
      setSubmitting(true);
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${backendUrl}/api/team/verification/${verification.id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to set questions');
      const updated: VerificationData = await response.json();
      setVerification(updated);
      toast.success('Verification questions sent to partner!');
      if (onVerificationComplete) onVerificationComplete();
    } catch (error) {
      console.error(error);
      toast.error('Error submitting questions');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAnswers = async () => {
    if (!verification) return;
    const isUser1 = verification.user1Id === currentUserId;
    const partnerQuestions = isUser1 ? verification.u2Questions : verification.u1Questions;

    if (!partnerQuestions || partnerQuestions.length === 0) {
      toast.error('No partner questions found to answer.');
      return;
    }

    const answers: Answer[] = [];
    if (partnerQuestions[0] && ans1.trim()) {
      answers.push({ questionId: partnerQuestions[0].id, answer: ans1.trim() });
    }
    if (partnerQuestions[1] && ans2.trim()) {
      answers.push({ questionId: partnerQuestions[1].id, answer: ans2.trim() });
    }

    if (answers.length < partnerQuestions.length) {
      toast.error(`Please answer all ${partnerQuestions.length} question(s).`);
      return;
    }

    try {
      setSubmitting(true);
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${backendUrl}/api/team/verification/${verification.id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to submit answers');
      const updated: VerificationData = await response.json();
      setVerification(updated);
      toast.success('Your skillset verification answers have been submitted!');
      if (onVerificationComplete) onVerificationComplete();
    } catch (error) {
      console.error(error);
      toast.error('Error submitting answers');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEvaluate = async (action: 'verify' | 'reject') => {
    if (!verification) return;
    try {
      setSubmitting(true);
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${backendUrl}/api/team/verification/${verification.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to evaluate partner responses');
      const updated: VerificationData = await response.json();
      setVerification(updated);
      toast.success(action === 'verify' ? 'Partner skillset verified!' : 'Review updated');
      if (onVerificationComplete) onVerificationComplete();
    } catch (error) {
      console.error(error);
      toast.error('Error evaluating responses');
    } finally {
      setSubmitting(false);
    }
  };

  const applyPreset = (text: string) => {
    if (!q1) {
      setQ1(text);
    } else if (!q2) {
      setQ2(text);
    } else {
      setQ1(text);
    }
  };

  if (!targetUser) return null;

  const isUser1 = verification?.user1Id === currentUserId;
  const myQuestions = isUser1 ? verification?.u1Questions : verification?.u2Questions;
  const myQuestionsStatus = isUser1 ? verification?.u1Status : verification?.u2Status;

  const partnerQuestions = isUser1 ? verification?.u2Questions : verification?.u1Questions;
  const partnerAnswers = isUser1 ? verification?.u1Answers : verification?.u2Answers; // Partner's answers to my questions
  const myAnswersToPartner = isUser1 ? verification?.u2Answers : verification?.u1Answers;
  const myAnswersStatus = isUser1 ? verification?.u2Status : verification?.u1Status;

  const isFullyVerified = verification?.overallStatus === 'verified';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-950 text-slate-100 border-slate-800 backdrop-blur-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-indigo-400">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <DialogTitle className="text-xl font-bold text-slate-100">
              Partner Skillset Verification
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-400">
            Verify key technical skills with <span className="font-semibold text-indigo-300">{targetUser.name}</span> by setting & answering 1–2 targeted questions.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="space-y-4 my-2">
            {isFullyVerified && (
              <div className="p-4 bg-emerald-950/60 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-300">
                <Award className="h-8 w-8 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-semibold text-emerald-200">Skillset Verified & Approved!</h4>
                  <p className="text-xs text-emerald-300/80">
                    Both you and {targetUser.name} have successfully verified each other's technical skillset.
                  </p>
                </div>
              </div>
            )}

            <Tabs defaultValue="set-questions" className="w-full">
              <TabsList className="grid grid-cols-3 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                <TabsTrigger value="set-questions" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  1. Your Questions ({myQuestions?.length || 0}/2)
                </TabsTrigger>
                <TabsTrigger value="answer-questions" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  2. Answer Partner ({partnerQuestions?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="review-partner" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  3. Review Partner ({partnerAnswers?.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Set Questions */}
              <TabsContent value="set-questions" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <HelpCircle className="h-3.5 w-3.5 text-indigo-400" /> Question 1 for {targetUser.name}
                  </label>
                  <Input
                    placeholder="e.g. How do you handle async state & error handling in React?"
                    value={q1}
                    onChange={(e) => setQ1(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <HelpCircle className="h-3.5 w-3.5 text-indigo-400" /> Question 2 for {targetUser.name} (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Describe how you structure API database queries or schemas."
                    value={q2}
                    onChange={(e) => setQ2(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-slate-200"
                  />
                </div>

                {/* Preset Suggestions */}
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                  <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Quick Preset Suggestions:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(PRESET_QUESTION_TEMPLATES).map(([category, questions]) => (
                      <Button
                        key={category}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreset(questions[0])}
                        className="text-xs bg-slate-800/80 border-slate-700 hover:bg-indigo-900/50 hover:border-indigo-500 text-slate-300"
                      >
                        + {category} Question
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleSetQuestions}
                  disabled={submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send Questions to {targetUser.name}
                </Button>
              </TabsContent>

              {/* Tab 2: Answer Partner Questions */}
              <TabsContent value="answer-questions" className="mt-4 space-y-4">
                {!partnerQuestions || partnerQuestions.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800">
                    <HelpCircle className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">
                      {targetUser.name} has not set any questions yet. They will be notified to set 1–2 questions for you.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {partnerQuestions.map((q, idx) => (
                      <div key={q.id} className="space-y-2 p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
                        <p className="text-xs font-semibold text-indigo-300">
                          Q{idx + 1}: {q.text}
                        </p>
                        <Textarea
                          placeholder="Type your explanation or response..."
                          value={idx === 0 ? ans1 : ans2}
                          onChange={(e) => (idx === 0 ? setAns1(e.target.value) : setAns2(e.target.value))}
                          className="bg-slate-950 border-slate-700 text-slate-200 text-sm min-h-[70px]"
                        />
                      </div>
                    ))}
                    <Button
                      onClick={handleSubmitAnswers}
                      disabled={submitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Submit Answers to {targetUser.name}
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Tab 3: Review Partner Answers */}
              <TabsContent value="review-partner" className="mt-4 space-y-4">
                {!partnerAnswers || partnerAnswers.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800">
                    <RefreshCw className="h-8 w-8 text-slate-500 mx-auto mb-2 animate-spin-slow" />
                    <p className="text-sm text-slate-400">
                      Waiting for {targetUser.name} to submit answers to your questions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myQuestions?.map((q, idx) => {
                      const matchedAnswer = partnerAnswers.find((a) => a.questionId === q.id);
                      return (
                        <div key={q.id} className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg space-y-1">
                          <p className="text-xs font-semibold text-slate-300">Q{idx + 1}: {q.text}</p>
                          <div className="p-2.5 bg-slate-950 rounded border border-slate-800 text-sm text-emerald-300">
                            {matchedAnswer?.answer || 'No answer submitted yet.'}
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEvaluate('verify')}
                        disabled={submitting}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Verify & Approve Partner
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
