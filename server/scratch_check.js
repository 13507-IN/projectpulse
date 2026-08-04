import prisma from './src/config/prisma.js';

async function main() {
  const users = await prisma.user.findMany();
  console.log('Total users in DB:', users.length);
  console.log(users.map(u => ({ id: u.id, name: u.name, role: u.role, skills: u.skills })));
  await prisma.$disconnect();
}

main().catch(console.error);
