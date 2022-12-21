declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "production" | "development";
    BARE_SERVER: string;
  }
}
