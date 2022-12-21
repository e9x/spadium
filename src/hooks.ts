import type BareClient from "@tomphttp/bare-client";

export type Win = typeof globalThis;

function applyHooks(win: Win, client: BareClient) {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof win.HTMLScriptElement) {
          console.log("DETECT");
          node.remove();
          simulateScript(node, win, client);
        }
      }
    }
  });

  observer.observe(win.document, {
    childList: true,
    subtree: true,
  });

  win.document.head.appendChild = (node) => {
    if (node instanceof win.HTMLScriptElement) {
      simulateScript(node, win, client);
    } else if (node instanceof win.HTMLLinkElement) {
      if (node.rel === "stylesheet") simulateCSS(node, win, client);
    } else if (node instanceof win.HTMLStyleElement) {
      simulateCSS(node, win, client);
    } else {
      console.log(node.nodeName, "appent");
    }

    return node;
  };
}

async function simulateScript(
  script: HTMLScriptElement,
  win: Win,
  client: BareClient
) {
  let source = script.textContent || "";

  if (script.src) {
    const res = await client.fetch(script.src);
    if (!res.ok) throw new TypeError("Bad res for script");
    source = `//# sourceURL=${script.src}\n${await res.text()}`;
  }

  Object.defineProperty(win.document, "currentScript", {
    value: script,
    configurable: true,
  });

  win.eval(source);
}

async function simulateCSS(
  script: HTMLStyleElement | HTMLLinkElement,
  win: Win,
  client: BareClient
) {
  let source = (script instanceof HTMLStyleElement && script.textContent) || "";

  if (script instanceof HTMLLinkElement) {
    const res = await client.fetch(script.href);
    if (!res.ok) throw new TypeError("Bad res for script");
    source = `/*# sourceURL=${script.href}*/${await res.text()}`;
  }

  win.eval(source);
}

export async function createDOM(url: string, win: Win, client: BareClient) {
  applyHooks(win, client);
  const res = await client.fetch(url);
  if (!res.ok) throw new Error("Not OK");
  const protoDom = new DOMParser().parseFromString(
    await res.text(),
    "text/html"
  );

  const base = document.createElement("base");
  base.href = url;
  protoDom.head.append(base);
  win.document.head.append(base.cloneNode());

  for (const script of protoDom.querySelectorAll("script")) {
    if (!script.textContent?.includes("document.createElement('iframe')"))
      simulateScript(script, win, client);
  }

  const appMount = document.createElement("div");
  appMount.id = "app-mount";
  win.document.body.append(appMount);
}
