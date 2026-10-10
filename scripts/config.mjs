import site from "../site.config.mjs"

if (!/^[a-zA-Z0-9-]+$/.test(site.language)) throw new Error("Invalid language identifier")
const { default: text } = await import(`../locales/${site.language}.mjs`)
validateLanguage(text)
const url = new URL(site.url)
if (!["http:", "https:"].includes(url.protocol) || url.pathname !== "/" || url.search || url.hash) {
  throw new Error("site.url must be an HTTP(S) origin without a path, query or fragment")
}
site.url = url.origin
export { site, text }
export function validateLanguage(language) {
  const fields = `siteTitle siteDescription author authorLine homeLabel copyright
    posts about guestbook github rss latest emptyPosts emptyTerms writingsTitle
    writingsDescription writingsEyebrow writingsIntro archivesTitle archivesDescription
    archivesEyebrow archivesIntro tagsTitle tagsDescription tag categoriesTitle
    categoriesDescription category taxonomy postCount termDescription termIntro
    unknownYear unfiled aboutTitle aboutDescription guestbookTitle guestbookDescription
    backToPosts toc tocLabel newer older repostTag repost commentsLabel commentsTitle
    commentsIntro guestbookLabel guestbookIntro commentsEyebrow commentsNoScript
    skipToContent navigation feed contactEyebrow contactTitle code copy copied selectCopy
    codeLabel codeScrollHint homeHeading homeIntro aboutBody guestbookBody newTitle
    titleRequired newDescription newDate newCategory newTags defaultCategory defaultTags
    postExists newBody created nextStep editorTip`.trim().split(/\s+/)
  const errors = []
  for (const key of fields) {
    if (typeof language?.[key] !== "string") errors.push(`${key}: 必须存在且为字符串`)
  }
  if (!Array.isArray(language?.brandLines) || !language.brandLines.length || language.brandLines.some(line => typeof line !== "string")) {
    errors.push("brandLines: 必须是非空字符串数组")
  }
  for (const [key, token] of [["postCount", "count"], ["termDescription", "term"], ["termIntro", "count"]]) {
    if (typeof language?.[key] === "string" && !language[key].includes(`{${token}}`)) errors.push(`${key}: 缺少 {${token}} 占位符`)
  }
  if (errors.length) throw new Error(`语言包校验失败（locales/${site.language}.mjs）：\n${errors.join("\n")}`)
}
export function format(key, values = {}) {
  return String(text[key]).replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match)
}
export function localize(source) {
  return source.replace(/\{\{([^{}]+)\}\}/g, (_, rawKey) => {
    const key = rawKey.trim()
    if (typeof text[key] !== "string") throw new Error(`Unknown language key: ${key}`)
    return text[key]
  })
}
