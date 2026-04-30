import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from './src/lib/auth';
import { prisma } from './src/lib/prisma';

// We can't use Prisma directly in Edge Runtime middleware easily.
// Instead we'll hit a special edge-compatible API route or just check cookies.

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, api routes, and public paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login' ||
    pathname === '/setup'
  ) {
    return NextResponse.next();
  }

  // Check if session cookie exists
  const sessionCookie = request.cookies.get('session');

  if (!sessionCookie) {
    // If no session, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
