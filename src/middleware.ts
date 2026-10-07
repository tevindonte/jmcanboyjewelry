import { NextResponse, type NextRequest } from 'next/server';

const PREVIEW_COOKIE = 'jmcanboy_preview';

async function isSitePublic(): Promise<boolean> {
  if (process.env.SITE_PUBLIC === 'true' || process.env.NEXT_PUBLIC_SITE_PUBLIC === 'true') {
    return true;
  }

  const endpoint =
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? process.env.APPWRITE_ENDPOINT;
  const project =
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? process.env.APPWRITE_PROJECT_ID;
  const key = process.env.APPWRITE_API_KEY;
  const databaseId = process.env.APPWRITE_DATABASE_ID ?? 'jmcanboy';

  if (!endpoint || !project || !key) return false;

  try {
    const res = await fetch(
      `${endpoint}/databases/${databaseId}/collections/settings/documents/site_public`,
      {
        headers: {
          'X-Appwrite-Project': project,
          'X-Appwrite-Key': key,
        },
        next: { revalidate: 10 },
      },
    );
    if (!res.ok) return false;
    const doc = (await res.json()) as { value_json?: string };
    if (!doc.value_json) return false;
    return JSON.parse(doc.value_json) === true;
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
    const url = request.nextUrl.clone();
    url.pathname = '/coming-soon';
    url.search = '';
    const gate = NextResponse.rewrite(url);
    gate.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return gate;
  }

  if (!sitePublic) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
