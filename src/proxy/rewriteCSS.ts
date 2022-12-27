import type { CssNode } from "css-tree";
import { parse, walk } from "css-tree";
import { localizeResource, request } from "./request";
import type { Win } from "./win";
import { sLocation } from "./win";

async function* rewriteCSS(
  script: string,
  context: string,
  // so we can create a blob inside the window
  win: Win
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
          new URL(node.value as unknown as string, win[sLocation]),
        ]);
      } catch (err) {
        console.error(err);
      }
  });

  for (const asset of assets) {
    const length = asset[1].loc!.end.offset - asset[1].loc!.start.offset;
    script =
      script.slice(0, asset[1].loc!.start.offset - offset) +
      // easy loading laceholder
      " ".repeat(length) +
      script.slice(asset[1].loc!.end.offset - offset);
  }

  yield script;

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
      generated = `url(${CSS.escape(
        await localizeResource(asset[2], "image", win)
      )})`;
    }

    script =
      script.slice(0, asset[1].loc!.start.offset - offset) +
      generated +
      script.slice(asset[1].loc!.end.offset - offset);
    offset +=
      asset[1].loc!.end.offset - asset[1].loc!.start.offset - generated.length;

    yield script;
  }

  return script;
}

export async function simulateStyle(
  script: string,
  win: Win
): Promise<[HTMLStyleElement, AsyncGenerator<string, string, unknown>]> {
  const style = document.createElement("style");
  const it = rewriteCSS(script, "stylesheet", win);
  // first result is parsed style without external links
  style.textContent = (await it.next()).value!;
  // receiver needs to continue the updating
  return [style, it];
}

export async function simulateStyleLink(node: HTMLLinkElement, win: Win) {
  const res = await request(new Request(node.href), "style", win);
  return await simulateStyle(await res.text(), win);
}

export async function rewriteStyle(
  value: string,
  win: Win
): Promise<[string, AsyncGenerator<string, string, unknown>]> {
  const it = rewriteCSS(value, "declarationList", win);
  // first result is parsed style without external links
  const newValue = (await it.next()).value!;
  return [newValue, it];
}
