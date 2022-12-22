import { h, Fragment } from "preact";
import type BareClient from "@tomphttp/bare-client";
import { useEffect, useState } from "preact/hooks";
import type { Win } from "./hooks";
import loadDOM from "./hooks";

export default function PortaProxy({ client }: { client: BareClient }) {
  const [win, setWin] = useState<Win | null>(null);

  useEffect(() => {
    if (!win) return;
    loadDOM("https://www.google.com/", win, client);
  }, [client, win]);

  return (
    <>
      {!win && <h1>PortaProxy will now load.</h1>}
      <iframe
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          border: "none",
          width: "100vw",
          height: "100vh",
        }}
        onLoad={(event) =>
          setWin(event.currentTarget.contentWindow as Win | null)
        }
      />
    </>
  );
}
