import type BareClient from "@tomphttp/bare-client";
import type { Win } from "./win";
import { sClient } from "./win";

export const validProtocols: string[] = ["http:", "https:"];

const redirectStatusCodes = [300, 301, 302, 303, 304, 305, 307, 308];

export async function request(
  req: Request,
  dest: RequestDestination,
  win: Win
) {
  while (true) {
    const res = await _request(req, dest, win[sClient]);
    for (const name in res.rawHeaders) {
      if (name.toLowerCase() === "set-cookie") {
        console.log("got set-cookie", res.rawHeaders[name]);
      }
    }

    if (redirectStatusCodes.includes(res.status)) {
      const location = new URL(res.headers.get("location") || "", req.url);
      req = new Request(location);
    }
    return res;
  }
}

export function _request(
  req: Request,
  dest: RequestDestination,
  client: BareClient
) {
  if (!client) throw new Error("OK");
  // todo: produce our own user-agent?
  const headers = new Headers(req.headers);
  headers.set("user-agent", navigator.userAgent);
  headers.set("sec-fetch-dest", dest);
  return client.fetch(req.url, {
    headers,
    body: req.body,
    // forcing cache greatly improves load times
    cache: "force-cache",
    signal: req.signal,
    method: req.method,
    redirect: req.redirect,
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
  return win.URL.createObjectURL(await res.blob());
}
