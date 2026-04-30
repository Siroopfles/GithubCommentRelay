import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Fetch session secret logic since we can't use prisma directly
// Actually the most robust way in Edge without DB is passing a secret via env or api
// We will call a verify API endpoint
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, api routes, and public paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login' ||
    pathname === '/setup'
  ) {
    return NextResponse.next();
  }

  // Exempt specific API routes
  if (pathname === '/api/login' || pathname === '/api/setup' || pathname === '/api/setup/status' || pathname === '/api/github/verify-token') {
    return NextResponse.next();
  }

  // Check if session cookie exists
  const sessionCookie = request.cookies.get('session');

  if (!sessionCookie) {
    // If no session, redirect to login or return 401 for API
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Call the internal verify API (which uses Node.js runtime and Prisma)
  // To avoid an extra network hop on every request, we can just let API routes handle their own auth
  // But for page routes, we redirect if there's no cookie. The API routes will do deep validation.

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
