const http = require("http");
const fs = require("fs");
const path = require("path");
const dir = __dirname;

if (process.argv[2] === "bump") {
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".html"))) {
    const p = path.join(dir, f);
    let s = fs.readFileSync(p, "utf8");
    if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
    const m = s.match(/styles\.css\?v=(\d+)/);
    if (!m) continue;
    fs.writeFileSync(p, s.replace(/styles\.css\?v=\d+/g, "styles.css?v=" + (Number(m[1]) + 1)), "utf8");
    console.log(f, m[1], "->", Number(m[1]) + 1);
  }
  process.exit(0);
}

const types = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp", ".json": "application/json" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const f = path.join(dir, p);
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); res.end("nf"); return; }
    res.writeHead(200, { "Content-Type": types[path.extname(f).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
}).listen(8851, () => console.log("up 8851"));
