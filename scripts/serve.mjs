import { createReadStream } from "node:fs"
import { realpath, stat } from "node:fs/promises"
import { createServer } from "node:http"
import { extname, join, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const publicRoot = await realpath(fileURLToPath(new URL("../public", import.meta.url)))
const host = process.env.HOST || "127.0.0.1"
const port = Number(process.env.PORT || 2201)
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8", ".xml": "application/xml; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".avif": "image/avif", ".ico": "image/x-icon",
}

createServer(async (req, res) => {
  const send = (status, message) => {
    res.writeHead(status, { "content-type": "text/plain; charset=utf-8" })
    res.end(req.method === "HEAD" ? undefined : message)
  }
  if (!["GET", "HEAD"].includes(req.method)) {
    res.setHeader("allow", "GET, HEAD")
    return send(405, "Method not allowed")
  }
  try {
    const url = new URL(req.url, "http://localhost")
    let pathname
    try { pathname = decodeURIComponent(url.pathname) } catch { return send(400, "Invalid path") }
    let path = resolve(publicRoot, `.${pathname}`)
    const inside = value => value === publicRoot || value.startsWith(publicRoot + sep)
    if (!inside(path) || pathname.includes("\0")) return send(404, "Not found")
    if ((await stat(path)).isDirectory()) {
      if (!url.pathname.endsWith("/")) {
        res.writeHead(308, { location: `${url.pathname}/${url.search}` })
        return res.end()
      }
      path = join(path, "index.html")
    }
    path = await realpath(path)
    if (!inside(path)) return send(404, "Not found")
    const info = await stat(path)
    if (!info.isFile()) return send(404, "Not found")
    res.writeHead(200, {
      "content-type": types[extname(path)] || "application/octet-stream",
      "content-length": info.size,
      "cache-control": "no-cache",
      "x-content-type-options": "nosniff",
    })
    if (req.method === "HEAD") return res.end()
    createReadStream(path).on("error", error => res.destroy(error)).pipe(res)
  } catch (error) {
    if (["ENOENT", "ENOTDIR"].includes(error.code)) return send(404, "Not found")
    console.error(error)
    send(500, "Internal server error")
  }
}).listen(port, host, () => console.log(`Risnordev-blog listening on http://${host}:${port}`))
