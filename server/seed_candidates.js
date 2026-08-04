import prisma from './src/config/prisma.js';

const sampleUsers = [
  {
    githubId: 'sample_sarah_101',
    githubUsername: 'sarahchen-dev',
    name: 'Sarah Chen',
    email: 'sarah.chen@university.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    role: 'Frontend Developer',
    skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Redux'],
    interests: ['Web Development', 'UI Design', 'Open Source'],
    availability: '20 hrs/week',
    experience: 'Intermediate',
    bio: 'Passionate frontend developer focused on building sleek UI components, accessible design systems, and responsive web applications.',
  },
  {
    githubId: 'sample_alex_102',
    githubUsername: 'alexrivera-tech',
    name: 'Alex Rivera',
    email: 'alex.rivera@tech.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    role: 'Backend Developer',
    skills: ['Node.js', 'Express', 'PostgreSQL', 'Prisma', 'Docker', 'Redis'],
    interests: ['Distributed Systems', 'Cloud Computing', 'API Design'],
    availability: '15 hrs/week',
    experience: 'Advanced',
    bio: 'Backend specialist who loves designing scalable microservices, REST & GraphQL APIs, and robust database architectures.',
  },
  {
    githubId: 'sample_priya_103',
    githubUsername: 'priyasharma-ai',
    name: 'Priya Sharma',
    email: 'priya.sharma@ai.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    role: 'AI Engineer',
    skills: ['Python', 'PyTorch', 'TensorFlow', 'LangChain', 'OpenAI API', 'Pinecone'],
    interests: ['Artificial Intelligence', 'NLP', 'Machine Learning'],
    availability: '25 hrs/week',
    experience: 'Advanced',
    bio: 'AI researcher & engineer building LLM applications, RAG pipelines, and intelligent agent frameworks for real-world projects.',
  },
  {
    githubId: 'sample_marcus_104',
    githubUsername: 'marcus-vance',
    name: 'Marcus Vance',
    email: 'marcus.vance@design.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    role: 'UI/UX Designer',
    skills: ['Figma', 'UI Design', 'Prototyping', 'User Research', 'Tailwind CSS'],
    interests: ['Design Systems', 'User Experience', 'Mobile Apps'],
    availability: '10 hrs/week',
    experience: 'Intermediate',
    bio: 'UI/UX designer turning complex workflow requirements into intuitive, elegant, and wowed visual interfaces.',
  },
  {
    githubId: 'sample_elena_105',
    githubUsername: 'elena-devops',
    name: 'Elena Rostova',
    email: 'elena.rostova@cloud.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    role: 'DevOps Engineer',
    skills: ['Docker', 'Kubernetes', 'AWS', 'GitHub Actions', 'Terraform', 'Linux'],
    interests: ['Cloud Architecture', 'CI/CD Pipelines', 'Infrastructure as Code'],
    availability: '15 hrs/week',
    experience: 'Advanced',
    bio: 'DevOps & cloud enthusiast automating deployment pipelines, container orchestration, and server monitoring.',
  },
  {
    githubId: 'sample_david_106',
    githubUsername: 'davidkim-fullstack',
    name: 'David Kim',
    email: 'david.kim@dev.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    role: 'Fullstack Developer',
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'GraphQL', 'Next.js'],
    interests: ['Fullstack Web', 'SaaS Products', 'Game Development'],
    availability: '20 hrs/week',
    experience: 'Intermediate',
    bio: 'Fullstack software builder excited about rapid prototyping, end-to-end web apps, and collaborative student hackathons.',
  },
];

async function seed() {
  console.log('Seeding sample collaborator profiles into Prisma database...');
  for (const user of sampleUsers) {
    await prisma.user.upsert({
      where: { githubId: user.githubId },
      update: user,
      create: user,
    });
  }
  console.log('Successfully seeded candidate teammate profiles!');
  await prisma.$disconnect();
}

seed().catch(console.error);
