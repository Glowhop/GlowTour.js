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
 *
 * Each report reads on its own: the types it names are either exported by the entry, imported at the
 * top of the report, or declared at its bottom when the entry uses them without exporting them.
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

  const options = { ...parsed.options, noEmit: true };
  const program = ts.createProgram(
    entries.map((entry) => entry.file),
    options,
  );
  const checker = program.getTypeChecker();
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: true });
  const typeFlags = ts.TypeFormatFlags.NoTruncation;

  // Types are printed from the scope of their declaration, so they keep the names of the source, such
  // as an import alias. When that scope cannot name a type, TypeScript expands it and qualifies what
  // it references as `import("/absolute/module").Name`: print it out of scope instead, which names
  // types after their declaration. Keep that name and remember its module in `modulesByName`, to
  // import or declare it in the report. A destructured
  // parameter prints its local bindings, an implementation detail: name it `props` or `values`.
  // Only a `{ ... }` or `[ ... ]` directly after `(` or `,` and followed by `:` is a parameter name.
  let modulesByName = new Map<string, string>();
  const typeText = (text: string) =>
    text
      .replace(/import\("([^"]*)"\)\.([\w$]+)/g, (_, module: string, name: string) => {
        modulesByName.set(name, module);
        return name;
      })
      .replace(/([(,]\s*)\{[^{}]*\}(\??):/g, "$1props$2:")
      .replace(/([(,]\s*)\[[^[\]]*\](\??):/g, "$1values$2:");
  const scopedText = (print: (scope: TypeScript.Node | undefined) => string, scope: TypeScript.Node) => {
    const text = print(scope);
    return typeText(text.includes('import("') ? print(undefined) : text);
  };
  // Out of scope, qualify every name: TypeScript would otherwise print `JSX.Element` as `Element`.
  const flagsFor = (node: TypeScript.Node | undefined) =>
    node ? typeFlags : typeFlags | ts.TypeFormatFlags.UseFullyQualifiedType;
  const signatureText = (signature: TypeScript.Signature, scope: TypeScript.Node) =>
    scopedText((node) => checker.signatureToString(signature, node, flagsFor(node)), scope);
  const symbolTypeText = (symbol: TypeScript.Symbol, scope: TypeScript.Node) =>
    scopedText((node) => checker.typeToString(checker.getTypeOfSymbol(symbol), node, flagsFor(node)), scope);

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

  // Members inherited from the standard library (for example `Error#stack`) are not this API, and
  // members keyed by a module-private `unique symbol` get a name that changes with every build.
  const isOwnMember = (member: TypeScript.Symbol) =>
    !member.name.startsWith("__@") &&
    (member.declarations?.every(
      (declaration) =>
        isPublicMember(declaration) && !program.isSourceFileDefaultLibrary(declaration.getSourceFile()),
    ) ??
      true);

  const printClass = (name: string, symbol: TypeScript.Symbol, declaration: TypeScript.ClassDeclaration) => {
    const typeParameters = declaration.typeParameters
      ? `<${declaration.typeParameters.map((parameter) => parameter.getText()).join(", ")}>`
      : "";
    const heritage = (declaration.heritageClauses ?? [])
      .map((clause) => ` ${clause.getText()}`)
      .join("");
    const members = checker
      .getPropertiesOfType(checker.getDeclaredTypeOfSymbol(symbol))
      .filter(isOwnMember)
      .map((member) => {
        const scope = member.valueDeclaration ?? declaration;
        const signatures = checker.getTypeOfSymbol(member).getCallSignatures();
        if (member.flags & ts.SymbolFlags.Method && signatures.length > 0) {
          return signatures
            .map((signature) => `    ${member.name}${signatureText(signature, scope)};`)
            .join("\n");
        }
        return `    ${member.name}: ${symbolTypeText(member, scope)};`;
      })
      .sort();
    const head = `class ${name}${typeParameters}${heritage}`;
    return members.length === 0 ? `${head} {}` : `${head} {\n${members.join("\n")}\n}`;
  };

  // The entries that export each symbol, to re-export it from the subpath that really provides it.
  const exportsOf = (entry: (typeof entries)[number]) => {
    const sourceFile = program.getSourceFile(entry.file);
    const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) throw new Error(`Cannot read the exports of ${entry.specifier} (${posix(entry.file)})`);
    return checker
      .getExportsOfModule(moduleSymbol)
      .map((exported) => ({
        name: exported.name,
        target: exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };
  const entryExports = new Map(entries.map((entry) => [entry, exportsOf(entry)]));
  const specifiersBySymbol = new Map<TypeScript.Symbol, string[]>();
  for (const [entry, exported] of entryExports) {
    for (const { target } of exported) {
      specifiersBySymbol.set(target, [...(specifiersBySymbol.get(target) ?? []), entry.specifier]);
    }
  }
  const reexportSpecifier = (owner: string, symbol: TypeScript.Symbol) =>
    (specifiersBySymbol.get(symbol) ?? [])
      .filter((specifier) => specifier === owner || specifier.startsWith(`${owner}/`))
      .sort((a, b) => a.length - b.length)[0] ?? owner;

  const printExport = (entryOwner: string | undefined, name: string, symbol: TypeScript.Symbol) => {
    const declarations = symbol.declarations ?? [];
    const overloaded = declarations.filter(ts.isFunctionDeclaration).length > 1;
    const printed = declarations
      .filter((declaration) => !(overloaded && ts.isFunctionDeclaration(declaration) && declaration.body))
      .map((declaration) => {
        const owner = ownerOf(declaration.getSourceFile().fileName);
        if (owner && owner !== entryOwner) {
          return `export { ${name} } from "${reexportSpecifier(owner, symbol)}";`;
        }
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
          return `function ${name}${signature ? signatureText(signature, declaration) : "()"};`;
        }
        if (ts.isClassDeclaration(declaration)) return printClass(name, symbol, declaration);
        return `const ${name}: ${symbolTypeText(symbol, declaration)};`;
      });
    return [...new Set(printed)].join("\n");
  };

  // What a package's sources can name: their top-level declarations, the bindings they import, and
  // the other exports of the modules they import from.
  const sourceScopes = new Map<
    string,
    { declarations: Map<string, TypeScript.Symbol>; imports: Map<string, string>; modules: Set<string> }
  >();
  const sourceScope = (packageDirectory: string) => {
    const cached = sourceScopes.get(packageDirectory);
    if (cached) return cached;
    const scope = {
      declarations: new Map<string, TypeScript.Symbol>(),
      imports: new Map<string, string>(),
      modules: new Set<string>(),
    };
    const sourceFiles = program
      .getSourceFiles()
      .filter((file) => posix(file.fileName).startsWith(packageDirectory) && !/\.test\.tsx?$/.test(file.fileName));
    for (const file of sourceFiles) {
      for (const statement of file.statements) {
        if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
          const from = statement.moduleSpecifier.text;
          const clause = statement.importClause;
          if (from.startsWith(".") || !clause) continue;
          scope.modules.add(from);
          const bind = (name: string, line: string) => {
            if (!scope.imports.has(name)) scope.imports.set(name, `${line} from "${from}";`);
          };
          if (clause.name) bind(clause.name.text, `import type ${clause.name.text}`);
          const bindings = clause.namedBindings;
          if (bindings && ts.isNamespaceImport(bindings)) {
            bind(bindings.name.text, `import type * as ${bindings.name.text}`);
          } else if (bindings) {
            for (const element of bindings.elements) {
              const imported = element.propertyName ? `${element.propertyName.text} as ` : "";
              bind(element.name.text, `import type { ${imported}${element.name.text} }`);
            }
          }
        } else if (
          (ts.isInterfaceDeclaration(statement) ||
            ts.isTypeAliasDeclaration(statement) ||
            ts.isClassDeclaration(statement) ||
            ts.isEnumDeclaration(statement) ||
            ts.isFunctionDeclaration(statement)) &&
          statement.name
        ) {
          const symbol = checker.getSymbolAtLocation(statement.name);
          if (symbol && !scope.declarations.has(statement.name.text)) {
            scope.declarations.set(statement.name.text, symbol);
          }
        }
      }
    }
    sourceScopes.set(packageDirectory, scope);
    return scope;
  };
  const packageDirectoryOf = (fileName: string) => /^packages\/[^/]+\//.exec(posix(fileName))?.[0];
  const packageNameOf = (fileName: string) =>
    [...posix(fileName).matchAll(/node_modules\/(@[^/]+\/[^/]+|[^/@][^/]*)\//g)]
      .at(-1)?.[1]
      ?.replace(/^@types\/(?:(.+)__)?(.+)$/, (_, scope, name) => (scope ? `@${scope}/${name}` : name));
  const externalImport = (packageName: string | undefined, name: string, containingFile: string) => {
    if (!packageName) return undefined;
    const resolved = ts.resolveModuleName(packageName, containingFile, options, ts.sys)
      .resolvedModule?.resolvedFileName;
    const moduleFile = resolved && program.getSourceFile(resolved);
    const moduleSymbol = moduleFile && checker.getSymbolAtLocation(moduleFile);
    if (!moduleSymbol || !checker.getExportsOfModule(moduleSymbol).some((exported) => exported.name === name)) {
      return undefined;
    }
    return `import type { ${name} } from "${packageName}";`;
  };

  // A type a dependency uses in its public types without exporting it, such as Vue's
  // `ToResolvedProps`: copy its declaration.
  const dependencyDeclaration = (name: string) => {
    for (const file of program.getSourceFiles()) {
      if (!posix(file.fileName).includes("node_modules/") || program.isSourceFileDefaultLibrary(file)) continue;
      const statement = file.statements.find(
        (candidate) =>
          (ts.isTypeAliasDeclaration(candidate) || ts.isInterfaceDeclaration(candidate)) &&
          candidate.name.text === name,
      );
      if (statement) {
        return {
          declaration: printer
            .printNode(ts.EmitHint.Unspecified, statement, file)
            .replace(/^(export\s+)?(declare\s+)?/, ""),
        };
      }
    }
    return undefined;
  };

  // Finds what a report is missing for `name`: an import line, or the declaration the entry uses
  // without exporting it.
  const resolveName = (entry: (typeof entries)[number], name: string, module: string | undefined) => {
    if (module?.includes("/node_modules/")) {
      const line = externalImport(packageNameOf(module), name, entry.file);
      if (line) return { line };
    }
    const packageDirectory = packageDirectoryOf(module ?? entry.file) ?? packageDirectoryOf(entry.file);
    if (!packageDirectory) return undefined;
    const scope = sourceScope(packageDirectory);
    const symbol = scope.declarations.get(name);
    if (symbol) {
      const specifier = specifiersBySymbol.get(symbol)?.[0];
      if (specifier) return { line: `import type { ${name} } from "${specifier}";` };
      return { declaration: printExport(ownerOf(symbol.declarations?.[0]?.getSourceFile().fileName ?? ""), name, symbol) };
    }
    const line =
      scope.imports.get(name) ??
      [...scope.modules]
        .filter((specifier) => !specifier.startsWith("@glowhop/"))
        .map((specifier) => externalImport(specifier, name, entry.file))
        .find(Boolean);
    return line ? { line } : dependencyDeclaration(name);
  };

  // An adapter exports a `TourState` bound to its content, while its sources also name the generic
  // `TourState<T>` of the core. The report cannot name both: qualify the generic one with its module.
  const genericSpecifier = (name: string) =>
    [...specifiersBySymbol]
      .filter(([symbol]) =>
        symbol.name === name &&
        symbol.declarations?.some(
          (declaration) =>
            (ts.isInterfaceDeclaration(declaration) ||
              ts.isTypeAliasDeclaration(declaration) ||
              ts.isClassDeclaration(declaration)) &&
            (declaration.typeParameters?.length ?? 0) > 0,
        ),
      )
      .flatMap(([, specifiers]) => specifiers)
      .sort((a, b) => a.length - b.length)[0];

  const drafts = entries.map((entry) => {
    modulesByName = new Map();
    const entryOwner = ownerOf(entry.file);
    const blocks = (entryExports.get(entry) ?? []).map(({ name, target }) => printExport(entryOwner, name, target));
    return {
      blocks,
      declarations: new Map<string, string>(),
      entry,
      imports: new Set<string>(),
      modules: modulesByName,
      qualified: new Map<string, string>(),
    };
  });

  const render = (draft: (typeof drafts)[number]) => {
    const qualify = (text: string) =>
      [...draft.qualified].reduce(
        (qualified, [name, specifier]) =>
          qualified.replace(new RegExp(`(?<![\\w$.])${name}<`, "g"), `import("${specifier}").${name}<`),
        text,
      );
    // One `import type { ... }` line per module, after namespace and default imports.
    const named = new Map<string, string[]>();
    const whole: string[] = [];
    for (const line of draft.imports) {
      const [, bindings, from] = /^import type \{ (.+) \} from "(.+)";$/.exec(line) ?? [];
      if (bindings && from) named.set(from, [...(named.get(from) ?? []), bindings]);
      else whole.push(line);
    }
    const imports = [
      ...whole.sort(),
      ...[...named]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([from, bindings]) => `import type { ${bindings.sort().join(", ")} } from "${from}";`),
    ];
    return [
      ...(imports.length > 0 ? [imports.join("\n")] : []),
      ...draft.blocks.map(qualify),
      ...(draft.declarations.size > 0
        ? [
            "// Used by the API above, but not exported by this entry.",
            ...[...draft.declarations].sort(([a], [b]) => a.localeCompare(b)).map(([, text]) => qualify(text)),
          ]
        : []),
    ].join("\n\n");
  };

  // Declarations added for a missing name can name further types: resolve until nothing changes.
  for (let pass = 0; pass < 10; pass++) {
    const missing = findUnresolvedNames(
      root,
      options,
      program,
      new Map(drafts.map((draft) => [reportPath(draft.entry.specifier), render(draft)])),
    );
    let progressed = false;
    for (const draft of drafts) {
      const path = reportPath(draft.entry.specifier);
      for (const name of missing.notGeneric.get(path) ?? []) {
        const specifier = genericSpecifier(name);
        if (specifier && !draft.qualified.has(name)) {
          draft.qualified.set(name, specifier);
          progressed = true;
        }
      }
      for (const name of missing.names.get(path) ?? []) {
        modulesByName = draft.modules;
        const resolved = resolveName(draft.entry, name, draft.modules.get(name));
        if (resolved?.line && !draft.imports.has(resolved.line)) {
          draft.imports.add(resolved.line);
          progressed = true;
        } else if (resolved?.declaration && !draft.declarations.has(name)) {
          draft.declarations.set(name, resolved.declaration);
          progressed = true;
        }
      }
    }
    if (!progressed) break;
  }

  const reports = new Map<string, string>();
  for (const draft of drafts) {
    reports.set(
      reportPath(draft.entry.specifier),
      [
        `# \`${draft.entry.specifier}\``,
        "",
        `Generated by \`bun run api:report\` from \`${posix(draft.entry.file)}\`. Do not edit by hand.`,
        "",
        "```ts",
        render(draft),
        "```",
        "",
      ].join("\n"),
    );
  }
  return reports;
}

const REPORT_CODE = /^```ts\n([\s\S]*)\n```\n$/m;
// "Cannot find name", with or without a suggestion, and "Cannot find namespace".
const MISSING_NAME_CODES = new Set([2304, 2503, 2552]);
// A name that exists but is used wrongly: missing export, unknown module, wrong type arguments.
const INVALID_REFERENCE_CODES = new Set([2305, 2307, 2314, 2315, 2694, 2724]);

function checkReports(
  root: string,
  options: TypeScript.CompilerOptions,
  reports: Map<string, string>,
  oldProgram?: TypeScript.Program,
) {
  const ts: typeof TypeScript = createRequire(join(root, "package.json"))("typescript");
  // Each report is checked as a module next to its Markdown file. `export {}` keeps its names out of
  // the global scope of the other reports. A `.ts` file, because `skipLibCheck` would skip a `.d.ts`:
  // only name resolution is read, not the errors about bodies missing from its declarations.
  const sources = new Map(
    [...reports].map(([path, content]) => [
      join(root, path.replace(/^api\/([^/]+)-tour\/(.+)\.api\.md$/, "packages/$1/$2.api-report-check.ts")),
      { path, text: `${REPORT_CODE.exec(content)?.[1] ?? content}\nexport {};\n` },
    ]),
  );
  const host = ts.createCompilerHost(options);
  const { fileExists, getSourceFile, readFile } = host;
  host.fileExists = (fileName) => sources.has(fileName) || fileExists.call(host, fileName);
  host.readFile = (fileName) => sources.get(fileName)?.text ?? readFile.call(host, fileName);
  host.getSourceFile = (fileName, languageVersion, ...rest) => {
    const source = sources.get(fileName);
    return source
      ? ts.createSourceFile(fileName, source.text, languageVersion, true)
      : getSourceFile.call(host, fileName, languageVersion, ...rest);
  };
  const program = ts.createProgram([...sources.keys()], { ...options, noEmit: true }, host, oldProgram);
  return [...sources].flatMap(([fileName, { path }]) => {
    const sourceFile = program.getSourceFile(fileName);
    if (!sourceFile) return [];
    return program
      .getSemanticDiagnostics(sourceFile)
      .filter((diagnostic) => diagnostic.start !== undefined && diagnostic.length !== undefined)
      .map((diagnostic) => ({
        code: diagnostic.code,
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        name: sourceFile.text.slice(diagnostic.start, (diagnostic.start ?? 0) + (diagnostic.length ?? 0)),
        path,
      }));
  });
}

function findUnresolvedNames(
  root: string,
  options: TypeScript.CompilerOptions,
  program: TypeScript.Program,
  sources: Map<string, string>,
) {
  const names = new Map<string, Set<string>>();
  const notGeneric = new Map<string, Set<string>>();
  for (const diagnostic of checkReports(root, options, sources, program)) {
    // "Type 'X' is not generic" spans the whole `X<...>` reference.
    const found = MISSING_NAME_CODES.has(diagnostic.code) ? names : diagnostic.code === 2315 ? notGeneric : null;
    const name = diagnostic.code === 2315 ? /^[\w$]+/.exec(diagnostic.name)?.[0] : diagnostic.name;
    if (found && name) found.set(diagnostic.path, (found.get(diagnostic.path) ?? new Set()).add(name));
  }
  return { names, notGeneric };
}

/** Lists the names each report uses but that do not resolve, or resolve to the wrong kind of symbol. */
export function findInvalidReportReferences(root: string, reports: Map<string, string>) {
  const ts: typeof TypeScript = createRequire(join(root, "package.json"))("typescript");
  const configFile = ts.readConfigFile(join(root, "tsconfig.json"), ts.sys.readFile);
  const { options } = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
  return checkReports(root, options, reports)
    .filter((diagnostic) => MISSING_NAME_CODES.has(diagnostic.code) || INVALID_REFERENCE_CODES.has(diagnostic.code))
    .map((diagnostic) => `${diagnostic.path}: ${diagnostic.message}`);
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
