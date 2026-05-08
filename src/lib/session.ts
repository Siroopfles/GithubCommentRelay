import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie) return false;

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.sessionSecret) return false;

  const session = await verifySession(settings.sessionSecret, sessionCookie.value);
  return !!session?.loggedIn;
}
