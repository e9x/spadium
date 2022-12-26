import { h } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { Win } from "./proxy/win";
import openWindow, { deleteWindow } from "./proxy/hooks";
import { createBareClient } from "@tomphttp/bare-client";

export default function SpadiumProxy({
  server,
  src,
}: {
  server?: string;
  src?: string;
}) {
  const [win, setWin] = useState<Win | null>(null);

  useEffect(() => {
    if (!win || !server || !src) return;
    const abort = new AbortController();
    createBareClient(new URL(server, location.toString()), abort.signal).then(
      (client) => openWindow(new Request(src), "_self", win, client, "replace")
    );
    return () => {
      deleteWindow(win);
      abort.abort();
    };
  }, [server, src, win]);

  return (
    <iframe
      style={{
        width: "100%",
        height: "100%",
      }}
      frameBorder="0"
      onLoad={(event) =>
        setWin(event.currentTarget.contentWindow as Win | null)
      }
    />
  );
}
