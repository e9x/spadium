import type { CssLocation } from "css-tree";
import walk from "css-tree/walker";
import parse from "css-tree/parser";
import { localizeResource, request } from "./request";
import type { Win } from "./win";
import { sLocation } from "./win";

async function flattenCSS(script: string, win: Win) {
  const tree = parse(script, { positions: true });
  const assets: [loc: CssLocation, url: URL][] = [];

  walk(tree, function (node) {
    if (node.type === "Url" && this.atrule?.name === "import")
      try {
        assets.push([
          this.atrule.loc!,
          new URL(node.value as unknown as string, win[sLocation]),
        ]);
      } catch (err) {
        console.error(err);
      }
  });

  let offset = 0;

  for (const asset of assets) {
    const res = await request(new Request(asset[1]), "style", win);
    const generated = await flattenCSS(await res.text(), win);

    script =
      script.slice(0, asset[0].start.offset - offset) +
      generated +
      script.slice(asset[0].end.offset - offset);
    offset += asset[0].end.offset - asset[0].start.offset - generated.length;
  }

  return script;
}

async function* rewriteCSS(
  script: string,
  context: string,
  // so we can create a blob inside the window
  win: Win
) {
  if (context === "stylesheet") script = await flattenCSS(script, win);

  const tree = parse(script, {
    positions: true,
    context,
  });

  const assets: [loc: CssLocation, url: URL][] = [];

  walk(tree, (node) => {
    if (node.type === "Url")
      try {
        assets.push([
          node.loc!,
          new URL(node.value as unknown as string, win[sLocation]),
        ]);
      } catch (err) {
        console.error(err);
      }
  });

  let offset = 0;

  for (const asset of assets) {
    const length = asset[0].end.offset - asset[0].start.offset;
    script =
      script.slice(0, asset[0].start.offset - offset) +
      // easy loading laceholder
      " ".repeat(length) +
      script.slice(asset[0].end.offset - offset);
  }

  yield script;

  for (const asset of assets) {
    const generated = `url(${CSS.escape(
      await localizeResource(asset[1], "image", win)
    )})`;

    script =
      script.slice(0, asset[0].start.offset - offset) +
      generated +
      script.slice(asset[0].end.offset - offset);
    offset += asset[0].end.offset - asset[0]!.start.offset - generated.length;

    yield script;
  }

  return script;
}

export async function simulateStyle(script: string, win: Win) {
  const style = document.createElement("style");
  const it = rewriteCSS(script, "stylesheet", win);
  // first result is parsed style without external links
  style.textContent = (await it.next()).value!;

  (async () => {
    for await (const value of it) style.textContent = value;
  })();

  return style;
}

export async function simulateStyleLink(node: HTMLLinkElement, win: Win) {
  const res = await request(new Request(node.href), "style", win);
  return await simulateStyle(await res.text(), win);
}

export async function rewriteStyle(style: CSSStyleDeclaration, win: Win) {
  for (let i = 0; i < style.length; i++) {
    const name = style[i];
    const it = rewriteCSS(style.getPropertyValue(name), "value", win);

    style.setProperty(name, (await it.next()).value!);

    (async () => {
      for await (const value of it) style.setProperty(name, value);
    })();
  }
}
