import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PREVIEW_COOKIE = 'jmcanboy_preview';

async function isSitePublic(): Promise<boolean> {
  if (process.env.SITE_PUBLIC === 'true' || process.env.NEXT_PUBLIC_SITE_PUBLIC === 'true') {
    return true;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  try {
    const res = await fetch(`${url}/rest/v1/settings?key=eq.site_public&select=value`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      next: { revalidate: 10 },
    });
    if (!res.ok) return false;
    const rows = (await res.json()) as { value: boolean }[];
    return rows[0]?.value === true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/cron') ||
    pathname === '/robots.txt' ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/models')
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const expected = process.env.PREVIEW_TOKEN;
  const previewParam = searchParams.get('preview');

  if (previewParam && expected && previewParam === expected) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete('preview');
    const redirect = NextResponse.redirect(clean);
    redirect.cookies.set(PREVIEW_COOKIE, expected, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return redirect;
  }

  const hasPreview =
    Boolean(expected) && request.cookies.get(PREVIEW_COOKIE)?.value === expected;

  const sitePublic = await isSitePublic();
  const isComingSoon = pathname === '/coming-soon';
  const isAdminPath = pathname.startsWith('/admin');
  const isApi = pathname.startsWith('/api');

  if (!sitePublic && !hasPreview) {
    if (isComingSoon) {
      const r = NextResponse.next();
      r.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return r;
    }
    if (isApi) {
      return NextResponse.json({ error: 'Coming soon' }, { status: 403 });
    }
    // Allow /admin only with preview — otherwise coming soon
    if (isAdminPath) {
      const url = request.nextUrl.clone();
      url.pathname = '/coming-soon';
      url.search = '';
      const gate = NextResponse.rewrite(url);
      gate.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return gate;
    }
    const url = request.nextUrl.clone();
    url.pathname = '/coming-soon';
    url.search = '';
    const gate = NextResponse.rewrite(url);
    gate.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return gate;
  }

  if (isAdminPath && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );
    await supabase.auth.getUser();
  }

  if (!sitePublic) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
