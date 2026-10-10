import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { posix } from "node:path"

const root = fileURLToPath(new URL("..", import.meta.url))
const remote = process.env.BLOG_REMOTE
const remoteRoot = process.env.BLOG_REMOTE_ROOT
const port = process.env.BLOG_REMOTE_PORT || "22"
if (!remote || !remoteRoot) throw new Error("Set BLOG_REMOTE=user@host and BLOG_REMOTE_ROOT=/absolute/server/path")
if (!/^[a-zA-Z0-9_.-]+@[a-zA-Z0-9_.-]+$/.test(remote)) throw new Error("Invalid BLOG_REMOTE")
if (!/^\/[a-zA-Z0-9_./-]+$/.test(remoteRoot) || posix.normalize(remoteRoot) === "/" || remoteRoot.split("/").includes("..")) {
  throw new Error("BLOG_REMOTE_ROOT must be a non-root absolute path containing letters, digits, dots, underscores, hyphens or slashes")
}
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error("Invalid SSH port")
const ssh = ["-p", port, remote]
await run("ssh", [...ssh, `mkdir -p '${remoteRoot}'`])
await run("rsync", [
  "-az", "--delete", "--exclude=.git/", "--exclude=public/", "--exclude=node_modules/",
  "--exclude=.DS_Store", "--exclude=.env", "--exclude=.env.*", "--exclude=*.log",
  "--exclude=.publish-trigger", "-e", `ssh -p ${port}`, `${root}/`, `${remote}:${remoteRoot}/`,
])
await run("ssh", [...ssh, `cd '${remoteRoot}' && npm run build`])
console.log("rsync completed and the remote site was rebuilt.")

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" })
    child.on("exit", code => code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}`)))
    child.on("error", reject)
  })
}
