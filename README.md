# Risnordev-blog

轻量 Markdown 静态博客模板，由 Risaly-Noroki Develop Club 维护。支持文章列表、年度归档、分类、标签、目录、封面图、代码复制、Atom 订阅和可选的 utterances 评论。

模板不包含示例文章、原博客文章或文章配图。首次构建得到一个没有文章的站点；文章目录会在新建第一篇文章时自动创建。界面文案集中在语言包，域名和外部链接集中在配置文件。发布方式为 **本地校验 → rsync 同步源文件 → 服务器重新构建**。

仓库：<https://github.com/Risaly-Noroki-Dev-Club/Risnordev-blog>

## 目录

- [快速开始](#快速开始)
- [目录结构与生成页面](#目录结构与生成页面)
- [站点配置](#站点配置)
- [语言包与页面编辑](#语言包与页面编辑)
- [文章与图片](#文章与图片)
- [评论与留言](#评论与留言)
- [图标与样式](#图标与样式)
- [rsync 发布配置](#rsync-发布配置)
- [服务器部署](#服务器部署)
- [命令与环境变量](#命令与环境变量)
- [日常维护](#日常维护)
- [常见问题](#常见问题)

## 快速开始

### 1. 创建自己的仓库

点击 **Use this template → Create a new repository**，然后克隆新仓库。在下面的命令中替换账号和仓库名：

```bash
git clone https://github.com/YOUR_ACCOUNT/YOUR_BLOG.git
cd YOUR_BLOG
```

需要 Node.js 22 或更新版本以及 npm。项目仅使用 Node.js 内置模块，无第三方 npm 依赖，无需执行 `npm install`。

```bash
node --version
npm --version
```

### 2. 配置自己的站点

先修改这两个文件：

| 文件 | 要修改的内容 |
| --- | --- |
| `site.config.mjs` | 域名、语言选择、GitHub 链接、联系方式、评论仓库 |
| `locales/zh-CN.mjs` | 网站名称、作者、首页介绍、关于页、留言页、页脚署名 |

默认域名为 `http://localhost:2201`，联系方式为空，评论关闭。上线前将域名改成实际 HTTPS 地址。站点配置和语言包的完整用法见后文。

### 3. 本地构建与预览

```bash
npm run build
npm run serve
```

访问 <http://127.0.0.1:2201>。在终端按 `Ctrl+C` 停止预览服务。修改源文件后重新执行 `npm run build`，再刷新浏览器。预览服务不会自动构建。

### 4. 开始写作和发布

```bash
npm run new -- "自己的文章标题"
npm run build
```

新文章保存在 `content/posts/<slug>/index.md`。配置服务器后用 `npm run publish` 发布，Git 提交与服务器发布是两个独立操作。

## 目录结构与生成页面

```text
site.config.mjs       站点链接、语言选择和功能配置
locales/zh-CN.mjs     界面文案、作者信息和页面介绍
content/index.md      首页语言占位符与文章列表标记
content/about.md      关于页语言占位符
content/guestbook.md  留言页语言占位符
content/posts/        新建第一篇文章后生成，文章与配图放在一起
content/media/        可自行创建的公共媒体目录
assets/              CSS、前台交互脚本和站点图标
scripts/             构建、预览、新建文章和发布脚本
public/              构建生成，已被 Git 忽略
```

构建生成以下路由：

| 路由 | 内容 |
| --- | --- |
| `/` | 首页介绍与文章列表 |
| `/posts/` | 所有文章 |
| `/posts/<slug>/` | 单篇文章 |
| `/archives/` | 按年份归档 |
| `/categories/`、`/categories/<分类>/` | 分类索引与分类文章列表 |
| `/tags/`、`/tags/<标签>/` | 标签索引与标签文章列表 |
| `/about/` | 关于页与联系方式 |
| `/guestbook/` | 留言页与可选评论 |
| `/feed.xml` | Atom 订阅，默认提供摘要 |
| `/manifest.webmanifest` | Web App manifest |

`public/` 是生成目录，构建会清空并重新生成它。需要长期保存的内容放在源文件目录中。文章目录不存在或为空时，构建仍正常运行，不需要添加占位文章。

## 站点配置

`site.config.mjs` 导出一个 JavaScript 对象。保留所有配置项，按照自己的站点修改值。以下配置仅用于说明字段用法：

```js
export default {
  language: "zh-CN",
  url: "https://blog.example.com",
  shortName: "my-blog",
  github: "https://github.com/YOUR_ACCOUNT",
  contacts: [
    {
      label: "Email",
      text: "hello@example.com",
      url: "mailto:hello@example.com",
    },
  ],
  comments: {
    repository: "", // 填 owner/repo 开启评论，留空关闭
    theme: "github-light",
  },
  tocCategory: "Code",
}
```

| 字段 | 类型 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `language` | 字符串 | `zh-CN` | 加载 `locales/<language>.mjs`，同时设置 HTML `lang` |
| `url` | 字符串 | `http://localhost:2201` | 站点访问地址，用于 Atom 链接和分享图片绝对地址 |
| `shortName` | 字符串 | `risnordev` | manifest 的短名称 |
| `github` | 字符串 | 本模板仓库地址 | 页脚 GitHub 链接 |
| `contacts` | 数组 | `[]` | 关于页联系方式，每项包含 `label`、`text` 和 `url` |
| `comments.repository` | 字符串 | `""` | utterances 评论仓库，格式为 `owner/repo` |
| `comments.theme` | 字符串 | `github-light` | utterances 主题 |
| `tocCategory` | 字符串 | `Code` | 哪个分类的文章自动显示目录 |

### 域名与路径

`url` 必须是 HTTP(S) 根地址，例如 `https://blog.example.com`。末尾单个斜线可省略，不接受 `/blog/` 子路径、查询参数或片段。

页面使用根路径资源链接，需部署在域名根目录。GitHub Pages 的 `/仓库名/` 路径不适用于当前配置。修改 `PORT` 只改变预览服务端口，不会自动修改 `url`；本地需要测试订阅或分享链接时，两者也应对应。

### 联系方式

`label` 是类型名称，`text` 是显示给读者的账号或地址，`url` 是实际跳转目标。例如 Email 使用 `mailto:`，个人主页使用完整 HTTPS URL。增加联系方式直接增加数组项；全部关闭使用 `contacts: []`。这些显示值在配置文件中修改。

### 文章目录规则

目录仅对 `category` 与 `tocCategory` **完全匹配**的文章显示，区分大小写。正文中还需要至少两个二级或三级标题。移动端以折叠目录显示，桌面端显示侧栏目录。修改 `tocCategory` 后重新构建即可。

## 语言包与页面编辑

`locales/zh-CN.mjs` 已按功能分组。字段名是程序读取的接口，编辑时保留字段名和对象结构，替换值即可。

### 网站身份与首页

| 字段 | 作用与编辑建议 |
| --- | --- |
| `siteTitle` | 网站名称，用于页面标题、订阅和 manifest |
| `siteDescription` | 默认网站简介与订阅简介 |
| `author` | 普通文章显示的作者姓名 |
| `authorLine` | 首页标题上方的作者介绍 |
| `brandLines` | 页头品牌，字符串数组的每一项显示为一行；至少保留一项 |
| `homeLabel` | 品牌链接的无障碍说明 |
| `copyright` | 页脚年份后面的署名，年份由构建自动生成 |
| `homeHeading` | 首页主标题 |
| `homeIntro` | 首页介绍，支持 Markdown |

个人姓名、介绍和署名默认留空，按自己的信息填写。相同名称出现在不同字段时需要分别修改，例如 `siteTitle`、`brandLines` 和 `homeHeading` 不会自动联动。

### 关于页与留言页

| 字段 | 作用 |
| --- | --- |
| `aboutTitle`、`aboutDescription` | 关于页浏览器标题与页面简介 |
| `aboutBody` | 关于页完整 Markdown 正文，默认仅有页面标题 |
| `guestbookTitle`、`guestbookDescription` | 留言页浏览器标题与页面简介 |
| `guestbookBody` | 留言页完整 Markdown 正文，默认仅有页面标题 |

多行正文可以使用模板字符串，直接换行编辑：

```js
homeIntro: `在这里填写自己的首页介绍。

这一段可以使用 **Markdown**。`,
```

保留首尾反引号和字段后的逗号。正文需要输入反引号时写成 `` \` ``；需要输入字面量 `${` 时写成 `\${`。普通引号字符串也可以使用 `\n` 表示换行。

### 页面占位符

三个页面源文件默认引用语言包：

| 文件 | 默认引用 |
| --- | --- |
| `content/index.md` | `# {{homeHeading}}` 与 `{{homeIntro}}` |
| `content/about.md` | `{{aboutBody}}` |
| `content/guestbook.md` | `{{guestbookBody}}` |

构建先替换 `{{字段名}}`，再渲染 Markdown。可以在这三个文件中混用 Markdown 和语言包占位符。首页的 `<!-- posts:start -->` 标记用于结束介绍区域，文章列表由构建自动生成。

占位符只用于上述页面文件，不用于文章 frontmatter 或文章正文。未知字段会使构建停止并报告字段名。避免在语言包值中再嵌套语言占位符，替换仅执行一遍。

### 界面字段参考

| 字段 | 对应区域 |
| --- | --- |
| `posts`、`about`、`guestbook`、`github`、`rss` | 页头与页脚链接文字 |
| `skipToContent`、`navigation`、`feed` | 无障碍导航与订阅链接说明 |
| `contactEyebrow`、`contactTitle` | 联系方式区域小标题和标题 |
| `latest`、`emptyPosts`、`emptyTerms` | 最新文章标题与空状态 |
| `writingsTitle`、`writingsDescription`、`writingsEyebrow`、`writingsIntro` | 所有文章页面 |
| `archivesTitle`、`archivesDescription`、`archivesEyebrow`、`archivesIntro` | 归档页面 |
| `tagsTitle`、`tagsDescription`、`tag` | 标签索引与标签详情标题 |
| `categoriesTitle`、`categoriesDescription`、`category` | 分类索引与分类详情标题 |
| `taxonomy`、`unknownYear`、`unfiled` | 分类页小标题、缺失年份文字与默认分类 |
| `postCount`、`termIntro` | 数量文案，保留 `{count}` |
| `termDescription` | 分类详情简介，保留 `{term}` |
| `backToPosts`、`newer`、`older` | 返回列表及前后文章导航 |
| `toc`、`tocLabel` | 目录标题和无障碍说明 |
| `repostTag`、`repost` | 用于识别转载的标签值与转载署名 |
| `commentsLabel`、`commentsTitle`、`commentsIntro` | 文章评论区域 |
| `guestbookLabel`、`guestbookIntro` | 留言评论区域 |
| `commentsEyebrow`、`commentsNoScript` | 评论小标题与 JavaScript 未启用提示 |
| `code`、`copy`、`copied`、`selectCopy` | 代码块标签及复制按钮状态 |
| `codeLabel`、`codeScrollHint` | 代码块无障碍说明与横向滚动提示 |
| `newTitle`、`titleRequired`、`newDescription`、`newDate`、`newCategory`、`newTags` | 新建文章的输入提示 |
| `defaultCategory`、`defaultTags` | 非交互新建文章的默认分类与标签 |
| `postExists`、`newBody`、`created`、`nextStep`、`editorTip` | 新建文章的正文起始文字与操作提示 |

字符串字段可以留空，但不能删除或改成数字、数组等类型。`brandLines` 必须是非空字符串数组。`postCount`、`termIntro` 和 `termDescription` 必须保留对应占位符。字段类型、缺失字段和页面占位符校验在替换 `public/` 前执行，校验失败保留已有页面。

### 增加语言

1. 复制完整的 `locales/zh-CN.mjs` 为 `locales/en.mjs` 等文件。
2. 翻译字段值，保留所有字段名、数组结构和数量占位符。
3. 设置 `site.config.mjs` 的 `language: "en"`。
4. 重新执行 `npm run build`。

语言标识支持字母、数字和连字符。一次构建使用一种语言。浏览器代码块提示由生成的 `public/assets/language.js` 提供，不需要手工编辑该文件。

## 文章与图片

### 新建文章

```bash
npm run new -- "文章标题"
npm run new -- --edit "文章标题"
```

交互终端会询问 slug、简介、日期、分类和标签。非交互运行使用语言包中的默认值；slug 根据标题生成。`--edit` 或 `-e` 使用 `EDITOR`、`VISUAL` 指定的编辑器，默认 `nano`。

也可以手动创建 `content/posts/<slug>/index.md`。slug 决定网址，建议使用稳定的小写字母、数字和连字符；发布后改目录名会改变文章链接和按路径关联的评论。

### frontmatter 字段

文章开头使用 `---` 包围的单行字段。下面是格式参考，模板仓库不随附这篇文章：

```md
---
title: "文章标题"
date: "2026-10-10"
description: "文章摘要"
category: "Notes"
tags: "写作,生活"
cover: "cover.jpg"
coverWidth: "1600"
coverHeight: "900"
---

# 文章标题

正文。
```

| 字段 | 用途与默认行为 |
| --- | --- |
| `title` | 文章标题；省略时取正文第一个一级标题，再回退为 slug |
| `date` | `YYYY-MM-DD`；文章按日期字符串倒序排列，同日期按标题排列 |
| `description` | 摘要；省略时从正文提取，显式留空则显示为空 |
| `category` | 单个分类；省略时用语言包 `unfiled` |
| `categories` | 兼容字段；未填写 `category` 时取列表第一项 |
| `tags` | 逗号分隔，支持中文逗号或 `[标签一, 标签二]` |
| `cover` | 当前文章目录中的封面文件名，可省略 |
| `coverWidth`、`coverHeight` | 封面原始像素尺寸，两项同时提供时写入图片属性 |
| `featured` | 兼容字段，目前不影响首页展示或排序 |

frontmatter 采用轻量单行解析，避免使用多行 YAML、嵌套对象、行尾注释或复杂转义。使用换行符 LF 保存 Markdown。日期建议总是填写有效的 ISO 日期，以保证排序、归档和订阅时间完整。

### 放置图片

文章图片与 Markdown 放在同一个目录，在正文用相对路径引用：

```md
![图片说明](./image.jpg)
```

构建复制文章目录中除 `index.md` 和 `.DS_Store` 外的文件及子目录。该目录中的附件也会公开，所以只放准备发布的文件。公共图片放在 `content/media/`，正文引用 `/media/文件名`。

### Markdown 支持范围

支持标题、段落、粗体、斜体、链接、图片、引用、围栏代码块、简单列表、分隔线和简单表格。列表统一渲染为无序列表，暂不支持完整 CommonMark 的嵌套列表、任务列表和脚注。原始 HTML 会被转义。

与 frontmatter 标题相同的一级标题会在文章页去重。二级、三级标题用于自动目录。代码复制按钮需要浏览器 Clipboard API，建议线上使用 HTTPS；API 不可用时按钮会选中代码供手工复制。

## 评论与留言

默认 `comments.repository` 为空，文章页和留言页均不加载评论脚本。

开启评论：

1. 创建或选择一个公开 GitHub 仓库并开启 Issues。
2. 安装 [utterances GitHub App](https://github.com/apps/utterances)，授权该仓库。
3. 将 `comments.repository` 设置为 `YOUR_ACCOUNT/YOUR_COMMENTS_REPO`。
4. 设置主题并重新构建发布。

文章按 `pathname` 匹配 Issue，留言页按页面 `title` 匹配。修改文章 slug 或留言页标题可能关联到新的 Issue。评论由 GitHub Issues 保存，不需要 OAuth App、Client Secret 或单独后端。

常用主题有 `github-light`、`github-dark` 和 `preferred-color-scheme`，其他主题见 [utterances](https://utteranc.es/)。关闭评论时将仓库值改回 `""` 并重新构建。

## 图标与样式

替换 `assets/` 中同名文件即可更新图标：

| 文件 | 推荐尺寸或用途 |
| --- | --- |
| `favicon.ico` | 浏览器 favicon |
| `favicon-16x16.png`、`favicon-32x32.png` | 16×16、32×32 |
| `apple-touch-icon.png` | 推荐 180×180 |
| `icon-192.png`、`icon-512.png` | 192×192、512×512，供 manifest 与分享图片使用 |

页面布局、颜色和响应式样式在 `assets/style.css`；代码复制和目录交互在 `assets/site.js`。修改后重新构建。浏览器缓存了旧图标或静态资源时，强制刷新或清理对应缓存。

## rsync 发布配置

### 准备服务器

本地和远程都需要 rsync；本地还需要 OpenSSH，服务器需要 Node.js 22+ 和 npm。Linux 可使用系统包管理器安装 rsync 与 SSH；Node.js 版本请参考 [官方安装说明](https://nodejs.org/en/download)，安装后检查版本。

为站点选择专用目录，例如 `/srv/risnordev-blog`。运行发布的 SSH 用户需要对该目录有读写权限。可以在服务器以该用户身份准备目录：

```bash
sudo mkdir -p /srv/risnordev-blog
sudo chown "$USER":"$(id -gn)" /srv/risnordev-blog
```

在本地确认非交互 SSH 环境可以找到构建工具：

```bash
ssh -p 22 your-user@your-server 'command -v node; command -v npm; command -v rsync; node --version'
```

使用 nvm 或 Homebrew 时，交互终端的 PATH 可能与 SSH 远程命令不同。需要让远程非交互 shell 也能找到 node 与 npm；仅在终端登录后手动执行版本管理器命令不足以支持发布。

### 设置发布环境

```bash
export BLOG_REMOTE=your-user@your-server
export BLOG_REMOTE_ROOT=/srv/risnordev-blog
export BLOG_REMOTE_PORT=22
npm run publish
```

| 变量 | 要求 |
| --- | --- |
| `BLOG_REMOTE` | 必填，格式 `user@hostname` 或 `user@IPv4`；当前脚本不接受单独的 SSH alias 和 IPv6 字面量 |
| `BLOG_REMOTE_ROOT` | 必填，专用目录绝对路径；支持字母、数字、点、下划线、连字符和斜线，不支持空格、根目录或 `..` |
| `BLOG_REMOTE_PORT` | 默认 `22`，范围 1–65535 |

环境变量在当前终端中有效，新开终端需重新设置；也可在每次发布命令前内联传入。脚本不会自动读取 `.env`。GitHub 账号或仓库设置不会决定 SSH 发布地址。

SSH 身份文件和跳板设置可放在本地 `~/.ssh/config`，主机名与 `BLOG_REMOTE` 中的主机保持一致。例如：

```sshconfig
Host blog.example.com
    User your-user
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
```

发布脚本会显式传入端口，因此仍需将非标准端口填写到 `BLOG_REMOTE_PORT`。

### 发布顺序与删除行为

`npm run publish` 按顺序执行：

1. 本地 `npm run build`：语言或配置校验失败时，不连接服务器同步。
2. SSH 创建远程项目目录。
3. `rsync -az --delete` 同步源文件，包括配置、语言包、文章、附件、样式和脚本。
4. SSH 进入远程目录，执行 `npm run build`。

`.git/`、`public/`、`node_modules/`、`.DS_Store`、`.env*`、日志和旧 `.publish-trigger` 文件不会同步。远程 `public/` 由服务器构建产生。

`--delete` 会删除远程源目录中本地已不存在的文件，删除本地文章后发布也会删除线上文章。远程目录只存放这个项目，服务配置和其他应用放在目录外。服务器内容不会自动回传到本地，本地源文件是日常编辑和发布的依据。

同步或构建失败时脚本停止并显示失败命令。远程同步已开始后失败可能留下部分更新，修复后重新发布。构建期间生成目录会被替换，站点可能短暂不可用。

## 服务器部署

首次发布生成 `public/` 后，可用 Caddy 直接提供静态文件，或通过 Node.js 服务反向代理。选择一种适合服务器现有环境的方式即可。

### Caddy 直接提供静态站点

域名解析到服务器，确保 Caddy 对项目目录具有读取和目录遍历权限。将以下配置放入服务器 Caddyfile，替换域名和路径：

```caddy
blog.example.com {
    root * /srv/risnordev-blog/public
    file_server
}
```

重新加载 Caddy 后访问域名。满足 DNS、端口等条件时，Caddy 自动管理 HTTPS。这个方式无需运行 `npm run serve`，后续发布只需重建静态页面。

### Node.js 静态服务与 systemd

先在服务器项目目录验证服务：

```bash
HOST=127.0.0.1 PORT=2201 npm run serve
```

服务仅提供 `public/` 静态文件，支持 GET 与 HEAD。需要先构建。默认监听 `127.0.0.1:2201`；通过本机反向代理访问时保持这个监听地址。

使用 systemd 时，将下面内容保存到 `/etc/systemd/system/risnordev-blog.service`。替换用户、工作目录和 npm 绝对路径，npm 路径可通过 `command -v npm` 查询：

```ini
[Unit]
Description=Risnordev blog static server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/srv/risnordev-blog
Environment=HOST=127.0.0.1
Environment=PORT=2201
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/npm run serve
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Node.js 安装在其他目录时，将该目录加入 `Environment=PATH`，保证 npm 能找到 node。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now risnordev-blog.service
sudo systemctl status risnordev-blog.service
sudo journalctl -u risnordev-blog.service -n 50 --no-pager
```

Caddy 反向代理配置：

```caddy
blog.example.com {
    reverse_proxy 127.0.0.1:2201
}
```

也可以使用已有 Nginx 或 Cloudflare Tunnel，将域名请求代理到 `http://127.0.0.1:2201` 并在入口配置 HTTPS。域名应与 `site.config.mjs` 的 `url` 一致。

更新文章、语言包、CSS 或配置后无需重启静态服务；更新 `scripts/serve.mjs` 后执行：

```bash
sudo systemctl restart risnordev-blog.service
```

## 命令与环境变量

| 命令 | 用途 |
| --- | --- |
| `npm run build` | 校验并生成 `public/` |
| `npm run build:site` | 与 `build` 相同 |
| `npm run serve` | 提供已有的 `public/` 静态文件 |
| `npm run new -- "标题"` | 创建文章目录和 Markdown |
| `npm run new -- --edit "标题"` | 创建并打开编辑器 |
| `npm run publish` | 本地构建、rsync 同步、远程构建 |

| 环境变量 | 作用 |
| --- | --- |
| `HOST` | 静态服务监听地址，默认 `127.0.0.1` |
| `PORT` | 静态服务端口，默认 `2201` |
| `BLOG_REMOTE`、`BLOG_REMOTE_ROOT`、`BLOG_REMOTE_PORT` | SSH 发布目标与端口 |
| `NPM_PATH` | 发布前本地构建使用的 npm 可执行路径，默认 `npm`；不会改变远程 npm 路径 |
| `EDITOR`、`VISUAL` | 新建文章的编辑器，优先 `EDITOR`，默认 `nano` |

## 日常维护

文字更新：编辑语言包 → 本地构建预览 → `npm run publish`。

文章更新：编辑 `content/posts/` → 本地构建预览 → `npm run publish`。删除文章时删除整个文章目录，并在发布后检查文章列表和订阅。

源码备份可以用自己的 Git 仓库管理。`git push` 只更新 GitHub，不会自动部署服务器；`npm run publish` 只发布当前本地文件，不会自动提交 Git。发布会包含已保存但尚未提交的源文件。

从已有博客迁移时，先备份服务器源文件、生成目录和服务配置，并检查服务器是否存在尚未取回的文章。完成核对后再使用本地源文件发布。若旧系统存在 WebDAV 服务或内容监控重建任务，迁移后停用，统一用 rsync 发布。

## 常见问题

| 现象 | 检查与处理 |
| --- | --- |
| 没有文章，首次构建是否会失败 | 不会；文章目录可以不存在，执行 `npm run new` 后自动创建 |
| 修改语言包后页面仍是旧文字 | 重新构建；线上还需发布，之后刷新浏览器或检查代理缓存 |
| 提示语言包校验失败 | 根据错误中的字段名补齐字符串或数组，保留 `{count}`、`{term}` 占位符 |
| 出现 `SyntaxError` | 检查逗号、引号、反引号和 `${`，语法错误会在替换已有页面前停止 |
| 页面占位符报告未知字段 | 检查 `{{字段名}}` 是否与语言包字段完全一致 |
| `serve` 提示找不到 `public/` | 先执行 `npm run build` |
| `EADDRINUSE` | 端口被占用，停止原进程或用 `PORT=其他端口 npm run serve` |
| SSH `Permission denied` | 检查用户名、SSH 密钥、服务器授权和 `BLOG_REMOTE_PORT` |
| rsync `Permission denied` | 检查远程目录所有权与写权限 |
| `rsync: command not found` | 确认本地和远程均安装 rsync |
| 远程 `npm: command not found` | 检查非交互 SSH 的 PATH，交互登录能运行 npm 不代表发布命令也能运行 |
| 评论不显示 | 检查评论仓库是否公开、Issues 是否开启、utterances App 是否授权，以及浏览器是否拦截脚本 |
| 分类文章没有目录 | 检查 `category` 与 `tocCategory` 大小写及正文二级、三级标题数量 |
| 分享图片或订阅链接指向 localhost | 将 `site.config.mjs` 的 `url` 改成实际域名并重新构建发布 |
| 样式、图片在子路径部署时 404 | 将站点部署到域名根目录，当前模板不支持仓库名子路径 |
| 服务启动后立即退出 | 查看 systemd 日志，确认工作目录、`public/`、node/npm 路径与端口 |
| 已删除文章仍能访问 | 确认发布完成；检查远程是否重新构建以及 CDN 是否仍缓存旧页面 |

模板目前没有单独声明代码许可证。
