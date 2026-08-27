import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    const newPassword = 'SuperLink@2024!';
    const newHash = await bcrypt.hash(newPassword, 12);

    const user = await prisma.user.update({
      where: { email: 'admin@superlinkit.com' },
      data: { passwordHash: newHash },
    });

    console.log('Password updated for:', user.email);
    console.log('New hash:', newHash);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();