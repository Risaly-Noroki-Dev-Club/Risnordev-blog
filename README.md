# Risnordev-blog

一个轻量的 Markdown 静态博客模板，由 Risaly-Noroki Develop Club 维护。保留原博客的前台设计和文章，支持文章列表、年度归档、分类、标签、文章目录、封面图、代码复制、Atom 订阅和 utterances 评论。

站点文字集中在语言包中，域名和外部链接集中在配置中。日常写作在本地完成，通过 **rsync 同步源文件，然后在服务器上重新构建**。

仓库地址：<https://github.com/Risaly-Noroki-Dev-Club/Risnordev-blog>

## 从模板开始

1. 点击仓库顶部的 **Use this template → Create a new repository**。
2. 克隆自己创建的仓库。
3. 根据下文修改语言包、站点配置和文章内容。
4. 构建并本地预览，随后配置服务器同步。

仓库保留了原博客文章及配图，没有额外示例文章。使用时可以替换或删除 `content/posts/` 下的原文章目录。

## 运行环境与本地预览

- Node.js 22 或更新版本，附带 npm。
- 发布端需要 rsync 和 OpenSSH；服务器需要 SSH、rsync、Node.js 和 npm。
- 项目没有第三方 npm 依赖，可以直接运行，无需 `npm install`。

```bash
npm run build
npm run serve
```

访问 <http://127.0.0.1:2201>。预览服务默认监听本机；需要开放到其他设备时使用：

```bash
HOST=0.0.0.0 PORT=2201 npm run serve
```

修改内容、语言或配置后，重新执行 `npm run build` 并刷新浏览器。`npm run serve` 只提供静态文件，不自动构建。构建会清空并重新生成 `public/`，这个目录不纳入 Git。

## 项目结构

```text
site.config.mjs       域名、语言选择、链接、评论和目录规则
locales/zh-CN.mjs     全部界面文案、站点身份文字和页面介绍
content/index.md      首页语言包占位符与文章列表标记
content/about.md      关于页语言包占位符
content/guestbook.md  留言页语言包占位符
content/posts/        文章和各自的图片
content/media/        可选的公共媒体目录，输出到 /media/
assets/              样式、前台交互脚本和图标
scripts/             构建、新建文章、静态预览和 rsync 发布脚本
public/              自动生成的站点
```

## 语言包：替换所有站点文字

编辑 `locales/zh-CN.mjs`，保留字段名，替换字段值。语言包使用 JavaScript 对象；文字中的换行可以用 `\n`，多行 Markdown 也可以改成反引号包裹的模板字符串。

语言包已经按页面和功能分组，首页、关于页和留言页正文使用可直接换行的模板字符串。编辑这些段落时保留两侧反引号；正文需要写反引号或字面量 `${` 时，分别写成 `` \` `` 和 `\${`。

构建前会检查全部必需字段及类型、`brandLines` 数组、数量与分类占位符，以及页面引用的语言字段。校验失败时显示具体字段名，并保留现有 `public/` 页面。JavaScript 语法错误也会在替换构建目录前停止。

| 字段或字段组 | 用途 |
| --- | --- |
| `siteTitle`、`siteDescription` | 站点名称、页面默认简介与订阅信息 |
| `author`、`authorLine`、`copyright` | 文章作者、首页作者介绍、页脚署名 |
| `brandLines`、`homeLabel` | 页头品牌的多行文字、首页链接无障碍说明 |
| `homeHeading`、`homeIntro` | 首页标题和 Markdown 介绍 |
| `aboutBody`、`guestbookBody` | 关于页和留言页完整 Markdown，包括其中的个人介绍与相关链接 |
| `posts`、`about`、`guestbook`、`github`、`rss` | 导航与页脚链接文字 |
| `writings*`、`archives*`、`tags*`、`categories*`、`taxonomy` | 列表、归档、标签和分类页面文案 |
| `aboutTitle`、`aboutDescription`、`guestbookTitle`、`guestbookDescription` | 关于页和留言页标题与元信息 |
| `latest`、`emptyPosts`、`emptyTerms`、`unknownYear`、`unfiled` | 最新文章标题、空状态、缺失年份与默认分类 |
| `postCount`、`termDescription`、`termIntro` | 数量与分类简介，保留 `{count}`、`{term}` 占位符 |
| `tag`、`category`、`backToPosts`、`newer`、`older` | 文章分类页标题和文章导航 |
| `toc`、`tocLabel`、`repostTag`、`repost` | 目录文字、转载标签匹配值与署名 |
| `comments*`、`guestbookLabel`、`guestbookIntro` | 评论与留言区域文字 |
| `skipToContent`、`navigation`、`feed`、`contact*` | 无障碍导航、订阅和联系区域文字 |
| `code`、`copy`、`copied`、`selectCopy`、`codeLabel`、`codeScrollHint` | 代码块交互文字 |
| `new*`、`titleRequired`、`defaultCategory`、`defaultTags`、`postExists`、`created`、`nextStep`、`editorTip` | 新建文章命令的提示和默认值 |

首页、关于页和留言页使用 `{{字段名}}` 引用语言包，例如 `{{aboutBody}}`。这三个页面支持直接写 Markdown，也支持混用占位符。文章正文和文章 frontmatter 是写作内容，在各文章文件中修改，不进行语言包替换。

新增语言时，复制完整语言包为 `locales/en.mjs` 等文件并翻译所有字段，再修改 `site.config.mjs` 的 `language`。一次构建使用一种语言，该值也用于 HTML 的 `lang` 属性。浏览器代码块文案由构建生成的 `public/assets/language.js` 提供。

## 站点配置与个人信息

编辑 `site.config.mjs`：

| 配置 | 说明 |
| --- | --- |
| `language` | 语言包文件名，不含 `.mjs`，默认 `zh-CN` |
| `url` | 实际访问的 HTTP(S) 域名，例如 `https://blog.example.com`，影响 Atom 与分享图片链接 |
| `shortName` | Web App manifest 中的短名称 |
| `github` | 页脚 GitHub 链接 |
| `contacts` | 联系方式数组，每项的 `label` 为显示名称，`text` 为账号或地址，`url` 为跳转地址；空数组隐藏联系条目 |
| `comments.repository` | utterances 使用的 `owner/repo`；设为 `""` 关闭评论 |
| `comments.theme` | utterances 主题，默认 `github-light` |
| `tocCategory` | 自动显示目录的文章分类，默认 `Code`；至少有两个二级或三级标题才显示 |

原站点信息保留在语言包和配置中，使用模板时替换这些值。语言包 `aboutBody` 里的 Markdown 链接也需要按自己的情况修改。头像与 favicon 图标在 `assets/` 中，可直接替换同名文件。

站点使用根路径链接，需要部署在域名根目录，例如 `https://blog.example.com/`。`url` 不接受 `/仓库名/` 子路径。

## 写文章

```bash
npm run new -- "文章标题"
npm run new -- --edit "文章标题"
```

交互终端会依次询问 slug、简介、日期、分类和标签。非交互运行使用默认值。`--edit` 使用 `EDITOR` 或 `VISUAL` 指定的编辑器，默认 `nano`。

也可以直接创建文章目录：

```text
content/posts/my-post/
├── index.md
└── image.jpg
```

文章格式：

```md
---
title: "文章标题"
date: "2026-10-10"
description: "一句话简介"
category: "Notes"
tags: "写作,生活"
cover: "image.jpg"
coverWidth: "1600"
coverHeight: "900"
---

# 文章标题

正文。

![图片说明](./image.jpg)
```

日期使用 `YYYY-MM-DD`，文章按日期倒序排列。`description` 可省略，构建时从正文提取摘要；`category` 可省略；标签使用逗号分隔，也支持 `[写作, 生活]`。封面及尺寸字段可省略，封面文件放在当前文章目录。`featured` 为兼容原文章保留，目前不影响首页排序。

解析器支持标题、段落、粗体、斜体、链接、图片、引用、代码块、列表、分隔线和简单表格，是轻量 Markdown 实现。列表按无序列表渲染，frontmatter 仅支持单行字段。正文中的原始 HTML 会转义。

## 评论与留言

默认保留原博客的 utterances 配置。使用自己的站点时，将 `comments.repository` 改成自己的公开评论仓库，开启 Issues，并安装 [utterances GitHub App](https://github.com/apps/utterances)，授权访问该仓库。

文章评论按页面路径匹配 Issue，留言页按页面标题匹配。评论不需要额外后端或 OAuth 密钥。设为 `comments.repository: ""` 后，不输出评论脚本和评论区域。

## rsync 同步并重新构建

先确保 SSH 可登录服务器，且远程非交互 SSH 环境可以执行 `rsync`、`node` 和 `npm`。为博客选择一个专用目录。

```bash
export BLOG_REMOTE=your-user@your-server
export BLOG_REMOTE_ROOT=/srv/risnordev-blog
export BLOG_REMOTE_PORT=22
npm run publish
```

`BLOG_REMOTE` 和 `BLOG_REMOTE_ROOT` 必填；SSH 端口默认 `22`。远程目录使用绝对路径，支持字母、数字、点、下划线、连字符和斜线，不支持空格。SSH 密钥、身份文件及跳板配置可以放在 `~/.ssh/config`。

发布依次执行：

1. 在本地运行 `npm run build`，验证语言包、配置和页面内容；失败时不会同步服务器。
2. 通过 SSH 创建远程博客目录。
3. 使用 `rsync -az --delete` 同步项目源文件，包括文章、图片、语言包、配置、样式和脚本。
4. 同步成功后通过 SSH 在远程目录执行 `npm run build`。

同步会让远程源文件与本地一致，包括删除本地已删除的文章。远程目录应仅存放该博客项目；服务配置等文件放在目录之外。`.git/`、`public/`、`node_modules/`、`.DS_Store`、`.env*`、日志及旧构建触发文件会被排除；远程 `public/` 由远程构建重建。脚本遇到失败会停止，失败信息直接显示在终端。

环境变量由当前终端传入，脚本不自动读取 `.env`。同步和构建过程中站点可能短暂不可用。

## 编辑 risnordev.org 的日常流程

这个博客本身也使用上述语言包。首页介绍编辑 `homeHeading` 与 `homeIntro`，关于页编辑 `aboutBody`，留言页编辑 `guestbookBody`。这些字段修改后，三个页面中的语言占位符会在构建时自动展开。

本地检查效果：

```bash
npm run build
npm run serve
```

在浏览器访问 <http://127.0.0.1:2201>，确认效果后，在当前终端设置原博客的部署地址并发布：

```bash
export BLOG_REMOTE=erika@server.risnordev.org
export BLOG_REMOTE_ROOT=/home/erika/risnordev-blog
export BLOG_REMOTE_PORT=2222
npm run publish
```

环境变量在该终端中保持有效，后续修改直接运行 `npm run publish` 即可；新开终端时重新设置。使用模板搭建其他站点时，将这些值换成自己的服务器地址。

服务器更新静态页面后，通常无需重启服务。替换 `scripts/serve.mjs` 时，需要在服务器执行 `systemctl --user restart risnordev-blog.service`。线上内容统一通过本地 rsync 发布，旧 WebDAV 服务和内容变化自动重建监控应停用，避免与发布过程同时写入或构建。

## 服务器部署

第一次运行 `npm run publish` 后，服务器目录中的 `public/` 就是完整静态网站。可以使用 Nginx 或 Caddy 提供静态文件，也可以运行自带服务：

```bash
HOST=127.0.0.1 PORT=2201 npm run serve
```

使用 systemd 管理时，将以下内容保存到服务器的 `/etc/systemd/system/risnordev-blog.service`，替换用户、目录和 npm 的绝对路径：

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
ExecStart=/usr/bin/npm run serve
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now risnordev-blog
sudo systemctl status risnordev-blog
```

在 Nginx、Caddy 或 Cloudflare Tunnel 中将自己的域名反向代理到 `http://127.0.0.1:2201` 并配置 HTTPS。后续发布只需在本地运行 `npm run publish`；内容更新通常无需重启静态服务，修改服务脚本后需重启进程。

也可以让 Caddy 直接提供静态文件，以下配置放在服务器已有的 Caddyfile 中：

```caddy
blog.example.com {
    root * /srv/risnordev-blog/public
    file_server
}
```

## 内容归属

保留的文章与图片属于各自作者，转载内容的署名和许可见对应文章。创建自己的博客时请按需要替换原文与图片，并保留适用的转载署名。模板仓库目前没有单独声明代码许可证。
