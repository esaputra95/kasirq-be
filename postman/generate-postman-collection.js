/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(repoRoot, "src");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveModule(specifier, fromFile) {
  // Supports:
  // - relative paths: ./foo, ../bar
  // - alias: #root/... -> <repo>/src/...
  let resolved;
  if (specifier.startsWith("#root/")) {
    resolved = path.join(srcRoot, specifier.slice("#root/".length));
  } else if (specifier.startsWith(".")) {
    resolved = path.resolve(path.dirname(fromFile), specifier);
  } else {
    // External module (express, etc.)
    return null;
  }

  const candidates = [];
  // Direct file
  candidates.push(resolved);
  candidates.push(`${resolved}.ts`);
  candidates.push(`${resolved}.js`);
  // Directory index
  candidates.push(path.join(resolved, "index.ts"));
  candidates.push(path.join(resolved, "index.js"));

  for (const c of candidates) {
    if (fileExists(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function parseImports(filePath) {
  const text = readText(filePath);
  const imports = new Map(); // localName -> { type, specifier, importedName? }

  // default import: import X from "..."
  for (const m of text.matchAll(/import\s+([A-Za-z0-9_$]+)\s+from\s+["']([^"']+)["']/g)) {
    imports.set(m[1], { type: "default", specifier: m[2] });
  }

  // named imports: import { A, B as C } from "..."
  for (const m of text.matchAll(/import\s+\{\s*([^}]+)\s*\}\s+from\s+["']([^"']+)["']/g)) {
    const spec = m[2];
    const parts = m[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const part of parts) {
      const mm = part.match(/^([A-Za-z0-9_$]+)(?:\s+as\s+([A-Za-z0-9_$]+))?$/);
      if (!mm) continue;
      const importedName = mm[1];
      const localName = mm[2] || importedName;
      imports.set(localName, { type: "named", specifier: spec, importedName });
    }
  }

  return imports;
}

function resolveImportedIdentifier(filePath, identifier) {
  const imports = parseImports(filePath);
  const info = imports.get(identifier);
  if (!info) return null;

  const moduleFile = resolveModule(info.specifier, filePath);
  if (!moduleFile) return null;

  if (info.type === "default") return moduleFile;

  // named: resolve re-exports like `export { default as X } from "./XRoute";`
  const moduleText = readText(moduleFile);
  const exportRe = new RegExp(
    String.raw`export\s*\{\s*default\s+as\s+${info.importedName}\s*\}\s*from\s*["']([^"']+)["']`,
    "g",
  );
  const m = exportRe.exec(moduleText);
  if (m) return resolveModule(m[1], moduleFile);

  // fallback: if module directly exports identifier from local file with same name
  // e.g. export { X } from "./X";
  const exportNamedRe = new RegExp(
    String.raw`export\s*\{\s*${info.importedName}(?:\s+as\s+[A-Za-z0-9_$]+)?\s*\}\s*from\s*["']([^"']+)["']`,
    "g",
  );
  const m2 = exportNamedRe.exec(moduleText);
  if (m2) return resolveModule(m2[1], moduleFile);

  return moduleFile;
}

function joinUrlPath(a, b) {
  const left = (a || "").trim();
  const right = (b || "").trim();
  const x = `/${left}`.replace(/\/+/g, "/").replace(/\/$/, "");
  const y = `/${right}`.replace(/\/+/g, "/");
  return (x + y).replace(/\/+/g, "/");
}

function extractRoutesFromFile(filePath) {
  const text = readText(filePath);
  const endpoints = []; // { method, path }
  const uses = []; // { path, routerIdent }

  // router.<method>("path", ...)
  for (const m of text.matchAll(
    /([A-Za-z0-9_$]+)\s*\.\s*(get|post|put|delete|patch|options|head)\s*\(\s*(['"`])([^'"`]+)\3\s*,/g,
  )) {
    endpoints.push({ method: m[2].toUpperCase(), path: m[4] });
  }

  // router.use("/prefix", ..., RouterIdent);
  for (const m of text.matchAll(/([A-Za-z0-9_$]+)\s*\.\s*use\s*\(\s*(['"`])([^'"`]+)\2\s*,([^;]+)\);/g)) {
    const usePath = m[3];
    const args = m[4]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const last = args[args.length - 1] || "";
    const ident = last.match(/^([A-Za-z0-9_$]+)$/)?.[1] || null;
    if (ident) uses.push({ path: usePath, routerIdent: ident });
  }

  return { endpoints, uses };
}

function collectAllRoutes(entryFile) {
  const visited = new Set();
  const collected = []; // { method, fullPath, sourceFile }

  function walk(filePath, prefix) {
    const key = `${filePath}::${prefix}`;
    if (visited.has(key)) return;
    visited.add(key);

    const { endpoints, uses } = extractRoutesFromFile(filePath);

    for (const ep of endpoints) {
      collected.push({
        method: ep.method,
        fullPath: joinUrlPath(prefix, ep.path),
        sourceFile: filePath,
      });
    }

    for (const u of uses) {
      const childFile = resolveImportedIdentifier(filePath, u.routerIdent);
      if (!childFile) continue;
      walk(childFile, joinUrlPath(prefix, u.path));
    }
  }

  // start from src/index.ts app.use mounts
  const text = readText(entryFile);
  const entryImports = parseImports(entryFile);

  // app.get/post/... for direct endpoints in entry
  for (const m of text.matchAll(
    /app\s*\.\s*(get|post|put|delete|patch|options|head)\s*\(\s*(['"`])([^'"`]+)\2\s*,/g,
  )) {
    collected.push({
      method: m[1].toUpperCase(),
      fullPath: joinUrlPath("", m[3]),
      sourceFile: entryFile,
    });
  }

  // app.use("/prefix", ..., RouterIdent);
  for (const m of text.matchAll(/app\s*\.\s*use\s*\(\s*(['"`])([^'"`]+)\1\s*,([^;]+)\);/g)) {
    const mount = m[2];
    const args = m[3]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const last = args[args.length - 1] || "";
    const ident = last.match(/^([A-Za-z0-9_$]+)$/)?.[1] || null;
    if (!ident) continue;

    const info = entryImports.get(ident);
    if (!info) continue;

    const routerFile = resolveImportedIdentifier(entryFile, ident);
    if (!routerFile) continue;

    walk(routerFile, joinUrlPath("", mount));
  }

  // normalize & de-dupe
  const uniq = new Map(); // key -> route
  for (const r of collected) {
    const fullPath = r.fullPath.replace(/\/+/g, "/");
    const key2 = `${r.method} ${fullPath}`;
    if (!uniq.has(key2)) uniq.set(key2, { ...r, fullPath });
  }
  return Array.from(uniq.values()).sort((a, b) => {
    if (a.fullPath === b.fullPath) return a.method.localeCompare(b.method);
    return a.fullPath.localeCompare(b.fullPath);
  });
}

function buildPostmanCollection(routes) {
  const folders = new Map(); // folderName -> items[]

  function folderNameForPath(p) {
    const first = p.split("/").filter(Boolean)[0] || "root";
    return first;
  }

  for (const r of routes) {
    const folder = folderNameForPath(r.fullPath);
    if (!folders.has(folder)) folders.set(folder, []);

    const name = `${r.method} ${r.fullPath}`;

    const item = {
      name,
      request: {
        method: r.method,
        header: [
          { key: "Accept", value: "application/json" },
          { key: "Content-Type", value: "application/json" },
          // For routes behind AccessToken middleware:
          { key: "Authorization", value: "Bearer {{accessToken}}", type: "text" },
        ],
        url: "{{baseUrl}}" + r.fullPath,
        description: `Source: ${path.relative(repoRoot, r.sourceFile)}`,
      },
    };

    // Provide an empty JSON body for typical write methods
    if (["POST", "PUT", "PATCH"].includes(r.method)) {
      item.request.body = { mode: "raw", raw: "{}" };
    }

    folders.get(folder).push(item);
  }

  const items = Array.from(folders.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([folder, item]) => ({
      name: folder,
      item,
    }));

  return {
    info: {
      name: "api-kasirq",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    variable: [
      { key: "baseUrl", value: "http://127.0.0.1:3001" },
      { key: "accessToken", value: "" },
    ],
    item: items,
  };
}

function buildPostmanEnvironment() {
  return {
    id: "api-kasirq-local",
    name: "api-kasirq (local)",
    values: [
      { key: "baseUrl", value: "http://127.0.0.1:3001", enabled: true },
      { key: "accessToken", value: "", enabled: true },
    ],
    _postman_variable_scope: "environment",
    _postman_exported_at: new Date().toISOString(),
    _postman_exported_using: "codex-cli",
  };
}

function main() {
  const entry = path.join(srcRoot, "index.ts");
  const routes = collectAllRoutes(entry);

  const collection = buildPostmanCollection(routes);
  const env = buildPostmanEnvironment();

  const outCollection = path.join(repoRoot, "postman", "api-kasirq.postman_collection.json");
  const outEnv = path.join(repoRoot, "postman", "api-kasirq.postman_environment.json");

  fs.writeFileSync(outCollection, JSON.stringify(collection, null, 2) + "\n");
  fs.writeFileSync(outEnv, JSON.stringify(env, null, 2) + "\n");

  console.log(`Wrote: ${path.relative(repoRoot, outCollection)}`);
  console.log(`Wrote: ${path.relative(repoRoot, outEnv)}`);
  console.log(`Routes: ${routes.length}`);
}

main();
