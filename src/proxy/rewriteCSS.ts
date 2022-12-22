import type { CssNode, Raw } from "css-tree";
import { generate, parse, walk } from "css-tree";
import { localizeResource, request } from "./request";
import type { Win } from "./win";
import { sLocation } from "./win";

async function rewriteCSS(
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
          win
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

export async function simulateStyle(source: string, win: Win) {
  const style = document.createElement("style");
  style.textContent = await rewriteCSS(source, "stylesheet", win);
  return style;
}

export async function simulateStyleLink(node: HTMLLinkElement, win: Win) {
  const res = await request(new Request(node.href), "style", win);
  if (!res.ok) throw new Error("Res was not ok");
  return simulateStyle(await res.text(), win);
}

export async function rewriteCSSValue(value: string, win: Win) {
  return rewriteCSS(value, "value", win);
}
