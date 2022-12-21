import HtmlInlineScriptPlugin from "html-inline-script-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import createBareServer from "@tomphttp/bare-server-node";
import webpack from "webpack";
import { fileURLToPath } from "url";

/**
 * @typedef {webpack.Configuration & {devServer: import('webpack-dev-server').Configuration}} CompleteConfig
 */

const devServerBare = "/bare/";

const isProd = process.env.NODE_ENV === "production";

process.env.NODE_ENV = isProd ? "production" : "development";

process.env.BARE_SERVER = devServerBare;

/**
 * @type {CompleteConfig}
 */
const config = {
  entry: "./src/index.ts",
  output: {
    path: fileURLToPath(new URL("./dist/", import.meta.url)),
    filename: "spacord.js",
  },
  mode: process.env.NODE_ENV,
  devServer: {
    setupMiddlewares: (middlewares, devServer) => {
      devServer.app.get("/setup-middleware/some/path", (_, response) => {
        response.send("setup-middlewares option GET");
      });

      const bare = createBareServer(devServerBare);

      devServer.app.use((req, res, next) => {
        if (bare.shouldRoute(req)) bare.routeRequest(req, res);
        else next();
      });

      return middlewares;
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: "swc-loader",
          options: {
            jsc: {
              parser: {
                syntax: "typescript",
              },
            },
          },
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: fileURLToPath(new URL("./index.html", import.meta.url)),
    }),
    // for production builds & distribution
    isProd && new HtmlInlineScriptPlugin(),
    new webpack.EnvironmentPlugin("NODE_ENV", "BARE_SERVER"),
  ].filter(Boolean),
};

export default config;
