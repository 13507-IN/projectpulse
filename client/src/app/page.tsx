import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Github,
  Compass,
  MapPin,
  PanelsTopLeft,
  Search,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { Logo } from '@/components/icons';
import { Footer } from '@/components/shared/Footer';

const steps = [
  {
    number: '01',
    icon: Compass,
    title: 'Find your people',
    description:
      'Discover student-led ideas nearby, or find collaborators who bring the skills your idea needs.',
  },
  {
    number: '02',
    icon: PanelsTopLeft,
    title: 'Make a plan together',
    description:
      'Turn a promising idea into a shared board with clear tasks, owners, and next steps.',
  },
  {
    number: '03',
    icon: Sparkles,
    title: 'Build something real',
    description:
      'Keep the conversations and the work in one place, so your team can go from “what if?” to “we made it.”',
  },
];

const features = [
  {
    icon: Search,
    tag: 'DISCOVER',
    title: 'Find a project with room for you',
    description:
      'Browse student projects, see what each team is building, and apply to join the ones that excite you.',
    details: ['Search by keyword', 'Explore by location'],
    href: '/discover',
    action: 'Explore projects',
  },
  {
    icon: UsersRound,
    tag: 'MATCH',
    title: 'Meet collaborators who complement you',
    description:
      'Compare skills, interests, roles, and availability, with a compatibility breakdown that helps explain the fit.',
    details: ['Skill alignment', 'Shared interests'],
    href: '/team-match',
    action: 'Find teammates',
  },
  {
    icon: PanelsTopLeft,
    tag: 'WORKSPACE',
    title: 'Give the idea a place to happen',
    description:
      'Move tasks from To Do to In Progress to Done. Assign owners, set due dates, and keep the conversation with the work.',
    details: ['Task owners + due dates', 'Comments + useful filters'],
    href: '/dashboard',
    action: 'See your workspace',
  },
  {
    icon: Github,
    tag: 'BUILD',
    title: 'Keep your code close to the plan',
    description:
      'Connect a GitHub repository to your project so teammates can find the codebase right alongside the shared work.',
    details: ['Link a repository', 'Keep project context together'],
    href: '/dashboard',
    action: 'Start a project',
  },
];

function WorkspacePreview() {
  return (
    <div
      aria-label="Preview of a student project workspace"
      className="relative mx-auto w-full max-w-[570px]"
    >
      <div className="absolute -inset-5 rounded-[2rem] bg-lime-300/[0.08] blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111411] shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-lime-300/10 text-lime-200">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Campus build night</p>
              <p className="mt-0.5 text-xs text-white/45">A shared project space</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[0.08] px-2.5 py-1 text-[11px] font-medium text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            In motion
          </span>
        </div>

        <div className="border-b border-white/[0.07] px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/40">
                This week
              </p>
              <p className="mt-1 text-sm text-white/80">Small steps. Real momentum.</p>
            </div>
            <div className="flex -space-x-2" aria-label="Three teammates">
              {[
                ['A', 'bg-violet-300/20 text-violet-100'],
                ['J', 'bg-sky-300/20 text-sky-100'],
                ['M', 'bg-orange-300/20 text-orange-100'],
              ].map(([initial, color]) => (
                <span
                  key={initial}
                  className={`grid h-8 w-8 place-items-center rounded-full border-2 border-[#111411] text-[11px] font-semibold ${color}`}
                >
                  {initial}
                </span>
              ))}
              <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#111411] bg-white/10 text-[10px] text-white/70">
                +2
              </span>
            </div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full w-[62%] rounded-full bg-lime-300" />
          </div>
          <p className="mt-2 text-right text-[11px] text-white/40">A little progress beats a perfect plan</p>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          {[
            {
              title: 'Up next',
              tasks: [
                ['Sketch the first screen', 'A'],
                ['Pick a project name', 'J'],
              ],
            },
            {
              title: 'In progress',
              tasks: [
                ['Talk to 3 students', 'M'],
                ['Map the user journey', 'A'],
              ],
            },
            {
              title: 'Done',
              tasks: [
                ['Bring the team together', 'J'],
                ['Write down the idea', 'M'],
              ],
            },
          ].map((column) => (
            <div key={column.title} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-white/75">{column.title}</p>
                <span className="text-[10px] text-white/35">{column.tasks.length}</span>
              </div>
              <div className="space-y-2">
                {column.tasks.map(([task, owner]) => (
                  <div key={task} className="rounded-lg border border-white/[0.06] bg-[#191d19] p-2.5">
                    <p className="text-[11px] leading-4 text-white/75">{task}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-wider text-white/30">This week</span>
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-lime-200/10 text-[9px] text-lime-100">
                        {owner}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-white/[0.07] px-5 py-3 text-xs text-white/45">
          <Check className="h-3.5 w-3.5 text-lime-200" aria-hidden="true" />
          Ideas, people, and the work — finally in one place.
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#0a0c0a] text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0a0c0a]/85 backdrop-blur-xl">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8"
        >
          <Link href="/" aria-label="ProjectPulse home" className="flex items-center gap-2.5">
            <Logo className="h-9 w-9 text-lime-200" />
            <span className="text-[15px] font-bold tracking-tight text-white">
              Project<span className="text-lime-200">Pulse</span>
            </span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="#how-it-works" className="text-sm text-white/60 transition hover:text-white">
              How it works
            </Link>
            <Link href="#features" className="text-sm text-white/60 transition hover:text-white">
              Features
            </Link>
            <Link href="/login" className="text-sm text-white/70 transition hover:text-white">
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-lime-200 px-4 text-sm font-semibold text-[#11140d] transition hover:bg-lime-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c0a]"
            >
              Get started <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="flex items-center gap-4 md:hidden">
            <Link href="/login" className="text-sm text-white/70">Log in</Link>
            <Link
              href="/signup"
              className="rounded-full bg-lime-200 px-3.5 py-2 text-sm font-semibold text-[#11140d]"
            >
              Join
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative isolate">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_72%_35%,rgba(190,242,100,0.09),transparent_36%),radial-gradient(ellipse_at_10%_5%,rgba(74,222,128,0.05),transparent_34%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:min-h-[650px] lg:grid-cols-[0.92fr_1.08fr] lg:gap-8 lg:py-20">
            <div className="max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-lime-200/15 bg-lime-200/[0.06] px-3 py-1.5 text-xs font-medium text-lime-100/90">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-200" />
                For students with ideas worth building
              </div>
              <h1 className="text-[2.8rem] font-semibold leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-[4.25rem]">
                Find your people.
                <span className="mt-1 block text-lime-200">Build the thing.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-white/60 sm:text-lg sm:leading-8">
                Meet great collaborators nearby, turn a rough idea into a team, and do the actual work together — all in one place.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-lime-200 px-6 text-sm font-semibold text-[#11140d] transition hover:bg-lime-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c0a]"
                >
                  Find your team <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-medium text-white/80 transition hover:border-white/30 hover:bg-white/[0.04] hover:text-white"
                >
                  See how it works
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/40">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-lime-200/70" aria-hidden="true" />
                  Start with people around you
                </span>
                <span className="hidden h-1 w-1 rounded-full bg-white/25 sm:block" />
                <span>From first hello to shared workspace</span>
              </div>
            </div>
            <WorkspacePreview />
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 border-y border-white/[0.07] bg-white/[0.018]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-200/80">The good kind of group project</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Make the idea happen, together.
              </h2>
              <p className="mt-4 text-base leading-7 text-white/55">
                ProjectPulse connects the part where you meet your team to the part where you make something you’re proud of.
              </p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {steps.map(({ number, icon: Icon, title, description }) => (
                <article
                  key={number}
                  className="group rounded-2xl border border-white/[0.08] bg-[#101310] p-6 transition hover:-translate-y-1 hover:border-lime-200/20 hover:bg-[#131711]"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl border border-lime-200/10 bg-lime-200/[0.06] text-lime-200">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-xs text-white/25">{number}</span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/50">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="features" aria-labelledby="features-title" className="scroll-mt-24 border-b border-white/[0.07]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-200/80">Made for the whole build</p>
              <h2 id="features-title" className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">
                Find a fit. Then make progress.
              </h2>
              <p className="mt-4 text-base leading-7 text-white/55">
                The introduction is just the start. ProjectPulse brings discovery, team formation, and real project work into one flow.
              </p>
            </div>
            <div className="mt-11 grid gap-4 md:grid-cols-2">
              {features.map(({ icon: Icon, title, description, tag, details, href, action }) => (
                <article
                  key={tag}
                  className="group rounded-2xl border border-white/[0.08] bg-[#101310] p-6 transition hover:-translate-y-0.5 hover:border-lime-200/20 hover:bg-[#131711] sm:p-7"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl border border-lime-200/10 bg-lime-200/[0.06] text-lime-200">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] text-white/40">
                      {tag}
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">{description}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {details.map((detail) => (
                      <span
                        key={detail}
                        className="rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-xs text-white/55"
                      >
                        {detail}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={href}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-lime-200 transition group-hover:text-lime-100"
                  >
                    {action} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 sm:pb-24">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-lime-200/15 bg-[#12170f] px-6 py-12 text-center sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute left-1/2 top-0 h-56 w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-200/[0.08] blur-3xl" />
            <div className="relative mx-auto max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-200/80">Your next idea could use a team</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                What do you want to make?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/55 sm:text-base">
                Find people who are excited to build, then give the idea somewhere to go.
              </p>
              <Link
                href="/signup"
                className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-lime-200 px-6 text-sm font-semibold text-[#11140d] transition hover:bg-lime-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12170f]"
              >
                Get started <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
