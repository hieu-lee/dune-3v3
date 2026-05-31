import assert from "node:assert/strict";
import { lstat, mkdir, mkdtemp, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export function createBrowserDebugArtifactStore({
  cwd = process.cwd(),
  generatedArtifactNames,
  isGeneratedArtifactName = (name) => generatedArtifactNames.has(name),
  outDir,
  preserveOut,
}) {
  function isPathInside(parent, candidate) {
    const relativePath = path.relative(parent, candidate);
    return Boolean(relativePath) && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
  }

  function isLexicallyOwnedArtifactOutDir(targetDir = outDir) {
    const resolvedOutDir = path.resolve(cwd, targetDir);
    const relativeOutDir = path.relative(cwd, resolvedOutDir);
    if (!relativeOutDir || relativeOutDir.startsWith("..") || path.isAbsolute(relativeOutDir)) return false;
    const parts = relativeOutDir.split(path.sep);
    return parts[0] === "artifacts" &&
      parts[1] === "qa" &&
      (parts[2] === "browser-debug" || parts[2]?.startsWith("browser-debug-"));
  }

  async function hasSymlinkInRepoPath(targetPath) {
    const repoRoot = path.resolve(cwd);
    let current = path.resolve(cwd, targetPath);
    while (current !== repoRoot) {
      if (!isPathInside(repoRoot, current)) return true;
      const stats = await lstat(current).catch((error) => {
        if (error.code === "ENOENT") return undefined;
        throw error;
      });
      if (stats?.isSymbolicLink()) return true;
      const parent = path.dirname(current);
      if (parent === current) return true;
      current = parent;
    }
    const rootStats = await lstat(repoRoot);
    return rootStats.isSymbolicLink();
  }

  async function isRepoOwnedArtifactOutDir(targetDir = outDir) {
    if (!isLexicallyOwnedArtifactOutDir(targetDir)) return false;
    return !(await hasSymlinkInRepoPath(path.resolve(cwd, targetDir)));
  }

  async function assertWritableOutDir() {
    const stats = await lstat(path.resolve(cwd, outDir)).catch(() => undefined);
    assert.ok(!stats?.isSymbolicLink(), `Refusing to write browser debug artifacts through symlink "${outDir}"`);
    assert.ok(!stats || stats.isDirectory(), `Browser debug output path must be a directory: "${outDir}"`);
    assert.ok(
      !isLexicallyOwnedArtifactOutDir() || (await isRepoOwnedArtifactOutDir()),
      `Refusing to treat browser debug output as repo-owned through symlinked path "${outDir}"`,
    );
  }

  async function ensureOutDir() {
    await mkdir(path.resolve(cwd, outDir), { recursive: true });
  }

  async function canCreateOwnedSummaryDir() {
    if (!(await isRepoOwnedArtifactOutDir())) return false;
    const stats = await lstat(path.resolve(cwd, outDir)).catch(() => undefined);
    return !stats || (stats.isDirectory() && !stats.isSymbolicLink());
  }

  async function canCleanOutDir() {
    if (preserveOut || !(await isRepoOwnedArtifactOutDir())) return false;
    const root = path.resolve(cwd, "artifacts", "qa");
    const resolvedOutDir = path.resolve(cwd, outDir);
    const stats = await lstat(resolvedOutDir).catch(() => undefined);
    if (!stats?.isDirectory() || stats.isSymbolicLink()) return false;
    const [realRoot, realOutDir] = await Promise.all([
      realpath(root),
      realpath(resolvedOutDir),
    ]).catch(() => []);
    return Boolean(
      realRoot &&
        realOutDir &&
        (realOutDir === path.join(realRoot, "browser-debug") ||
          realOutDir.startsWith(path.join(realRoot, "browser-debug-"))),
    );
  }

  async function cleanOutDir() {
    if (!(await canCleanOutDir())) return;

    const entries = await readdir(path.resolve(cwd, outDir), { withFileTypes: true }).catch(() => []);
    await Promise.all(
      entries
        .filter((entry) => (entry.isFile() || entry.isSymbolicLink()) && isGeneratedArtifactName(entry.name))
        .map((entry) => rm(path.join(path.resolve(cwd, outDir), entry.name), { force: true })),
    );
  }

  async function assertNoGeneratedArtifactSymlinks() {
    const entries = await readdir(path.resolve(cwd, outDir), { withFileTypes: true }).catch(() => []);
    const symlink = entries.find((entry) => entry.isSymbolicLink() && isGeneratedArtifactName(entry.name));
    assert.ok(!symlink, `Refusing to write browser debug artifact through symlink "${path.join(outDir, symlink?.name ?? "")}"`);
  }

  async function artifactPath(fileName) {
    assert.equal(path.basename(fileName), fileName, `Browser debug artifact names must not include directories: "${fileName}"`);
    assert.ok(isGeneratedArtifactName(fileName), `Unexpected browser debug artifact name "${fileName}"`);
    return path.join(path.resolve(cwd, outDir), fileName);
  }

  async function assertArtifactTargetIsSafe(filePath) {
    const stats = await lstat(filePath).catch((error) => {
      if (error.code === "ENOENT") return undefined;
      throw error;
    });
    assert.ok(!stats?.isSymbolicLink(), `Refusing to write browser debug artifact through symlink "${filePath}"`);
  }

  async function writeArtifact(fileName, value) {
    const filePath = await artifactPath(fileName);
    await assertArtifactTargetIsSafe(filePath);
    const tempDir = await mkdtemp(path.join(path.resolve(cwd, outDir), ".browser-debug-write-"));
    try {
      const tempPath = path.join(tempDir, fileName);
      await writeFile(tempPath, value);
      await assertArtifactTargetIsSafe(filePath);
      await rename(tempPath, filePath);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
    return filePath;
  }

  async function writeJson(fileName, value) {
    return writeArtifact(fileName, JSON.stringify(value, null, 2));
  }

  async function writeTrace(context, fileName) {
    const filePath = await artifactPath(fileName);
    await assertArtifactTargetIsSafe(filePath);
    const tempDir = await mkdtemp(path.join(path.resolve(cwd, outDir), ".browser-debug-trace-"));
    try {
      const tempPath = path.join(tempDir, fileName);
      await context.tracing.stop({ path: tempPath });
      await assertArtifactTargetIsSafe(filePath);
      await rename(tempPath, filePath);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
    return filePath;
  }

  return {
    artifactPath,
    assertNoGeneratedArtifactSymlinks,
    assertWritableOutDir,
    canCreateOwnedSummaryDir,
    cleanOutDir,
    ensureOutDir,
    writeArtifact,
    writeJson,
    writeTrace,
  };
}
