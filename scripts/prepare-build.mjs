// OneDrive can return incorrect directory Dirents, causing Next's production
// cleanup to unlink a directory as a file (EPERM). Use actual filesystem metadata
// for these two generated production directories. Never touch .next/dev or sources.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const workspace = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
if (process.platform === "win32" && /onedrive/i.test(workspace)) {
  const next = path.join(workspace, ".next");
  if (fs.existsSync(next)) {
    const workspaceReal = fs.realpathSync(workspace);
    const allowed = fs.realpathSync(next);
    if (!allowed.startsWith(workspaceReal + path.sep))
      throw Error("Build cache must stay inside the workspace.");
    function removeGenerated(target) {
      const absolute = path.resolve(target);
      if (!absolute.startsWith(next + path.sep))
        throw Error("Unexpected generated path.");
      const info = fs.lstatSync(absolute);
      if (info.isSymbolicLink()) {
        fs.unlinkSync(absolute);
        return;
      }
      const real = fs.realpathSync(absolute);
      if (!real.startsWith(allowed + path.sep))
        throw Error("Refusing external build-cache path.");
      if (fs.statSync(absolute).isDirectory()) {
        for (const name of fs.readdirSync(absolute))
          removeGenerated(path.join(absolute, name));
        fs.rmdirSync(absolute);
      } else fs.unlinkSync(absolute);
    }
    for (const directory of ["server", "static"]) {
      const target = path.join(next, directory);
      if (fs.existsSync(target)) removeGenerated(target);
    }
  }
}
