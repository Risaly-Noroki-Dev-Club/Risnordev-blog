import site from "../site.config.mjs"

if (!/^[a-zA-Z0-9-]+$/.test(site.language)) throw new Error("Invalid language identifier")
const { default: text } = await import(`../locales/${site.language}.mjs`)
const url = new URL(site.url)
if (!["http:", "https:"].includes(url.protocol) || url.pathname !== "/" || url.search || url.hash) {
  throw new Error("site.url must be an HTTP(S) origin without a path, query or fragment")
}
site.url = url.origin
export { site, text }
export function format(key, values = {}) {
  return String(text[key]).replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match)
}
export function localize(source) {
  return source.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (typeof text[key] !== "string") throw new Error(`Unknown language key: ${key}`)
    return text[key]
  })
}
