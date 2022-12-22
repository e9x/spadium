import type BareClient from "@tomphttp/bare-client";
import type { BareResponseFetch } from "@tomphttp/bare-client";
import type { CssNode, Raw } from "css-tree";
import { generate, parse, walk } from "css-tree";

async function modifyCSS(
  script: string,
  location: URL,
  context = "stylesheet",
  // so we can create a blob inside the window
  win: Win,
  client: BareClient
) {
  const tree = parse(script, { positions: true, context });
  let offset = 0;

  const assets: [
    atruleName: string | void,
    node: CssNode,
    url: string,
    blob?: string
  ][] = [];

  walk(tree, function (node) {
    if (node.type === "Url")
      try {
        assets.push([
          this.atrule?.name,
          node,
          new URL(node.value as unknown as string, location).toString(),
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

    const res = await request(new Request(asset[2]), "image", client);

    if (asset[0] === "import") {
      /*replace = {
            type: "Url",
            value: <StringNode>routeCSS(resolved, url),
          };*/
      // TODO: fetch imported style
    } else
      generated = generate({
        type: "Url",
        value: win.URL.createObjectURL(await res.blob()) as unknown as Raw,
      });

    script =
      script.slice(0, asset[1].loc!.start.offset - offset) +
      generated +
      script.slice(asset[1].loc!.end.offset - offset);
    offset +=
      asset[1].loc!.end.offset - asset[1].loc!.start.offset - generated.length;
  }

  return script;
}

export type Win = typeof globalThis;

const redirectStatusCodes = [300, 301, 302, 303, 304, 305, 307, 308];

export default async function loadDOM(
  req: Request,
  win: Win,
  client: BareClient
) {
  let res: BareResponseFetch;

  while (true) {
    res = await request(req, "document", client);
    if (redirectStatusCodes.includes(res.status)) {
      const location = new URL(res.headers.get("location") || "", req.url);
      req = new Request(location);
      continue;
    }
    if (!res.ok) throw new Error("Not OK");
    break;
  }

  const location = new URL(res.finalURL);
  const protoDom = new DOMParser().parseFromString(
    await res.text(),
    "text/html"
  );

  const base = document.createElement("base");
  base.href = location.toString();
  protoDom.head.append(base);
  win.document.head.append(base.cloneNode());

  for (const link of protoDom.querySelectorAll<HTMLLinkElement>(
    "link[rel='stylesheet']"
  )) {
    link.replaceWith(await simulateStyleLink(link, location, win, client));
  }

  for (const noscript of protoDom.querySelectorAll("noscript")) {
    const fragment = new DocumentFragment();
    for (const child of noscript.children) fragment.append(child);
    noscript.replaceWith(fragment);
  }

  for (const style of protoDom.querySelectorAll("style")) {
    style.replaceWith(
      await simulateStyle(style.textContent || "", location, win, client)
    );
  }

  for (const script of protoDom.querySelectorAll("script")) script.remove();

  for (const anchor of protoDom.querySelectorAll("a"))
    anchor.addEventListener("click", (event) => {
      event.preventDefault();
      loadDOM(new Request(anchor.href), win, client);
    });

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

async function simulateStyle(
  source: string,
  location: URL,
  win: Win,
  client: BareClient
) {
  const style = document.createElement("style");
  style.textContent = await modifyCSS(
    source,
    location,
    "stylesheet",
    win,
    client
  );
  return style;
}

async function simulateStyleLink(
  node: HTMLLinkElement,
  location: URL,
  win: Win,
  client: BareClient
) {
  const res = await request(new Request(node.href), "style", client);
  if (!res.ok) throw new Error("Res was not ok");
  return simulateStyle(await res.text(), location, win, client);
}

function request(req: Request, dest: RequestDestination, client: BareClient) {
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
