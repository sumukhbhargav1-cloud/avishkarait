import { cookies } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'hackathon_admin_session';

export async function getAdminSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME);

  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  try {
    const session = JSON.parse(sessionCookie.value);
    if (session && session.email && session.authenticated) {
      return session;
    }
  } catch {
    return null;
  }

  return null;
}

