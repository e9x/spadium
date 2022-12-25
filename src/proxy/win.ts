import type BareClient from "@tomphttp/bare-client";

export const sClient = Symbol("spadium client");
export const sAbort = Symbol("spadium abort");
export const sLocation = Symbol("spadium location");
export const sIframeSrc = Symbol("spadium iframe src");

declare global {
  interface HTMLIFrameElement {
    [sIframeSrc]: string;
  }
}

interface WinProps {
  [sAbort]: AbortController;
  [sLocation]: URL;
  [sClient]: BareClient;
}

export type Win = typeof globalThis & WinProps;
