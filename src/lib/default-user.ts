import { prisma } from './prisma';

const DEFAULT_USER_ID = 'default-user';
const DEFAULT_EMAIL = 'user@audioanalyzer.app';
const DEFAULT_NAME = 'User';

let ensured = false;

export async function getDefaultUserId(): Promise<string> {
  if (!ensured) {
    const existing = await prisma.user.findUnique({ where: { id: DEFAULT_USER_ID } });
    if (!existing) {
      await prisma.user.create({
        data: {
          id: DEFAULT_USER_ID,
          email: DEFAULT_EMAIL,
          name: DEFAULT_NAME,
          passwordHash: 'no-auth',
        },
      });
    }
    ensured = true;
  }
  return DEFAULT_USER_ID;
}
