import { createBareClient } from "@tomphttp/bare-client";
import type BareClient from "@tomphttp/bare-client";
import { h, Fragment } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import PortaProxy from "./PortaProxy";

export default function Setup() {
  const bareServer = useRef<HTMLInputElement | null>(null);
  const [bareServerURL, setBareServerURL] = useState<string | null>(
    localStorage.getItem("cached bare server")
  );
  const [bareClient, setBareClient] = useState<BareClient | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (bareServerURL === null) return;

    localStorage.setItem("cached bare server", bareServerURL);

    createBareClient(new URL(bareServerURL, global.location.toString()))
      .then((client) => setBareClient(client))
      .catch((err) => {
        setErr(String(err));
      });
  }, [bareServerURL]);

  return bareClient ? (
    <PortaProxy client={bareClient} />
  ) : (
    <>
      <h1>Spacord</h1>
      <hr />
      <form
        onSubmit={async (event) => {
          event.preventDefault();

          if (bareServer.current === null) {
            setErr(
              new TypeError("Bare server input doesn't exist.").toString()
            );
            return;
          }

          setBareServerURL(bareServer.current.value);
        }}
      >
        <h3>Proxy Settings</h3>
        <label>
          Bare server:
          <br />
          <input
            ref={bareServer}
            type="text"
            defaultValue={
              process.env.NODE_ENV === "production"
                ? ""
                : process.env.BARE_SERVER
            }
          />
        </label>
        <hr />
        <input type="submit" value="Start" />
        {err !== null && (
          <>
            <p style={{ color: "red" }}>
              An error occured when processing your submission:
            </p>
            <code>{err}</code>
            <p>
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setErr(null);
                }}
              >
                Dismiss
              </a>
            </p>
          </>
        )}
      </form>
    </>
  );
}
