import { createBareClient } from "@tomphttp/bare-client";
import type BareClient from "@tomphttp/bare-client";
import { h, Fragment } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import PortaProxy from "./PortaProxy";

export default function Setup() {
  const bareServer = useRef<HTMLInputElement | null>(null);
  const websiteURL = useRef<HTMLInputElement | null>(null);
  const [err, setErr] = useState<[at: string, err: string] | null>(null);
  const [bareServerURL, setBareServerURL] = useState<string | null>(null);
  const [bareClient, setBareClient] = useState<BareClient | null>(null);

  const [req, setReq] = useState<Request | null>(null);

  useEffect(() => {
    if (bareServerURL === null) return;

    createBareClient(new URL(bareServerURL, global.location.toString()))
      .then((client) => {
        setBareClient(client);
        localStorage.setItem("cached bare server", bareServerURL);
      })
      .catch((err) => {
        setErr(["Connecting to Bare server", String(err)]);
        localStorage.removeItem("cached bare server");
      });
  }, [bareServerURL]);

  return bareClient && req ? (
    <PortaProxy req={req} client={bareClient} />
  ) : (
    <>
      <h1>Spadium</h1>
      <hr />
      <form
        onSubmit={async (event) => {
          event.preventDefault();

          if (bareServer.current === null)
            return setErr([
              "Processing submission",
              new TypeError("Bare server URL input doesn't exist.").toString(),
            ]);
          if (websiteURL.current === null)
            return setErr([
              "Processing submission",
              new TypeError("Website URL input doesn't exist.").toString(),
            ]);

          setBareServerURL(bareServer.current.value);
          setReq(new Request(websiteURL.current.value));
        }}
      >
        <h3>Proxy Settings</h3>
        <label>
          Bare server:
          <br />
          <input
            ref={bareServer}
            onInput={(event) => {
              try {
                new URL(event.currentTarget.value, location.toString());
                event.currentTarget.setCustomValidity("");
              } catch (err) {
                event.currentTarget.setCustomValidity("Invalid URL");
              }
            }}
            type="text"
            defaultValue={
              localStorage.getItem("cached bare server") ||
              (process.env.NODE_ENV === "production"
                ? ""
                : process.env.BARE_SERVER)
            }
          />
        </label>
        <hr />
        <h3>Website Settings</h3>
        <label>
          URL:
          <br />
          <input
            ref={websiteURL}
            onInput={(event) => {
              try {
                new URL(event.currentTarget.value);
                event.currentTarget.setCustomValidity("");
              } catch (err) {
                event.currentTarget.setCustomValidity("Invalid URL");
              }
            }}
            type="text"
            defaultValue="https://www.google.com/"
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
          </>
        )}
      </form>
    </>
  );
}
