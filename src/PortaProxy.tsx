import { h, Fragment } from "preact";
import type BareClient from "@tomphttp/bare-client";
import { useEffect, useState } from "preact/hooks";
import type { Win } from "./hooks";
import { createDOM } from "./hooks";

export default function PortaProxy({ client }: { client: BareClient }) {
  const [win, setWin] = useState<Win | null>(null);

  useEffect(() => {
    if (!win) return;
    createDOM("https://discord.com/login", win, client);
  }, [client, win]);

  return (
    <>
      {!win && <h1>PortaProxy will now load.</h1>}
      <iframe
        style={{ border: "none", width: "700px", height: "700px" }}
        onLoad={(event) =>
          setWin(event.currentTarget.contentWindow as Win | null)
        }
      />
    </>
  );
}
