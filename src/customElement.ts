import register from "preact-custom-element";
import SpadiumProxy from "./SpadiumProxy";

register(SpadiumProxy, "spadium-proxy", ["src", "server"]);
