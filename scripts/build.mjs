import { mkdir, readdir, readFile, writeFile, cp, rm } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { site, text, format, localize } from "./config.mjs"

const SITE_TITLE = text.siteTitle
const SITE_DESCRIPTION = text.siteDescription
const SITE_URL = site.url
const NAV_ITEMS = [
  { key: "posts", href: "/posts/", label: text.posts },
  { key: "about", href: "/about/", label: text.about },
]

const root = fileURLToPath(new URL("..", import.meta.url))
const contentDir = join(root, "content")
const postsDir = join(contentDir, "posts")
const mediaDir = join(contentDir, "media")
const publicDir = join(root, "public")

const postSources = await collectPostSources()
const posts = []
for (const source of postSources) {
  const raw = await readFile(source.path, "utf8")
  const { meta, body } = parseFrontmatter(raw)
  const slug = source.slug
  const title = meta.title ?? titleFromMarkdown(body) ?? slug
  const description = meta.description ?? excerptFromMarkdown(body)
  const category = meta.category || firstFromList(meta.categories)
  const tags = listFromMeta(meta.tags)

  posts.push({
    slug,
    url: `/posts/${slug}/`,
    title,
    date: meta.date ?? "",
    description,
    body,
    category: category || text.unfiled,
    tags,
    cover: meta.cover || "",
    coverWidth: meta.coverWidth || "",
    coverHeight: meta.coverHeight || "",
    featured: isTruthy(meta.featured),
    assetDir: source.assetDir,
  })
}

posts.sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.title.localeCompare(b.title))
linkAdjacentPosts(posts)

const tagsMap = buildTermMap(posts, "tags")
const categoriesMap = buildTermMap(posts, "category")
const archiveGroups = groupPostsByYear(posts)

const indexRaw = existsSync(join(contentDir, "index.md")) ? localize(await readFile(join(contentDir, "index.md"), "utf8")) : `# ${text.homeHeading}\n\n${text.homeIntro}`
const aboutRaw = existsSync(join(contentDir, "about.md")) ? localize(await readFile(join(contentDir, "about.md"), "utf8")) : text.aboutBody
const guestbookRaw = existsSync(join(contentDir, "guestbook.md")) ? localize(await readFile(join(contentDir, "guestbook.md"), "utf8")) : text.guestbookBody

// Read and validate the language pack and source pages before replacing output.
await rm(publicDir, { recursive: true, force: true })
await mkdir(publicDir, { recursive: true })
await mkdir(join(publicDir, "posts"), { recursive: true })
await mkdir(join(publicDir, "tags"), { recursive: true })
await mkdir(join(publicDir, "categories"), { recursive: true })
await mkdir(join(publicDir, "archives"), { recursive: true })

await writeHtml(join(publicDir, "index.html"), renderHome(indexRaw, posts, tagsMap))
await writeHtml(join(publicDir, "posts", "index.html"), renderPostsIndex(posts))
await writeHtml(join(publicDir, "archives", "index.html"), renderArchives(archiveGroups))
await writeHtml(join(publicDir, "tags", "index.html"), renderTermsIndex(text.tagsTitle, text.tagsDescription, tagsMap, "tags"))
await writeHtml(join(publicDir, "categories", "index.html"), renderTermsIndex(text.categoriesTitle, text.categoriesDescription, categoriesMap, "categories"))

await mkdir(join(publicDir, "about"), { recursive: true })
await writeHtml(join(publicDir, "about", "index.html"), renderPage(text.aboutTitle, markdown(aboutRaw).html, {
  description: text.aboutDescription,
  bodyClass: "post-page about-page",
  active: "about",
  insideArticle: renderContactBlock(),
}))

await mkdir(join(publicDir, "guestbook"), { recursive: true })
await writeHtml(join(publicDir, "guestbook", "index.html"), renderPage(text.guestbookTitle, markdown(guestbookRaw).html, {
  description: text.guestbookDescription,
  bodyClass: "post-page guestbook-page",
  active: "guestbook",
  afterArticle: utterancesComments({ label: text.guestbookLabel, title: text.guestbook, intro: text.guestbookIntro, issueTerm: "title" }),
}))

for (const [tag, taggedPosts] of Object.entries(tagsMap)) {
  const outDir = join(publicDir, "tags", slugify(tag))
  await mkdir(outDir, { recursive: true })
  await writeHtml(join(outDir, "index.html"), renderTermPage(text.tag, tag, taggedPosts, "tags"))
}

for (const [category, categoryPosts] of Object.entries(categoriesMap)) {
  const outDir = join(publicDir, "categories", slugify(category))
  await mkdir(outDir, { recursive: true })
  await writeHtml(join(outDir, "index.html"), renderTermPage(text.category, category, categoryPosts, "categories"))
}

for (const post of posts) {
  const outDir = join(publicDir, "posts", post.slug)
  await mkdir(outDir, { recursive: true })
  if (post.assetDir) await copyPostAssets(post.assetDir, outDir)
  const rendered = markdown(post.body, { withToc: true })
  await writeHtml(join(outDir, "index.html"), renderPost(post, rendered))
}

await writeFile(join(publicDir, "feed.xml"), renderFeed(posts), "utf8")
await writeFile(join(publicDir, "manifest.webmanifest"), renderManifest(), "utf8")

if (existsSync(join(root, "assets"))) await cp(join(root, "assets"), join(publicDir, "assets"), { recursive: true, filter: path => !path.endsWith(".DS_Store") })
await mkdir(join(publicDir, "assets"), { recursive: true })
await writeFile(join(publicDir, "assets", "language.js"), `window.blogLanguage = ${JSON.stringify(text).replace(/</g, "\\u003c")};\n`, "utf8")
if (existsSync(mediaDir)) await cp(mediaDir, join(publicDir, "media"), { recursive: true, filter: path => !path.endsWith(".DS_Store") })

async function collectPostSources() {
  const entries = await readdir(postsDir, { withFileTypes: true })
  const sources = []

  for (const entry of entries) {
    const fullPath = join(postsDir, entry.name)
    if (entry.isFile() && entry.name.endsWith(".md")) {
      sources.push({ path: fullPath, slug: entry.name.replace(/\.md$/, ""), assetDir: null })
      continue
    }

    const indexPath = join(fullPath, "index.md")
    if (entry.isDirectory() && existsSync(indexPath)) {
      sources.push({ path: indexPath, slug: entry.name, assetDir: fullPath })
    }
  }

  return sources
}

async function copyPostAssets(sourceDir, outDir) {
  const entries = await readdir(sourceDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === ".DS_Store" || (entry.isFile() && entry.name === "index.md")) continue
    const source = join(sourceDir, entry.name)
    const target = join(outDir, entry.name)
    await cp(source, target, { recursive: true })
  }
}

function parseFrontmatter(raw) {
  if (!raw.startsWith("---\n")) return { meta: {}, body: raw }
  const end = raw.indexOf("\n---", 4)
  if (end === -1) return { meta: {}, body: raw }
  const yaml = raw.slice(4, end).trim()
  const body = raw.slice(end + 4).trimStart()
  const meta = {}

  for (const line of yaml.split(/\r?\n/)) {
    const idx = line.indexOf(":")
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "")
    meta[key] = value
  }

  return { meta, body }
}

function titleFromMarkdown(body) {
  return body.split(/\r?\n/).find((line) => line.startsWith("# "))?.slice(2).trim()
}

function excerptFromMarkdown(body) {
  return body
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[>*_`#-]/g, " ")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
}

function listFromMeta(value) {
  if (!value) return []
  const normalized = String(value).trim().replace(/^\[|\]$/g, "")
  return normalized
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function firstFromList(value) {
  return listFromMeta(value)[0] || ""
}

function isTruthy(value) {
  return /^(true|1|yes|on)$/i.test(String(value || ""))
}

function linkAdjacentPosts(posts) {
  for (let i = 0; i < posts.length; i++) {
    posts[i].next = posts[i - 1] || null
    posts[i].prev = posts[i + 1] || null
  }
}

function buildTermMap(posts, key) {
  const map = {}

  for (const post of posts) {
    const values = key === "category" ? [post.category] : post[key]
    for (const value of values) {
      if (!value) continue
      map[value] ||= []
      map[value].push(post)
    }
  }

  return Object.fromEntries(
    Object.entries(map).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
  )
}

function groupPostsByYear(posts) {
  const groups = {}

  for (const post of posts) {
    const year = String(post.date || "").slice(0, 4) || text.unknownYear
    groups[year] ||= []
    groups[year].push(post)
  }

  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

function markdown(src, options = {}) {
  const lines = src.replace(/\r\n/g, "\n").split("\n")
  const out = []
  const toc = []
  let paragraph = []
  let inCode = false
  let code = []
  let codeLang = ""
  let list = []

  const flushParagraph = () => {
    if (!paragraph.length) return
    out.push(`<p>${inline(paragraph.join("\n"))}</p>`)
    paragraph = []
  }

  const flushList = () => {
    if (!list.length) return
    out.push(`<ul>${list.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`)
    list = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (/^<!--.*-->$/.test(trimmed)) continue

    if (trimmed.startsWith("```")) {
      if (inCode) {
        out.push(`<pre><code class="language-${escapeHtml(codeLang)}">${escapeHtml(code.join("\n"))}</code></pre>`)
        inCode = false
        code = []
        codeLang = ""
      } else {
        flushParagraph()
        flushList()
        inCode = true
        codeLang = trimmed.slice(3).trim()
      }
      continue
    }

    if (inCode) {
      code.push(line)
      continue
    }

    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph()
      flushList()
      out.push("<hr>")
      continue
    }

    const next = lines[i + 1]?.trim()
    if (isTableRow(trimmed) && next && isTableSeparator(next)) {
      flushParagraph()
      flushList()
      const headers = splitTable(trimmed)
      i += 2
      const rows = []
      while (i < lines.length && isTableRow(lines[i].trim())) {
        rows.push(splitTable(lines[i].trim()))
        i++
      }
      i--
      out.push(renderTable(headers, rows))
      continue
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed)
    if (heading) {
      flushParagraph()
      flushList()
      const depth = heading[1].length
      const text = stripInlineTokens(heading[2])
      const id = slugify(text)
      if (options.withToc && depth >= 2 && depth <= 3) toc.push({ depth, text, id })
      out.push(`<h${depth} id="${id}">${inline(heading[2])}</h${depth}>`)
      continue
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      flushParagraph()
      list.push(trimmed.replace(/^[-*+]\s+/, ""))
      continue
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      flushParagraph()
      list.push(trimmed.replace(/^\d+[.)]\s+/, ""))
      continue
    }

    if (trimmed.startsWith("> ")) {
      flushParagraph()
      flushList()
      out.push(`<blockquote>${inline(trimmed.slice(2))}</blockquote>`)
      continue
    }

    paragraph.push(line)
  }

  if (inCode) out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`)
  flushParagraph()
  flushList()

  return { html: out.join("\n"), toc }
}

function isTableRow(line) {
  return line.includes("|") && splitTable(line).length >= 2
}

function isTableSeparator(line) {
  return isTableRow(line) && splitTable(line).every((cell) => /^:?-{3,}:?$/.test(cell))
}

function splitTable(line) {
  return line.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim())
}

function renderTable(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((_, i) => `<td>${inline(row[i] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
}

function inline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^\w*])\*([^*\n]+)\*(?!\w)/g, "$1<em>$2</em>")
    .replace(/(^|[^\w_])_([^_\n]+)_(?!\w)/g, "$1<em>$2</em>")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\n/g, "<br>")
}

function stripInlineTokens(text) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(^|[^\w*])\*([^*\n]+)\*(?!\w)/g, "$1$2")
    .replace(/(^|[^\w_])_([^_\n]+)_(?!\w)/g, "$1$2")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
}

function renderHome(indexRaw, posts) {
  const heading = titleFromMarkdown(indexRaw) || text.homeHeading
  const intro = indexRaw.replace(/^# .+$/m, "").split("<!-- posts:start -->")[0].trim()
  return renderShell(SITE_TITLE, SITE_DESCRIPTION, `
    <main id="main" class="container home-shell">
      <section class="hero">
        <p class="eyebrow">${escapeHtml(text.authorLine)}</p>
        <h1>${escapeHtml(heading)}</h1>
        <div class="intro-body">${markdown(intro).html}</div>
      </section>
      <section id="writing" class="writing-section" aria-labelledby="latest-title">
        <h2 id="latest-title" class="section-label">${escapeHtml(text.latest)}</h2>
        <div class="post-list">${posts.map(renderPostCard).join("") || `<p class="empty">${escapeHtml(text.emptyPosts)}</p>`}</div>
      </section>
    </main>
  `, "home-page", "home")
}

function renderPostsIndex(posts) {
  return renderShell(text.writingsTitle, text.writingsDescription, `
    <main id="main" class="container archive-container">
      <section class="archive-hero">
        <p class="eyebrow">${escapeHtml(text.writingsEyebrow)}</p>
        <h1>${escapeHtml(text.writingsTitle)}</h1>
        <p>${escapeHtml(text.writingsIntro)}</p>
      </section>
      <section class="post-list archive-list">
        ${posts.map(renderPostCard).join("") || `<p class="empty">${escapeHtml(text.emptyPosts)}</p>`}
      </section>
    </main>
  `, "archive-page", "posts")
}

function renderArchives(groups) {
  return renderShell(text.archivesTitle, text.archivesDescription, `
    <main id="main" class="container archive-container">
      <section class="archive-hero">
        <p class="eyebrow">${escapeHtml(text.archivesEyebrow)}</p>
        <h1>${escapeHtml(text.archivesTitle)}</h1>
        <p>${escapeHtml(text.archivesIntro)}</p>
      </section>
      <section class="timeline-list">
        ${groups.map(([year, posts]) => `
          <div class="timeline-year">
            <h2>${escapeHtml(year)}</h2>
            <div class="post-list compact-post-list">${posts.map(renderPostCard).join("")}</div>
          </div>`).join("")}
      </section>
    </main>
  `, "archive-page", "archives")
}

function renderTermsIndex(title, description, termsMap, active) {
  return renderShell(title, description, `
    <main id="main" class="container taxonomy-container">
      <section class="archive-hero">
        <p class="eyebrow">${escapeHtml(text.taxonomy)}</p>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(description)}</p>
      </section>
      <section class="taxonomy-grid">
        ${Object.entries(termsMap).map(([term, posts]) => `
          <a class="taxonomy-card" href="/${active}/${slugify(term)}/">
            <strong>${escapeHtml(term)}</strong>
            <span>${escapeHtml(format("postCount", { count: posts.length }))}</span>
          </a>`).join("") || `<p class="empty">${escapeHtml(text.emptyTerms)}</p>`}
      </section>
    </main>
  `, "taxonomy-page", active)
}

function renderTermPage(kind, term, posts, active) {
  return renderShell(`${kind}: ${term}`, format("termDescription", { term }), `
    <main id="main" class="container archive-container">
      <section class="archive-hero">
        <p class="eyebrow">${escapeHtml(kind.toLowerCase())}</p>
        <h1>${escapeHtml(term)}</h1>
        <p>${escapeHtml(format("termIntro", { count: posts.length }))}</p>
      </section>
      <section class="post-list archive-list">${posts.map(renderPostCard).join("")}</section>
    </main>
  `, "taxonomy-page", active)
}

function renderPost(post, rendered) {
  const isGuide = post.category === site.tocCategory
  let bodyHtml = stripDuplicateTitle(rendered.html, post.title)
  // Avoid repeating the same lead from frontmatter and the first paragraph.
  const lead = `<p>${inline(post.description || "")}</p>`
  if (bodyHtml.startsWith(lead)) bodyHtml = bodyHtml.slice(lead.length).trimStart()
  // The imported guide has its own H1 below the attribution and language links.
  bodyHtml = bodyHtml.replace(new RegExp(`<h1 id="${escapeRegex(slugify(post.title))}">${escapeRegex(escapeHtml(post.title))}</h1>\\n?`, "g"), "")
  bodyHtml = bodyHtml.replace(/<p>(<img [^>]*alt="([^"]*)"[^>]*>)<\/p>/g, (_, img, alt) => `<figure>${img}${alt ? `<figcaption>${alt}</figcaption>` : ""}</figure>`)
  // Keep every attribution paragraph and link, grouped into one reading block.
  bodyHtml = bodyHtml.replace(/^(?:<blockquote>[\s\S]*?<\/blockquote>\n?)+/, match => `<div class="attribution">${match}</div>`)
  const hasToc = isGuide && rendered.toc.length >= 2
  const toc = hasToc ? renderToc(rendered.toc) : ""
  const coverDimensions = post.coverWidth && post.coverHeight
    ? ` width="${escapeHtml(post.coverWidth)}" height="${escapeHtml(post.coverHeight)}"`
    : ""
  const cover = post.cover
    ? `<figure class="post-cover"><img src="/posts/${encodeURIComponent(post.slug)}/${encodeURIComponent(post.cover)}" alt="${escapeHtml(post.title)}"${coverDimensions} fetchpriority="high"></figure>`
    : ""
  const title = escapeHtml(post.title)
  return renderShell(post.title, post.description || SITE_DESCRIPTION, `
    <main id="main" class="container post-layout ${hasToc ? "with-toc" : ""}">
      <article class="content post-content">
        <header class="post-hero">
          <a class="back-link" href="/posts/">${escapeHtml(text.backToPosts)}</a>
          <h1>${title}</h1>
          ${renderPostMeta(post)}
        </header>
        ${hasToc ? `<details class="mobile-toc"><summary>${escapeHtml(text.toc)} <span class="toc-toggle" aria-hidden="true"></span></summary>${renderTocLinks(rendered.toc)}</details>` : ""}
        ${cover}
        <div class="article-body">${bodyHtml}</div>
      </article>
      ${toc}
    </main>
    <section class="container post-extras ${hasToc ? "wide-extras" : ""}">
      <div class="post-nav-links">
        ${post.next ? `<a href="${post.next.url}">${escapeHtml(text.newer)}${escapeHtml(post.next.title)}</a>` : ""}
        ${post.prev ? `<a href="${post.prev.url}">${escapeHtml(text.older)}${escapeHtml(post.prev.title)}</a>` : ""}
      </div>
      ${utterancesComments({ label: text.commentsLabel, title: text.commentsTitle, intro: text.commentsIntro, issueTerm: "pathname" })}
    </section>
  `, `post-page ${hasToc ? "guide-page" : ""}`, "posts", articleHeadExtra(post), "article", post.cover ? `/posts/${encodeURIComponent(post.slug)}/${encodeURIComponent(post.cover)}` : undefined)
}

function stripDuplicateTitle(html, title) {
  const escapedId = slugify(title)
  const escapedTitle = escapeHtml(title)
  return html.replace(new RegExp(`^<h1 id="${escapeRegex(escapedId)}">${escapeRegex(escapedTitle)}</h1>\\n?`), "")
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function renderPage(title, body, opts = {}) {
  return renderShell(title, opts.description || SITE_DESCRIPTION, `
    <main id="main" class="container page-layout">
      <article class="content">
        ${opts.date ? `<p class="date">${escapeHtml(opts.date)}</p>` : ""}
        ${body}
        ${opts.insideArticle || ""}
      </article>
      ${opts.afterArticle || ""}
    </main>
  `, opts.bodyClass || "", opts.active || "", opts.headExtra || "")
}

function renderPostMeta(post) {
  return `<div class="meta-row">
    ${post.date ? `<time datetime="${escapeHtml(post.date)}">${escapeHtml(post.date.replace(/-/g, "."))}</time>` : ""}
    ${post.category && post.category !== text.unfiled ? `<a href="/categories/${slugify(post.category)}/">${escapeHtml(post.category)}</a>` : ""}
    <span>${escapeHtml(post.tags.includes(text.repostTag) ? text.repost : text.author)}</span>
  </div>`
}

function renderTocLinks(items) {
  return `<nav class="toc-nav" aria-label="${escapeHtml(text.tocLabel)}">${items.map(item => `<a class="toc-depth-${item.depth}" href="#${item.id}">${escapeHtml(item.text)}</a>`).join("")}</nav>`
}

function renderToc(items) {
  return `<aside class="toc-card"><h2>${escapeHtml(text.toc)}</h2>${renderTocLinks(items)}</aside>`
}

function renderPostCard(post) {
  const description = post.description
  return `<a class="post-card" href="${post.url}">
    <span class="post-card-meta"><time datetime="${escapeHtml(post.date)}">${escapeHtml(post.date.replace(/-/g, "."))}</time>${post.category && post.category !== text.unfiled ? `<span>${escapeHtml(post.category)}</span>` : ""}</span>
    <strong>${escapeHtml(post.title)}</strong>
    ${description ? `<span class="post-card-description">${escapeHtml(description)}</span>` : ""}
  </a>`
}

function renderShell(title, description, main, bodyClass = "", active = "", headExtra = "", ogType = "website", ogImage = "/assets/icon-512.png") {
  return `<!doctype html>
<html lang="${escapeHtml(site.language)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)} · ${escapeHtml(SITE_TITLE)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(new URL(ogImage, SITE_URL).href)}">
  <meta property="og:type" content="${escapeHtml(ogType)}">
  <meta name="theme-color" content="#fafbfc">
  <link rel="alternate" type="application/atom+xml" title="${escapeHtml(SITE_TITLE)} ${escapeHtml(text.feed)}" href="/feed.xml">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-revision" content="20260910-rndc">
  <title>${escapeHtml(title)} · ${escapeHtml(SITE_TITLE)}</title>
  <link rel="icon" href="/assets/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16x16.png">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="stylesheet" href="/assets/style.css?v=20260910-rndc">
  ${headExtra}
</head>
<body class="${escapeHtml(bodyClass)}">
   <a class="skip-link" href="#main">${escapeHtml(text.skipToContent)}</a>
  <header class="site-header">
    <a class="brand" href="/" aria-label="${escapeHtml(text.homeLabel)}">${text.brandLines.map(escapeHtml).join("<br>")}</a>
    <nav aria-label="${escapeHtml(text.navigation)}">${NAV_ITEMS.map(item => `<a href="${item.href}"${active === item.key ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`).join("")}</nav>
  </header>
  ${main}
  <footer class="site-footer"><div class="footer-inner">
    <div class="footer-links"><a href="/about/">${escapeHtml(text.about)}</a><a href="/guestbook/">${escapeHtml(text.guestbook)}</a><a href="${escapeHtml(site.github)}" target="_blank" rel="noreferrer">${escapeHtml(text.github)}</a><a href="/feed.xml">${escapeHtml(text.rss)}</a></div>
    <p>© ${new Date().getFullYear()} ${escapeHtml(text.copyright)}</p>
  </div></footer>
  <script src="/assets/language.js" defer></script>
  <script src="/assets/site.js?v=20260910-rndc" defer></script>
</body>
</html>`
}

function articleHeadExtra(post) {
  return `
  <meta property="article:published_time" content="${escapeHtml(post.date)}">
  ${post.category && post.category !== text.unfiled ? `<meta property="article:section" content="${escapeHtml(post.category)}">` : ""}`
}

function renderContactBlock() {
  return `
    <section class="contact-block" aria-labelledby="contact-title">
      <p class="eyebrow">${escapeHtml(text.contactEyebrow)}</p>
      <h2 id="contact-title">${escapeHtml(text.contactTitle)}</h2>
      <div class="contact-list">
        ${site.contacts.map(contact => `<a href="${escapeHtml(contact.url)}" target="_blank" rel="noreferrer"><span>${escapeHtml(contact.label)}</span><strong>${escapeHtml(contact.text)}</strong><b aria-hidden="true">↗</b></a>`).join("")}
      </div>
    </section>`
}

function utterancesComments({ label, title, intro, issueTerm }) {
  if (!site.comments.repository) return ""
  return `
    <section class="comments-section" aria-label="${escapeHtml(label)}">
      <div class="comments-section-heading">
        <p class="eyebrow">${escapeHtml(text.commentsEyebrow)}</p>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(intro)}</p>
      </div>
      <div class="utterances-shell">
        <script src="https://utteranc.es/client.js"
          repo="${escapeHtml(site.comments.repository)}"
          issue-term="${escapeHtml(issueTerm)}"
          theme="${escapeHtml(site.comments.theme)}"
          crossorigin="anonymous"
          async></script>
      </div>
      <noscript><p class="comments-placeholder">${escapeHtml(text.commentsNoScript)}</p></noscript>
    </section>`
}

function renderFeed(posts) {
  const updated = posts[0]?.date || new Date().toISOString().slice(0, 10)
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(SITE_TITLE)}</title>
  <subtitle>${escapeXml(SITE_DESCRIPTION)}</subtitle>
  <link href="${SITE_URL}/feed.xml" rel="self" />
  <link href="${SITE_URL}/" />
  <updated>${escapeXml(updated)}T00:00:00Z</updated>
  <id>${SITE_URL}/</id>
  ${posts.map((post) => `
  <entry>
    <title>${escapeXml(post.title)}</title>
    <link href="${SITE_URL}${post.url}" />
    <id>${SITE_URL}${post.url}</id>
    <updated>${escapeXml(post.date)}T00:00:00Z</updated>
    <summary>${escapeXml(post.description || "")}</summary>
  </entry>`).join("")}
</feed>`
}

function renderManifest() {
  return JSON.stringify({
    name: SITE_TITLE,
    short_name: site.shortName,
    start_url: "/",
    display: "standalone",
    background_color: "#fafbfc",
    theme_color: "#fafbfc",
    icons: [
      { src: "/assets/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/assets/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }, null, 2)
}

function slugify(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item"
}

async function writeHtml(path, html) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, html, "utf8")
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]))
}

function escapeXml(value) {
  return escapeHtml(value).replace(/'/g, "&apos;")
}
