import { fileURLToPath } from "url";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import ESLintWebpackPlugin from "eslint-webpack-plugin";

const isProd = process.env.NODE_ENV === "production";

/**
 * @type {webpack.Configuration}
 */
const config = {
  entry: "./src/customElement.ts",
  output: {
    path: fileURLToPath(new URL("./dist/", import.meta.url)),
    filename: "spadium.js",
  },
  devtool: isProd ? "source-map" : "eval",
  mode: isProd ? "production" : "development",
  resolve: {
    fallback: { util: false },
    extensions: [".mjs", ".js", ".ts", ".tsx", ".json", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /\.m?[tj]sx?$/,
        enforce: "pre",
        use: ["source-map-loader"],
      },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "swc-loader",
          options: {
            sourceMaps: "inline",
            inlineSourcesContent: true,
            jsc: {
              target: "es2022",
              parser: { syntax: "typescript" },
              externalHelpers: true,
              transform: {
                react: {
                  pragma: "h",
                  pragmaFrag: "Fragment",
                },
              },
            },
          },
        },
      },
    ],
  },
  plugins: [new ForkTsCheckerWebpackPlugin(), new ESLintWebpackPlugin()],
};

export default config;
