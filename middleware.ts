import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public pages must not depend on Supabase Auth being responsive.
  // Authentication is still verified server-side by protected pages and APIs.
  const isPortalRoute = pathname === '/portal' || pathname.startsWith('/portal/');
  const isAdminRoute =
    (pathname === '/admin' || pathname.startsWith('/admin/')) &&
    pathname !== '/admin/login' &&
    !pathname.startsWith('/admin/login/');

  if (!isPortalRoute && !isAdminRoute) {
    return NextResponse.next({ request });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Verify protected-route sessions and refresh cookies when required.
  // Protected pages still perform their own authorization and role checks.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
};
