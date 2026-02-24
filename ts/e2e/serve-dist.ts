/**
 * Minimal static file server for E2E tests.
 * Serves the dist/ directory on the port specified by PORT env (default 3123).
 */
import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";

const PORT = Number(process.env.PORT ?? 3123);
const ROOT = path.resolve(import.meta.dirname, "..", "..", "dist");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(new URL(req.url ?? "/", `http://localhost:${PORT}`).pathname);
  let filePath = path.join(ROOT, urlPath);

  // Serve index.html for directories
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath);
  const mime = MIME[ext] ?? "application/octet-stream";
  res.writeHead(200, { "Content-Type": mime });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Serving ${ROOT} on http://localhost:${PORT}`);
});
