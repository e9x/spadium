import type BareClient from "@tomphttp/bare-client";
import type { SrcSetDefinition } from "srcset";
import { parseSrcset, stringifySrcset } from "srcset";
import type { BareFetchInit, BareResponseFetch } from "@tomphttp/bare-client";
import type { CssNode, Raw } from "css-tree";
import { generate, parse, walk } from "css-tree";

const location = Symbol("spadium location");

export type Win = typeof globalThis & { [location]: URL };

async function rewriteSrcset(srcset: string, win: Win, client: BareClient) {
  const parsed = parseSrcset(srcset);
  const newSrcset: SrcSetDefinition[] = [];

  for (const src of parsed)
    newSrcset.push({
      url: await localizeResource(
        new URL(src.url, win[location]),
        "image",
        win,
        client
      ),
      ...(src.density ? { density: src.density } : {}),
      ...(src.width ? { width: src.width } : {}),
    });

  return stringifySrcset(newSrcset);
}

async function rewriteStyle(
  style: CSSStyleDeclaration,
  win: Win,
  client: BareClient
) {
  for (let i = 0; i < style.length; i++) {
    const property = style[i];
    style.setProperty(
      property,
      await modifyCSS(style.getPropertyValue(property), "value", win, client)
    );
  }
}

async function localizeResource(
  url: string | URL,
  dest: RequestDestination,
  win: Win,
  client: BareClient
) {
  const r = new URL(url);
  if (r.protocol === "data:") return r.toString();
  const res = await request(new Request(r), dest, client);
  return win.URL.createObjectURL(await res.blob());
}

async function modifyCSS(
  script: string,
  context: string,
  // so we can create a blob inside the window
  win: Win,
  client: BareClient
) {
  const tree = parse(script, { positions: true, context });
  let offset = 0;

  const assets: [
    atruleName: string | void,
    node: CssNode,
    url: URL,
    blob?: string
  ][] = [];

  walk(tree, function (node) {
    if (node.type === "Url")
      try {
        assets.push([
          this.atrule?.name,
          node,
          new URL(node.value as unknown as string, win[location]),
        ]);
      } catch (err) {
        console.error(err);
      }
  });

  for (const asset of assets) {
    /*const raw = script.slice(
      asset[1].loc!.start.offset - offset,
      asset[1].loc!.end.offset - offset
    );*/

    let generated = "";

    if (asset[0] === "import") {
      /*replace = {
            type: "Url",
            value: <StringNode>routeCSS(resolved, url),
          };*/
      // TODO: fetch imported style
    } else {
      generated = generate({
        type: "Url",
        value: (await localizeResource(
          asset[2],
          "image",
          win,
          client
        )) as unknown as Raw,
      });
    }

    script =
      script.slice(0, asset[1].loc!.start.offset - offset) +
      generated +
      script.slice(asset[1].loc!.end.offset - offset);
    offset +=
      asset[1].loc!.end.offset - asset[1].loc!.start.offset - generated.length;
  }

  return script;
}

const redirectStatusCodes = [300, 301, 302, 303, 304, 305, 307, 308];

export default async function loadDOM(
  req: Request,
  win: Win,
  client: BareClient
) {
  // Remove any blob URIs
  win.location.reload();

  let res: BareResponseFetch;

  while (true) {
    res = await request(req, "document", client, { redirect: "manual" });
    if (redirectStatusCodes.includes(res.status)) {
      const location = new URL(res.headers.get("location") || "", req.url);
      req = new Request(location);
      continue;
    }
    break;
  }

  win[location] = new URL(res.finalURL);

  const protoDom = new DOMParser().parseFromString(
    await res.text(),
    "text/html"
  );

  const base = document.createElement("base");
  base.href = win[location].toString();
  protoDom.head.append(base);
  win.document.head.append(base.cloneNode());

  for (const link of protoDom.querySelectorAll<HTMLLinkElement>(
    "link[rel='stylesheet']"
  ))
    link.replaceWith(await simulateStyleLink(link, win, client));

  for (const link of protoDom.querySelectorAll<HTMLLinkElement>(
    "link[rel='preload']"
  ))
    link.remove();

  for (const noscript of protoDom.querySelectorAll("noscript")) {
    const fragment = new DocumentFragment();
    for (const child of noscript.children) fragment.append(child);
    noscript.replaceWith(fragment);
  }

  for (const style of protoDom.querySelectorAll("style")) {
    style.replaceWith(
      await simulateStyle(style.textContent || "", win, client)
    );
  }

  for (const script of protoDom.querySelectorAll("script")) script.remove();

  for (const anchor of protoDom.querySelectorAll("a")) {
    if (anchor.ping) anchor.ping = "";

    anchor.addEventListener("click", (event) => {
      event.preventDefault();
      const newWin = win.open(
        undefined,
        event.shiftKey
          ? "new"
          : event.ctrlKey || event.button === 1
          ? "_blank"
          : anchor.target || "_self"
      );

      if (!newWin) {
        console.error("error opening window", anchor.target, "...");
        return;
      }

      loadDOM(new Request(anchor.href), newWin as unknown as Win, client);
    });
  }

  for (const img of protoDom.querySelectorAll("img"))
    if (img.src)
      img.src = await localizeResource(img.src, "image", win, client);

  for (const node of protoDom.querySelectorAll<HTMLElement>("*[style]"))
    await rewriteStyle(node.style, win, client);

  for (const s of protoDom.querySelectorAll<
    HTMLImageElement | HTMLSourceElement
  >("img,source"))
    if (s.srcset) s.srcset = await rewriteSrcset(s.srcset, win, client);

  for (const video of protoDom.querySelectorAll("video"))
    if (video.poster)
      video.poster = await localizeResource(video.poster, "image", win, client);

  for (const form of protoDom.querySelectorAll("form"))
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = new URLSearchParams();

      for (let i = 0; i < form.elements.length; i++) {
        const node = form.elements[i] as HTMLInputElement;
        query.set(node.name, node.value);
      }

      let req: Request;

      if (form.method === "post") {
        req = new Request(form.action, {
          method: "POST",
          body: query,
        });
      } else {
        const url = new URL(form.action);
        url.search = `?${query}`;

        req = new Request(url);
      }

      loadDOM(req, win, client);
    });

  win.document.doctype?.remove();
  win.document.documentElement.remove();

  if (protoDom.doctype) win.document.append(protoDom.doctype);
  win.document.append(protoDom.documentElement);
}

async function simulateStyle(source: string, win: Win, client: BareClient) {
  const style = document.createElement("style");
  style.textContent = await modifyCSS(source, "stylesheet", win, client);
  return style;
}

async function simulateStyleLink(
  node: HTMLLinkElement,
  win: Win,
  client: BareClient
) {
  const res = await request(new Request(node.href), "style", client);
  if (!res.ok) throw new Error("Res was not ok");
  return simulateStyle(await res.text(), win, client);
}

function request(
  req: Request,
  dest: RequestDestination,
  client: BareClient,
  override?: BareFetchInit
) {
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
    ...override,
  });
}
