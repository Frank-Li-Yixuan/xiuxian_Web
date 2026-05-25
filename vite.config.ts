import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createUiWorkbenchWriteHandler } from "./src/dev/uiWorkbenchWriteApi";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "xiuxian-ui-workbench-writer",
      apply: "serve",
      configureServer(server) {
        const writeWorkbenchFile = createUiWorkbenchWriteHandler({ projectRoot: process.cwd() });
        server.middlewares.use("/__ui-workbench/write", (request, response) => {
          if (request.method !== "POST") {
            response.statusCode = 405;
            response.end("Method not allowed");
            return;
          }

          let body = "";
          request.setEncoding("utf8");
          request.on("data", (chunk: string) => {
            body += chunk;
            if (body.length > 3_000_000) {
              response.statusCode = 413;
              response.end("Payload too large");
              request.destroy();
            }
          });
          request.on("end", () => {
            void (async () => {
              try {
                const result = await writeWorkbenchFile(JSON.parse(body) as { readonly path: string; readonly base64: string });
                response.setHeader("content-type", "application/json");
                response.end(JSON.stringify(result));
              } catch (error) {
                response.statusCode = 400;
                response.setHeader("content-type", "application/json");
                response.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
              }
            })();
          });
        });
      }
    }
  ],
  server: {
    host: "127.0.0.1",
    port: 5173
  },
  build: {
    target: "es2022"
  }
});
