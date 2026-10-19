import { Logo } from '@/components/icons';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#080a08] px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-md">
            <Link href="/" aria-label="ProjectPulse home" className="inline-flex items-center gap-2.5">
              <Logo className="h-8 w-8 text-lime-200" />
              <span className="text-sm font-bold text-white">
                Project<span className="text-lime-200">Pulse</span>
              </span>
            </Link>
            <p className="mt-3 text-sm leading-6 text-white/45">
              A place for students to find their people, build together, and turn good ideas into real projects.
            </p>
          </div>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/55">
            <Link href="/discover" className="transition hover:text-white">Discover projects</Link>
            <Link href="/team-match" className="transition hover:text-white">Find teammates</Link>
            <Link href="/docs" className="transition hover:text-white">Help &amp; docs</Link>
            <Link href="/signup" className="transition hover:text-white">Get started</Link>
          </nav>
        </div>
        <div className="mt-8 border-t border-white/[0.08] pt-5 text-xs text-white/35">
          <p>&copy; {new Date().getFullYear()} ProjectPulse. Built for people who make things.</p>
        </div>
      </div>
    </footer>
  );
}
