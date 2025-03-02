import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname === '/login' || 
                      req.nextUrl.pathname === '/register';
    const isAdminPage = req.nextUrl.pathname.startsWith('/dashboard');
    const isWorkerPage = req.nextUrl.pathname.startsWith('/worker-dashboard');

    // Allow public access to auth pages if not authenticated
    if (isAuthPage && !isAuth) {
      return NextResponse.next();
    }

    // Redirect authenticated users from auth pages to their respective dashboards
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL(
        token.role === 'ADMIN' ? '/dashboard' : '/worker-dashboard',
        req.url
      ));
    }

    // Require authentication for protected routes
    if (!isAuth) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }

    // Handle role-based access
    if (isAdminPage && token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/worker-dashboard', req.url));
    }

    if (isWorkerPage && token.role !== 'WORKER') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true, // We'll handle authorization in the middleware function
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/worker-dashboard/:path*',
    '/login',
    '/register'
  ],
}; 