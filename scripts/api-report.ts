import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import type * as TypeScript from "typescript";

/**
 * Records the public API of every package entry point under `api/`, one Markdown file per entry.
 *
 * The reports are generated from the sources through the `paths` of the root `tsconfig.json`, which
 * maps each published specifier to its entry file. `bun test` compares them with the committed
 * files, so any public API change shows up in review as a diff under `api/`.
 */

const REPORT_DIRECTORY = "api";

export function reportPath(specifier: string) {
  const [, name, subpath] = /^@glowhop\/([^/]+)(?:\/(.+))?$/.exec(specifier) ?? [];
  if (!name) throw new Error(`Unexpected package entry specifier: ${specifier}`);
  return `${REPORT_DIRECTORY}/${name}/${subpath ?? "index"}.api.md`;
}

export function generateApiReports(root = process.cwd()): Map<string, string> {
  const ts: typeof TypeScript = createRequire(join(root, "package.json"))("typescript");
  const configFile = ts.readConfigFile(join(root, "tsconfig.json"), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
  const entries = Object.entries(parsed.options.paths ?? {})
    .filter(([specifier]) => specifier.startsWith("@glowhop/"))
    .map(([specifier, [file]]) => ({ file: resolve(root, file), specifier }))
    .sort((a, b) => a.specifier.localeCompare(b.specifier));

  const program = ts.createProgram(
    entries.map((entry) => entry.file),
    { ...parsed.options, noEmit: true },
  );
  const checker = program.getTypeChecker();
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: true });
  const typeFlags = ts.TypeFormatFlags.NoTruncation;

  // Inferred types reference their module by absolute path: keep only the type name. A destructured
  // parameter prints its local bindings, an implementation detail: name it `props` or `values`.
  // Only a `{ ... }` or `[ ... ]` directly after `(` or `,` and followed by `:` is a parameter name.
  const typeText = (text: string) =>
    text
      .replace(/import\("[^"]*"\)\./g, "")
      .replace(/([(,]\s*)\{[^{}]*\}(\??):/g, "$1props$2:")
      .replace(/([(,]\s*)\[[^[\]]*\](\??):/g, "$1values$2:");
  const signatureText = (signature: TypeScript.Signature) =>
    typeText(checker.signatureToString(signature, undefined, typeFlags));

  const posix = (fileName: string) => relative(root, fileName).replaceAll("\\", "/");
  const ownerOf = (fileName: string) => {
    const path = posix(fileName);
    const workspacePackage = /^packages\/([^/]+)\//.exec(path)?.[1];
    if (workspacePackage) return `@glowhop/${workspacePackage}-tour`;
    return /node_modules\/(@[^/]+\/[^/]+|[^/@][^/]*)\//.exec(path)?.[1];
  };

  const isPublicMember = (declaration: TypeScript.Declaration) => {
    const modifiers = ts.canHaveModifiers(declaration) ? ts.getModifiers(declaration) : undefined;
    const hidden = modifiers?.some(
      (modifier) =>
        modifier.kind === ts.SyntaxKind.PrivateKeyword ||
        modifier.kind === ts.SyntaxKind.ProtectedKeyword,
    );
    const name = ts.getNameOfDeclaration(declaration);
    return !hidden && !(name && ts.isPrivateIdentifier(name));
  };

  // Members inherited from the standard library (for example `Error#stack`) are not this API.
  const isOwnMember = (member: TypeScript.Symbol) =>
    member.declarations?.every(
      (declaration) =>
        isPublicMember(declaration) && !program.isSourceFileDefaultLibrary(declaration.getSourceFile()),
    ) ?? true;

  const printClass = (name: string, symbol: TypeScript.Symbol, declaration: TypeScript.ClassDeclaration) => {
    const heritage = (declaration.heritageClauses ?? [])
      .map((clause) => ` ${clause.getText()}`)
      .join("");
    const members = checker
      .getPropertiesOfType(checker.getDeclaredTypeOfSymbol(symbol))
      .filter(isOwnMember)
      .map((member) => {
        const memberType = checker.getTypeOfSymbol(member);
        const signatures = memberType.getCallSignatures();
        if (member.flags & ts.SymbolFlags.Method && signatures.length > 0) {
          return signatures.map((signature) => `    ${member.name}${signatureText(signature)};`).join("\n");
        }
        return `    ${member.name}: ${typeText(checker.typeToString(memberType, undefined, typeFlags))};`;
      })
      .sort();
    const head = `class ${name}${heritage}`;
    return members.length === 0 ? `${head} {}` : `${head} {\n${members.join("\n")}\n}`;
  };

  const printExport = (entryOwner: string | undefined, name: string, symbol: TypeScript.Symbol) => {
    const declarations = symbol.declarations ?? [];
    const overloaded = declarations.filter(ts.isFunctionDeclaration).length > 1;
    const printed = declarations
      .filter((declaration) => !(overloaded && ts.isFunctionDeclaration(declaration) && declaration.body))
      .map((declaration) => {
        const owner = ownerOf(declaration.getSourceFile().fileName);
        if (owner && owner !== entryOwner) return `export { ${name} } from "${owner}";`;
        if (
          ts.isInterfaceDeclaration(declaration) ||
          ts.isTypeAliasDeclaration(declaration) ||
          ts.isEnumDeclaration(declaration)
        ) {
          return printer
            .printNode(ts.EmitHint.Unspecified, declaration, declaration.getSourceFile())
            .replace(/^(export\s+)?(declare\s+)?/, "");
        }
        if (ts.isFunctionDeclaration(declaration)) {
          const signature = checker.getSignatureFromDeclaration(declaration);
          return `function ${name}${signature ? signatureText(signature) : "()"};`;
        }
        if (ts.isClassDeclaration(declaration)) return printClass(name, symbol, declaration);
        return `const ${name}: ${typeText(checker.typeToString(checker.getTypeOfSymbol(symbol), undefined, typeFlags))};`;
      });
    return [...new Set(printed)].join("\n");
  };

  const reports = new Map<string, string>();
  for (const entry of entries) {
    const sourceFile = program.getSourceFile(entry.file);
    const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) throw new Error(`Cannot read the exports of ${entry.specifier} (${posix(entry.file)})`);
    const entryOwner = ownerOf(entry.file);
    const blocks = checker
      .getExportsOfModule(moduleSymbol)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((exported) => {
        const target = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
        return printExport(entryOwner, exported.name, target);
      });
    reports.set(
      reportPath(entry.specifier),
      [
        `# \`${entry.specifier}\``,
        "",
        `Generated by \`bun run api:report\` from \`${posix(entry.file)}\`. Do not edit by hand.`,
        "",
        "```ts",
        blocks.join("\n\n"),
        "```",
        "",
      ].join("\n"),
    );
  }
  return reports;
}

function listReportFiles(root: string) {
  const directory = join(root, REPORT_DIRECTORY);
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".api.md"))
    .map((entry) => posixRelative(root, join(entry.parentPath, entry.name)))
    .sort();
}

function posixRelative(root: string, fileName: string) {
  return relative(root, fileName).replaceAll("\\", "/");
}

/** Lists the reports whose committed file differs from the sources, and committed reports no entry produces. */
export function compareApiReports(root: string, reports: Map<string, string>) {
  const changed = [...reports]
    .filter(([path, content]) => {
      const file = join(root, path);
      return !existsSync(file) || readFileSync(file, "utf8") !== content;
    })
    .map(([path]) => path);
  const stale = listReportFiles(root).filter((path) => !reports.has(path));
  return { changed, stale };
}

if (import.meta.main) {
  const root = process.cwd();
  const reports = generateApiReports(root);
  const { changed, stale } = compareApiReports(root, reports);
  if (process.argv.includes("--write")) {
    for (const path of stale) rmSync(join(root, path));
    for (const path of changed) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), reports.get(path) ?? "");
    }
    console.log(`API reports: ${changed.length} written, ${stale.length} removed, ${reports.size} total.`);
  } else if (changed.length > 0 || stale.length > 0) {
    console.error(
      `Public API reports are out of date: ${[...changed, ...stale].join(", ")}.\nRun \`bun run api:report\` and review the diff in ${REPORT_DIRECTORY}/.`,
    );
    process.exit(1);
  } else {
    console.log(`API reports are up to date (${reports.size} entries).`);
  }
}
