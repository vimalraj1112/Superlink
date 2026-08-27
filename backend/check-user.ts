import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@superlinkit.com' },
      include: { role: true }
    });

    if (!user) {
      console.log('User not found!');
      return;
    }

    console.log('User found:');
    console.log('  id:', user.id);
    console.log('  email:', user.email);
    console.log('  isActive:', user.isActive);
    console.log('  role:', user.role?.name);
    console.log('  passwordHash starts with:', user.passwordHash?.substring(0, 10));

    const isValid = await bcrypt.compare('SuperLink@2024!', user.passwordHash);
    console.log('Password valid:', isValid);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
