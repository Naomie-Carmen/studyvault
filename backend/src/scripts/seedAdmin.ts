/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Initialisation du compte administrateur et des codes d\'invitation bêta...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@studyvault.fr';
  const adminPassword = process.env.ADMIN_PASSWORD || 'StudyVault2026!Admin';

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // 1. Create or update admin user
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: 'admin',
      betaStatus: 'active',
      passwordHash,
    },
    create: {
      email: adminEmail,
      fullName: 'Administrateur StudyVault',
      passwordHash,
      role: 'admin',
      betaStatus: 'active',
      betaActivatedAt: new Date(),
    },
  });

  console.log(`✅ Compte Administrateur configuré : ${admin.email} (ID: ${admin.id})`);

  // 2. Generate 5 initial beta invite codes
  const initialCodes = [
    'SV-BETA-001',
    'SV-BETA-002',
    'SV-BETA-003',
    'SV-BETA-004',
    'SV-BETA-005',
  ];

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days for initial batch

  for (const code of initialCodes) {
    await prisma.betaInvite.upsert({
      where: { inviteCode: code },
      update: {
        expiresAt,
        status: 'pending',
      },
      create: {
        email: `beta_tester_${code.toLowerCase()}@studyvault.fr`,
        inviteCode: code,
        invitedBy: admin.id,
        expiresAt,
        status: 'pending',
      },
    });
  }

  console.log(`✅ ${initialCodes.length} codes d'invitation bêta initiaux créés :`, initialCodes.join(', '));
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('💥 Erreur lors de l\'initialisation :', e);
    await prisma.$disconnect();
    process.exit(1);
  });
