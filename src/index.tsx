import { render, h } from "preact";
import Setup from "./Setup";

const root = document.getElementById("root");
if (!root) throw new TypeError("Unable to find root.");
render(<Setup />, root);
