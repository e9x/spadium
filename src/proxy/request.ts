import type BareClient from "@tomphttp/bare-client";
import { CookieJar } from "tough-cookie";
import WebStorageCookieStore from "./WebStorageCookieStore";
import type { Win } from "./win";
import { sBlobUrls, sAbort, sClient } from "./win";

export const validProtocols: string[] = ["http:", "https:"];

const redirectStatusCodes = [300, 301, 302, 303, 304, 305, 307, 308];

const cookie = new CookieJar(new WebStorageCookieStore());

export async function request(
  req: Request,
  dest: RequestDestination,
  win: Win
) {
  while (true) {
    const res = await _request(req, dest, win[sClient], win[sAbort].signal);
    for (const name in res.rawHeaders) {
      if (name.toLowerCase() === "set-cookie") {
        let cookies = res.rawHeaders[name];
        if (!Array.isArray(cookies)) cookies = [cookies];
        for (const c of cookies) await cookie.setCookie(c, res.finalURL);
      }
    }

    if (redirectStatusCodes.includes(res.status)) {
      const location = new URL(res.headers.get("location") || "", req.url);
      req = new Request(location);
      continue;
    }

    return res;
  }
}

async function _request(
  req: Request,
  dest: RequestDestination,
  client: BareClient,
  signal: AbortSignal
) {
  if (!client) throw new Error("OK");
  // todo: produce our own user-agent?
  const headers = new Headers(req.headers);
  headers.set("user-agent", navigator.userAgent);
  headers.set("sec-fetch-dest", dest);
  const cookies = await cookie.getCookieString(req.url);
  if (cookies) headers.set("cookie", cookies);
  return await client.fetch(req.url, {
    headers,
    body: req.body,
    // forcing cache greatly improves load times
    cache: "force-cache",
    signal,
    method: req.method,
    redirect: "manual",
  });
}

export async function localizeResource(
  url: string | URL,
  dest: RequestDestination,
  win: Win
) {
  const r = new URL(url);
  if (!validProtocols.includes(r.protocol) || !r.host || r.protocol === "data:")
    return r.toString();
  const res = await request(new Request(r), dest, win);
  const blobUrl = URL.createObjectURL(await res.blob());
  win[sBlobUrls].push(blobUrl);
  return blobUrl;
}
