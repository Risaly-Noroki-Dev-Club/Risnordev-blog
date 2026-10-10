import { mkdir, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { createInterface } from "node:readline/promises"
import { spawn } from "node:child_process"
import { stdin as input, stdout as output, env } from "node:process"
import { text } from "./config.mjs"

const root = fileURLToPath(new URL("..", import.meta.url))
const postsDir = join(root, "content", "posts")
const args = process.argv.slice(2)
const shouldOpenEditor = args.includes("--edit") || args.includes("-e")
const titleArgs = args.filter((arg) => arg !== "--edit" && arg !== "-e")
const argTitle = titleArgs.join(" ").trim()
const interactive = Boolean(input.isTTY)
const rl = interactive ? createInterface({ input, output }) : null

try {
  const title = argTitle || await ask(text.newTitle)
  if (!title) throw new Error(text.titleRequired)

  const defaultSlug = slugify(title)
  const slugInput = await ask("slug", defaultSlug)
  const slug = slugify(slugInput || defaultSlug)
  const description = await ask(text.newDescription, "")
  const date = await ask(text.newDate, new Date().toISOString().slice(0, 10))
  const category = await ask(text.newCategory, text.defaultCategory)
  const tags = await ask(text.newTags, text.defaultTags)

  const postDir = join(postsDir, slug)
  const path = join(postDir, "index.md")
  if (existsSync(postDir)) throw new Error(`${text.postExists}${postDir}`)

  await mkdir(postDir, { recursive: true })
  const content = `---\ntitle: ${JSON.stringify(title)}\ndate: ${JSON.stringify(date)}\ndescription: ${JSON.stringify(description)}\ncategory: ${JSON.stringify(category)}\ntags: ${JSON.stringify(tags)}\nfeatured: false\n---\n\n# ${title}\n\n${text.newBody}\n`
  await writeFile(path, content, "utf8")
  console.log(`${text.created}${path}`)

  if (shouldOpenEditor) {
    await openEditor(path)
    console.log(text.nextStep)
  } else {
    console.log(text.nextStep)
    console.log(text.editorTip)
  }
} finally {
  rl?.close()
}

async function ask(label, fallback = "") {
  if (!interactive) return fallback
  const suffix = fallback ? ` (${fallback})` : ""
  const answer = (await rl.question(`${label}${suffix}: `)).trim()
  return answer || fallback
}

function openEditor(path) {
  const editor = env.EDITOR || env.VISUAL || "nano"
  return new Promise((resolve, reject) => {
    const child = spawn(editor, [path], { stdio: "inherit", shell: true })
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${editor} exited with code ${code}`)))
    child.on("error", reject)
  })
}

function slugify(value) {
  const slug = String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || `post-${Date.now()}`
}
