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
import { sClient, sIframeSrc, sLocation } from "./win";

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

async function rewriteSVG(svg: SVGSVGElement, win: Win) {
  for (const image of svg.querySelectorAll("image")) {
    const href = image.getAttribute("xlink:href");
    if (href)
      image.setAttribute(
        "xlink:href",
        await localizeResource(new URL(href, win[sLocation]), "image", win)
      );
  }
}

export default async function loadDOM(
  req: Request,
  win: Win,
  client: BareClient
) {
  win[sClient] = client;

  const res = await request(req, "document", win);

  win[sLocation] = new URL(res.finalURL);

  const protoDom = new DOMParser().parseFromString(
    await res.text(),
    "text/html"
  );

  const base = document.createElement("base");
  base.href = win[sLocation].toString();
  protoDom.head.append(base);
  win.document.head.append(base.cloneNode());

  const refreshHeader =
    protoDom.querySelector<HTMLMetaElement>("meta[http-equiv='refresh']")
      ?.content || res.headers.get("refresh");

  if (refreshHeader) {
    const refresh = parseRefreshHeader(refreshHeader, win);

    if (refresh)
      win.setTimeout(() => {
        const newWin = win.open("about:blank", "_self");
        if (!newWin) return console.error("error opening window");
        loadDOM(
          new Request(refresh.url),
          newWin as unknown as Win,
          win[sClient]
        );
      }, refresh.duration);
  }

  for (const link of protoDom.querySelectorAll<HTMLLinkElement>(
    "link[rel='stylesheet']"
  ))
    link.replaceWith(await simulateStyleLink(link, win));

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

    anchor.addEventListener("click", (event) => {
      event.preventDefault();

      const protocol = new URL(anchor.href).protocol;

      if (protocol === "javascript:") return;

      const winTarget = event.shiftKey
        ? "new"
        : event.ctrlKey || event.button === 1
        ? "_blank"
        : anchor.target || "_self";

      if (!validProtocols.includes(protocol))
        return win.open(anchor.href, winTarget);

      const newWin = win.open("about:blank", winTarget);
      if (!newWin) return console.error("error opening window", anchor.target);
      loadDOM(new Request(anchor.href), newWin as unknown as Win, win[sClient]);
    });
  }

  for (const img of protoDom.querySelectorAll("img"))
    if (img.src) img.src = await localizeResource(img.src, "image", win);

  for (const node of protoDom.querySelectorAll<HTMLElement>("*[style]"))
    await rewriteStyle(node.style, win);

  for (const s of protoDom.querySelectorAll<
    HTMLImageElement | HTMLSourceElement
  >("img,source"))
    if (s.srcset) s.srcset = await rewriteSrcset(s.srcset, win);

  for (const video of protoDom.querySelectorAll("video"))
    if (video.poster)
      video.poster = await localizeResource(video.poster, "image", win);

  for (const svg of protoDom.querySelectorAll("svg"))
    await rewriteSVG(svg, win);

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
