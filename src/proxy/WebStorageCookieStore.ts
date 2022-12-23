/*
 * Adapted from https://github.com/expo/tough-cookie-web-storage-store/blob/master/WebStorageCookieStore.js
 *
 * Copyright (c) 2016 Exponent
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Cookie, Store, permuteDomain } from "tough-cookie";

const STORE_KEY = "__cookieStore__";

export default class WebStorageCookieStore extends Store implements Store {
  constructor() {
    super();
    this.synchronous = true;
  }

  findCookie(
    domain: any,
    path: any,
    key: any,
    callback: (arg0: null, arg1: Cookie | null) => void
  ) {
    const store = this._readStore();
    // get(store, [domain, path, key], null);
    const cookie = store[domain]?.[path]?.[key] ?? null;
    callback(null, Cookie.fromJSON(cookie));
  }

  findCookies(
    domain: string,
    path: string,
    allowSpecialUseDomain: boolean,
    cb: (err: Error | null, cookie: Cookie[]) => void
  ) {
    if (!domain) return void cb(null, []);

    const cookies: string[] = [];
    const store = this._readStore();
    const domains = permuteDomain(domain, allowSpecialUseDomain) || [domain];
    for (const domain of domains) {
      if (!store[domain]) continue;

      let matchingPaths = Object.keys(store[domain]);
      if (path !== null) {
        matchingPaths = matchingPaths.filter((cookiePath) =>
          this._isOnPath(cookiePath, path)
        );
      }

      for (const path of matchingPaths) {
        cookies.push(...(Object.values(store[domain][path]) as string[]));
      }
    }

    const newCookies = cookies
      .map((cookie) => Cookie.fromJSON(cookie))
      .filter(Boolean) as Cookie[];
    cb(null, newCookies);
  }

  /**
   * Returns whether `cookiePath` is on the given `urlPath`
   */
  _isOnPath(cookiePath: string, urlPath: string) {
    if (!cookiePath) {
      return false;
    }

    if (cookiePath === urlPath) {
      return true;
    }

    if (!urlPath.startsWith(cookiePath)) {
      return false;
    }

    if (
      cookiePath[cookiePath.length - 1] !== "/" &&
      urlPath[cookiePath.length] !== "/"
    ) {
      return false;
    }
    return true;
  }

  putCookie(cookie: Cookie, callback: (arg0: null) => void) {
    const store = this._readStore();
    if (!(cookie.domain! in store)) store[cookie.domain!] = {};
    if (!(cookie.path! in store[cookie.domain!]))
      store[cookie.domain!][cookie.path!] = {};
    store[cookie.domain!][cookie.path!][cookie.key] = cookie;
    // set(store, [cookie.domain, cookie.path, cookie.key], cookie);
    this._writeStore(store);
    callback(null);
  }

  updateCookie(oldCookie: any, newCookie: any, callback: any) {
    this.putCookie(newCookie, callback);
  }

  removeCookie(
    domain: string | number,
    path: string | number,
    key: string | number,
    callback: (arg0: null) => void
  ) {
    const store = this._readStore();
    if (store?.[domain]?.[path]) delete store[domain][path][key];
    // unset(store, [domain, path, key]);
    this._writeStore(store);
    callback(null);
  }

  removeCookies(
    domain: string | number,
    path: string | number | null,
    callback: (arg0: null) => void
  ) {
    const store = this._readStore();
    if (path === null) {
      delete store[domain];
      // unset(store, [domain]);
    } else {
      delete store[domain][path];
      // unset(store, [domain, path]);
    }
    this._writeStore(store);
    callback(null);
  }

  getAllCookies(callback: (arg0: null, arg1: Cookie[]) => void) {
    const cookies: string[] = [];
    const store = this._readStore();
    for (const domain of Object.keys(store)) {
      for (const path of Object.keys(store[domain])) {
        cookies.push(...Object.values(store[domain][path] as string));
      }
    }

    const newCookies = cookies
      .map((cookie) => Cookie.fromJSON(cookie))
      .filter(Boolean) as Cookie[];
    newCookies.sort(
      (c1, c2) => (c1.creationIndex || 0) - (c2.creationIndex || 0)
    );
    callback(null, newCookies);
  }

  _readStore() {
    if (!(STORE_KEY in localStorage))
      localStorage[STORE_KEY] = JSON.stringify({});
    return JSON.parse(localStorage[STORE_KEY]);
  }

  _writeStore(store: any) {
    localStorage[STORE_KEY] = JSON.stringify(store);
  }
}
