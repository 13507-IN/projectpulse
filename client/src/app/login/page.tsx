
"use client";
import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { IconBrandGithub, IconBrandGoogle } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');
  const success = searchParams?.get('success');
  const { checkAuth } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    if (error) {
      toast.error(error === 'access_denied' ? 'GitHub login was cancelled' : 'Failed to login with GitHub');
      router.replace('/login');
    }
    if (success) {
      toast.success('Successfully logged in with GitHub');
      router.replace('/dashboard');
    }
  }, [error, success, router]);

  const handleGitHubLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    window.location.href = `${apiUrl}/api/auth/github`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error("Email and password are required");
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Login failed');
        return;
      }

      await checkAuth();
      toast.success('Successfully logged in');
      router.push("/dashboard");
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-red-500/20 rounded-full filter blur-3xl opacity-50 -z-10 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-orange-400/20 rounded-full filter blur-3xl opacity-50 -z-10 animate-pulse animation-delay-2000"></div>
      <div className="absolute top-10 right-1/3 w-72 h-72 bg-red-300/20 rounded-full filter blur-3xl opacity-50 -z-10 animate-pulse animation-delay-4000"></div>
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl opacity-50 -z-10 animate-pulse animation-delay-1000"></div>
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-green-400/10 rounded-full filter blur-3xl opacity-50 -z-10 animate-pulse animation-delay-3000"></div>

      <div className="max-w-md w-full mx-auto rounded-none md:rounded-2xl p-4 md:p-8 shadow-input bg-white dark:bg-black z-10">
        <h2 className="font-bold text-xl text-neutral-800 dark:text-neutral-200">
          Welcome back to ProjectPulse
        </h2>
        <p className="text-neutral-600 text-sm max-w-sm mt-2 dark:text-neutral-300">
          Log in to continue to your dashboard
        </p>

        <form className="my-8" onSubmit={handleSubmit}>
          <LabelInputContainer className="mb-4">
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              placeholder="projectmayhem@fc.com" 
              type="email" 
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </LabelInputContainer>
          <LabelInputContainer className="mb-4">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              placeholder="••••••••" 
              type="password" 
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </LabelInputContainer>

          <button
            className="bg-gradient-to-br relative group/btn from-black dark:from-zinc-900 dark:to-zinc-900 to-neutral-600 block dark:bg-zinc-800 w-full text-white rounded-md h-10 font-medium shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:shadow-[0px_1px_0px_0px_var(--zinc-800)_inset,0px_-1px_0px_0px_var(--zinc-800)_inset] disabled:opacity-50"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Log in'} &rarr;
            <BottomGradient />
          </button>

          <div className="bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent my-8 h-[1px] w-full" />

          <div className="flex flex-col space-y-4">
            <button
              onClick={handleGitHubLogin}
              disabled={isLoading}
              className="relative group/btn flex space-x-2 items-center justify-center px-4 w-full text-black rounded-md h-10 font-medium shadow-input bg-gray-50 dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_var(--neutral-800)] disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              <IconBrandGithub className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''} text-neutral-800 dark:text-neutral-300`} />
              <span className="text-neutral-700 dark:text-neutral-300 text-sm">
                {isLoading ? 'Signing in...' : 'Sign In with GitHub'}
              </span>
              <BottomGradient />
            </button>
            <button
              className=" relative group/btn flex space-x-2 items-center justify-start px-4 w-full text-black rounded-md h-10 font-medium shadow-input bg-gray-50 dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_var(--neutral-800)]"
              type="submit"
            >
              <IconBrandGoogle className="h-4 w-4 text-neutral-800 dark:text-neutral-300" />
              <span className="text-neutral-700 dark:text-neutral-300 text-sm">
                Google
              </span>
              <BottomGradient />
            </button>
          </div>
          <div className="text-center text-sm text-neutral-600 dark:text-neutral-300 mt-8">
            Don't have an account? <Link href="/signup" className="text-primary hover:underline">Sign up</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    }>
      <LoginForm />
    </React.Suspense>
  );
}

const BottomGradient = () => {
  return (
    <>
      <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      <span className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
    </>
  );
};

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex flex-col space-y-2 w-full", className)}>
      {children}
    </div>
  );
};
