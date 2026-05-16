import { getAppEnv, getDatabaseAvailability } from "@/lib/env";
import { solarSystemDemoArtifact } from "@/lib/lesson/demo-artifact";
import { getLessonWithCurrentVersion } from "@/lib/lesson/repository";

export const runtime = "nodejs";

function htmlResponse(html: string, init?: ResponseInit) {
  return new Response(html, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy": [
        "default-src 'none'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "media-src 'self' data: https: blob:",
        "font-src 'self'",
        "connect-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'self'",
      ].join("; "),
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...init?.headers,
    },
  });
}

function errorHtml(title: string, message: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body>
  <main style="font-family: system-ui, sans-serif; max-width: 42rem; margin: 4rem auto; padding: 0 1rem;">
    <h1>${title}</h1>
    <p>${message}</p>
  </main>
</body>
</html>`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  if (lessonId === "demo") {
    return htmlResponse(solarSystemDemoArtifact.html);
  }

  const env = getAppEnv();
  const database = getDatabaseAvailability(env);
  if (!database.configured) {
    return htmlResponse(errorHtml("Sandbox unavailable", database.message), {
      status: 503,
    });
  }

  const persisted = await getLessonWithCurrentVersion(lessonId);
  if (!persisted?.version) {
    return htmlResponse(
      errorHtml(
        "Sandbox not found",
        "No saved sandbox HTML exists for this lesson."
      ),
      { status: 404 }
    );
  }

  return htmlResponse(persisted.version.html);
}
