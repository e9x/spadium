import type BareClient from "@tomphttp/bare-client";

interface WinProps {
  fakeLocation: Location;
}

export type Win = typeof globalThis & WinProps;

function applyHooks(win: Win, client: BareClient) {
  /*const observer = new MutationObserver((mutations) => {
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
  });*/

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

  Object.defineProperty(win.Object.prototype, "fakeLocation", {
    get() {
      return this.location;
    },
    set(v) {
      this.location = v;
    },
  });

  Object.defineProperty(win, "parent", { value: win, configurable: true });
}

async function simulateScript(
  script: HTMLScriptElement,
  win: Win,
  client: BareClient
) {
  let source = script.textContent || "";

  console.log(script.textContent);

  if (script.src) {
    const res = await client.fetch(script.src);
    if (!res.ok) throw new TypeError("Bad res for script");
    source = `//# sourceURL=${script.src}\n${await res.text()}`;
  }

  Object.defineProperty(win.document, "currentScript", {
    value: script,
    configurable: true,
  });

  source = source.replace(/\.location/g, ".fakeLocation");
  const matches: string[] = [];

  source.replace(/[\s\S]{10}?\w+\.top[\s\S]{10}?/g, (m) => {
    matches.push(m);
    return m;
  });

  console.log(matches);

  const func = new win.Function("top", "location", source) as (
    this: Win,
    top: Win,
    location: any
  ) => void;
  func.call(win, win, win.fakeLocation);
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

  const style = document.createElement("style");
  style.textContent = source;
  win.document.head.append(style);
}

function fakeLocation(i: string, win: Win) {
  const url = new URL(i);

  const obj: Location = {
    get host() {
      return url.host;
    },
    set host(value: string) {
      url.host = value;
    },
    get hostname() {
      return url.hostname;
    },
    set hostname(value: string) {
      url.hostname = value;
    },
    get href() {
      return url.href;
    },
    set href(value: string) {
      url.href = value;
    },
    get origin() {
      return url.href;
    },
    set origin(value: string) {
      url.href = value;
    },
    get port() {
      return url.port;
    },
    set port(value: string) {
      url.port = value;
    },
    get protocol() {
      return url.protocol;
    },
    set protocol(value: string) {
      url.protocol = value;
    },
    get pathname() {
      return url.pathname;
    },
    set pathname(value: string) {
      url.pathname = value;
    },
    get hash() {
      return url.hash;
    },
    set hash(value: string) {
      url.hash = value;
    },
    get search() {
      return url.search;
    },
    set search(value: string) {
      url.search = value;
    },
    ancestorOrigins: global.location.ancestorOrigins,
    assign(url: string | URL) {
      window.open(url, "_blank");
    },
    replace(url: string | URL) {
      window.open(url, "_blank");
    },
    reload() {
      global.location.reload();
    },
    toString() {
      return url.toString();
    },
  };

  win.fakeLocation = obj;
}

export async function createDOM(url: string, win: Win, client: BareClient) {
  fakeLocation(url, win);

  applyHooks(win, client);

  const res = await client.fetch(win.fakeLocation.toString());
  if (!res.ok) throw new Error("Not OK");
  const protoDom = new DOMParser().parseFromString(
    await res.text(),
    "text/html"
  );

  win.document.body.innerHTML =
    '<link rel="icon" href="/assets/ec2c34cadd4b5f4594415127380a85e6.ico" />';

  const base = document.createElement("base");
  base.href = win.fakeLocation.toString();
  protoDom.head.append(base);
  win.document.head.append(base.cloneNode());

  const appMount = document.createElement("div");
  appMount.id = "app-mount";
  win.document.body.append(appMount);

  for (const script of protoDom.querySelectorAll("script")) {
    if (!script.textContent?.includes("document.createElement('iframe')"))
      await simulateScript(script, win, client);
  }
}
