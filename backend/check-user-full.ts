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
    console.log('  passwordHash:', user.passwordHash);

    const isValid = await bcrypt.compare('SuperLink@2024!', user.passwordHash);
    console.log('SuperLink@2024! valid:', isValid);

    // Generate a new hash to compare
    const newHash = await bcrypt.hash('SuperLink@2024!', 12);
    console.log('New hash for SuperLink@2024!:', newHash);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();