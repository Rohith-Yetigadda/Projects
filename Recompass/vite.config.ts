import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import compassHandler from "./api/compass.ts";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiKey = env.AI_API_KEY || process.env.AI_API_KEY || "";
  process.env.AI_API_KEY = apiKey;

  return {
    plugins: [
      react(),
      {
        name: "api-compass-dev-middleware",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith("/api/compass") && req.method === "POST") {
              let body = "";
              req.on("data", (chunk) => {
                body += chunk;
              });
              req.on("end", async () => {
                try {
                  const parsed = JSON.parse(body || "{}");
                  const fakeReq = { method: "POST", body: parsed };
                  const fakeRes = {
                    statusCode: 200,
                    setHeader: (k: string, v: string) => res.setHeader(k, v),
                    status: (code: number) => {
                      res.statusCode = code;
                      return {
                        json: (data: any) => {
                          res.setHeader("Content-Type", "application/json");
                          res.end(JSON.stringify(data));
                        },
                      };
                    },
                    json: (data: any) => {
                      res.setHeader("Content-Type", "application/json");
                      res.end(JSON.stringify(data));
                    },
                  };
                  await compassHandler(fakeReq, fakeRes);
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } else {
              next();
            }
          });
        },
      },
    ],
    define: {
      "import.meta.env.VITE_GEMINI_API_KEY": JSON.stringify(apiKey),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
