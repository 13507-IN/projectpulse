
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CardNav, { type CardNavItem } from '@/components/shared/CardNav';
import { Footer } from '@/components/shared/Footer';
import { useAuth } from '@/context/auth-context';
import { useProfileStore } from '@/hooks/use-profile-store';


export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, loading } = useAuth();
  const { profile } = useProfileStore();
  const router = useRouter();

  const navItems: CardNavItem[] = [
    {
      label: 'Workspace',
      bgColor: '#000000',
      textColor: '#fff',
      links: [
        { label: 'Dashboard', href: '/dashboard', ariaLabel: 'Dashboard' },
        {
          label: 'Team Match',
          href: '/team-match',
          ariaLabel: 'AI Teammate Matching',
        },
        {
          label: 'Invitations',
          href: '/invites',
          ariaLabel: 'Project Invitations',
        },
        {
          label: 'Project Workspace',
          href: '/project/1',
          ariaLabel: 'Project Workspace',
        },
      ],
    },
    {
      label: 'Performance',
      bgColor: '#000000',
      textColor: '#fff',
      links: [
        { label: 'Analytics', href: '/analytics', ariaLabel: 'Analytics' },
        { label: 'Peer Review', href: '/review', ariaLabel: 'Peer Review' },
      ],
    },
    {
      label: 'Account',
      bgColor: '#000000',
      textColor: '#fff',
      links: [
        { label: 'Profile', href: '/profile', ariaLabel: 'Profile' },
        { label: 'Settings', href: '/settings', ariaLabel: 'Settings' },
        { label: 'Logout', href: '/', ariaLabel: 'Logout' },
      ],
    },
  ];

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col relative overflow-hidden">
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-red-500/20 rounded-full filter blur-3xl opacity-50 -z-10 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-orange-400/20 rounded-full filter blur-3xl opacity-50 -z-10 animate-pulse animation-delay-2000"></div>
      <div className="absolute top-10 right-1/3 w-72 h-72 bg-red-300/20 rounded-full filter blur-3xl opacity-50 -z-10 animate-pulse animation-delay-4000"></div>

      <CardNav
        logo="/logo.svg"
        items={navItems}
        baseColor="rgba(255, 255, 255, 0.5)"
        menuColor="black"
        buttonBgColor="#29ABE2"
        buttonTextColor="white"
      />
      <div className="flex flex-col sm:gap-4 sm:pt-24 sm:pb-4 flex-1">
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
