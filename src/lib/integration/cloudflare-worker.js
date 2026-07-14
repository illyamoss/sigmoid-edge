const READER_TOKEN_COOKIE = "reader_token";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const EDGE_SCORE_PATH = "/api/v1/edge-score";
const REDIRECT_URL = "/subscribe";

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(name + "=")) {
      return trimmed.substring(name.length + 1);
    }
  }
  return null;
}

function generateReaderToken() {
  return crypto.randomUUID();
}

async function fetchEdgeScore(origin, workspaceSlug, readerToken) {
  const url = origin.replace(/\/$/, "") + EDGE_SCORE_PATH;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceSlug, readerToken }),
  });

  if (!response.ok) {
    return { variant: "open", score: 0, readerToken };
  }

  const data = await response.json();
  return {
    variant: data.variant || "open",
    score: typeof data.score === "number" ? data.score : 0,
    readerToken: data.readerToken || readerToken,
  };
}

function resolveWorkspaceSlug(hostname) {
  const parts = hostname.split(".");
  if (parts.length <= 2) return "default";
  return parts[0];
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = (env && env.ORIGIN_URL) || url.origin;

    if (!url.pathname.startsWith("/blog/")) {
      return fetch(origin + url.pathname + url.search);
    }

    const hostname = url.hostname;
    const workspaceSlug = resolveWorkspaceSlug(hostname);

    const cookieHeader = request.headers.get("Cookie");
    const queryToken = url.searchParams.get("reader_token");
    let readerToken = queryToken || getCookieValue(cookieHeader, READER_TOKEN_COOKIE);
    const isNewToken = !readerToken;

    if (!readerToken) {
      readerToken = generateReaderToken();
    }

    const scoreResult = await fetchEdgeScore(origin, workspaceSlug, readerToken);

    const cookie = READER_TOKEN_COOKIE + "=" + scoreResult.readerToken + "; Path=/; SameSite=Lax; Max-Age=" + COOKIE_MAX_AGE_SECONDS;

    if (scoreResult.variant === "lock") {
      return new Response(null, {
        status: 302,
        headers: {
          "Location": REDIRECT_URL,
          "Set-Cookie": cookie,
        },
      });
    }

    const originUrl = new URL(origin);
    const targetUrl = originUrl.origin + url.pathname + url.search;
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: Object.fromEntries(request.headers),
      body: request.body,
      redirect: request.redirect,
    });

    const originResponse = await fetch(modifiedRequest);
    if (isNewToken) {
      const responseHeaders = new Headers(originResponse.headers);
      responseHeaders.append("Set-Cookie", cookie);
      return new Response(originResponse.body, {
        status: originResponse.status,
        statusText: originResponse.statusText,
        headers: responseHeaders,
      });
    }
    return originResponse;
  },
};