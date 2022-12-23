import type { Win } from "./win";
import { sLocation } from "./win";

// https://www.otsukare.info/2015/03/26/refresh-http-header

export interface Refresh {
  duration: number;
  url: string;
}

const refreshRegex = /^(\d+)(?:;?\s*url=(.+)?)?$/;

export default function parseRefreshHeader(
  value: string,
  win: Win
): Refresh | void {
  const matches = value.match(refreshRegex);

  if (!matches) return;

  return {
    duration: parseInt(matches[1], 10),
    url: new URL(matches[2], win[sLocation]).toString(),
  };
}
