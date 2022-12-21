import { h, Fragment } from "preact";
import type BareClient from "@tomphttp/bare-client";

export default function PortaProxy({ client }: { client: BareClient }) {
  console.log(client);
  return (
    <>
      <h1>Porta Proxy will now load.</h1>
    </>
  );
}
