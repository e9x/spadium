import type BareClient from "@tomphttp/bare-client";
import type { SrcSetDefinition } from "srcset";
import { parseSrcset, stringifySrcset } from "srcset";
import parseRefreshHeader from "./parseRefresh";
import { localizeResource, request, validProtocols } from "./request";
import {
  rewriteCSSValue,
  simulateStyle,
  simulateStyleLink,
} from "./rewriteCSS";
import type { Win } from "./win";
import {
  sTimeouts,
  sBlobUrls,
  sAbort,
  sClient,
  sIframeSrc,
  sLocation,
} from "./win";

async function openWindow(
  req: Request,
  target: string,
  win: Win,
  client: BareClient
) {
  const n = win.open(undefined, target) as Win | null;
  if (!n) return console.error("failure");
  if (sAbort in n) n[sAbort].abort();
  if (sBlobUrls in n)
    for (const url of n[sBlobUrls]) n.URL.revokeObjectURL(url);
  if (sTimeouts in n) for (const timeout of n[sTimeouts]) clearTimeout(timeout);
  // n.location.assign("about:blank");
  setTimeout(() => {
    loadDOM(req, n as unknown as Win, client);
  }, 10);
}

async function rewriteSrcset(srcset: string, win: Win) {
  const parsed = parseSrcset(srcset);
  const newSrcset: SrcSetDefinition[] = [];

  for (const src of parsed)
    newSrcset.push({
      url: await localizeResource(
        new URL(src.url, win[sLocation]),
        "image",
        win
      ),
      ...(src.density ? { density: src.density } : {}),
      ...(src.width ? { width: src.width } : {}),
    });

  return stringifySrcset(newSrcset);
}

async function rewriteStyle(style: CSSStyleDeclaration, win: Win) {
  for (let i = 0; i < style.length; i++) {
    const property = style[i];
    style.setProperty(
      property,
      await rewriteCSSValue(style.getPropertyValue(property), win)
    );
  }
}

function rewriteSVG(svg: SVGSVGElement, win: Win) {
  for (const image of svg.querySelectorAll("image")) {
    const href = image.getAttribute("xlink:href");
    if (href) {
      image.removeAttribute("xlink:href");
      localizeResource(new URL(href, win[sLocation]), "image", win).then(
        (url) => image.setAttribute("xlink:href", url)
      );
    }
  }
}

export default async function loadDOM(
  req: Request,
  win: Win,
  client: BareClient
) {
  if (!client) throw new TypeError("bad client");
  win[sAbort] = new AbortController();
  win[sClient] = client;
  win[sBlobUrls] = [];
  win[sTimeouts] = [];

  const res = await request(req, "document", win);
  // win properties may have cleared in the time it took to do an async request...
  // set them again
  // win[sClient] = client;

  win[sLocation] = new URL(res.finalURL);

  const protoDom = new DOMParser().parseFromString(
    await res.text(),
    "text/html"
  );

  const base = document.createElement("base");
  base.href = win[sLocation].toString();
  protoDom.head.append(base);
  win.document.head.append(base.cloneNode());

  for (const noscript of protoDom.querySelectorAll("noscript")) {
    const fragment = new DocumentFragment();
    for (const child of noscript.children) fragment.append(child);
    noscript.replaceWith(fragment);
  }

  const refreshHeader =
    protoDom.querySelector<HTMLMetaElement>("meta[http-equiv='refresh']")
      ?.content || res.headers.get("refresh");

  if (refreshHeader) {
    const refresh = parseRefreshHeader(refreshHeader, win);

    if (refresh)
      win[sTimeouts].push(
        win.setTimeout(
          () => openWindow(new Request(refresh.url), "_self", win, client),
          refresh.duration
        )
      );
  }

  for (const meta of protoDom.querySelectorAll("meta"))
    if (!["encoding", "content-type"].includes(meta.httpEquiv)) meta.remove();

  for (const link of protoDom.querySelectorAll<HTMLLinkElement>(
    "link[rel='stylesheet']"
  ))
    link.replaceWith(await simulateStyleLink(link, win));

  for (const link of protoDom.querySelectorAll<HTMLLinkElement>(
    "link[rel='preload']"
  ))
    link.remove();

  for (const style of protoDom.querySelectorAll("style")) {
    style.replaceWith(await simulateStyle(style.textContent || "", win));
  }

  for (const script of protoDom.querySelectorAll("script")) script.remove();

  for (const iframe of protoDom.querySelectorAll("iframe")) {
    iframe[sIframeSrc] = iframe.src;
    iframe.src = "";
    iframe.removeAttribute("sandbox");
    iframe.removeAttribute("allow");
  }

  for (const anchor of protoDom.querySelectorAll("a")) {
    if (anchor.ping) anchor.ping = "";

    anchor.addEventListener("click", async (event) => {
      event.preventDefault();

      const protocol = new URL(anchor.href).protocol;

      if (protocol === "javascript:") return;

      let winTarget = event.shiftKey
        ? "new"
        : event.ctrlKey || event.button === 1
        ? "_blank"
        : anchor.target || "_self";
      if (
        (winTarget === "_top" && win.top === window) ||
        (winTarget === "_parent" && win.parent === window)
      )
        winTarget = "_self";

      if (!validProtocols.includes(protocol))
        return win.open(anchor.href, winTarget);

      openWindow(new Request(anchor.href), winTarget, win, client);
    });
  }

  for (const img of protoDom.querySelectorAll("img"))
    if (img.src) {
      const { src } = img;
      img.src = "";
      // asynchronously load images
      localizeResource(src, "image", win).then((url) => (img.src = url));
    }

  for (const source of protoDom.querySelectorAll("source"))
    if (source.src) {
      const { src } = source;
      source.src = "";
      // asynchronously load images
      localizeResource(src, "video", win).then((url) => (source.src = url));
    }

  for (const track of protoDom.querySelectorAll("track"))
    if (track.src) {
      const { src } = track;
      track.src = "";
      // asynchronously load images
      localizeResource(src, "video", win).then((url) => (track.src = url));
    }

  for (const node of protoDom.querySelectorAll<HTMLElement>("*[style]"))
    await rewriteStyle(node.style, win);

  for (const s of protoDom.querySelectorAll<
    HTMLImageElement | HTMLSourceElement
  >("img,source"))
    if (s.srcset) {
      const { srcset } = s;
      s.srcset = "";
      rewriteSrcset(srcset, win).then((srcset) => (s.srcset = srcset));
    }

  for (const video of protoDom.querySelectorAll("video"))
    if (video.poster) {
      const { poster } = video;
      localizeResource(poster, "image", win).then(
        (url) => (video.poster = url)
      );
      video.poster = "";
    }

  for (const svg of protoDom.querySelectorAll("svg")) rewriteSVG(svg, win);

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

      loadDOM(req, win, win[sClient]);
    });

  win.document.doctype?.remove();
  win.document.documentElement.remove();

  if (protoDom.doctype) win.document.append(protoDom.doctype);
  win.document.append(protoDom.documentElement);
}
