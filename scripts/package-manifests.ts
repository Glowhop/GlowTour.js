export type PackageManifest = Record<string, unknown> & {
  dependencies?: Record<string, string>;
  name: string;
  version: string;
};

type PackageVersions = Readonly<Record<string, string>>;

function preparePublishedValue(value: unknown, versions: PackageVersions): unknown {
  if (typeof value === "string") return value.replace("./dist/", "./");
  if (Array.isArray(value)) return value.map((entry) => preparePublishedValue(entry, versions));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        preparePublishedValue(nestedValue, versions),
      ]),
    );
  }
  return value;
}

function resolveDependencies(dependencies: Record<string, string> | undefined, versions: PackageVersions) {
  if (!dependencies) return undefined;
  return Object.fromEntries(
    Object.entries(dependencies).map(([name, version]) => {
      if (version !== "workspace:*") return [name, version];
      const targetVersion = versions[name];
      if (!targetVersion) throw new Error(`missing workspace version for ${name}`);
      return [name, targetVersion];
    }),
  );
}

export function buildPublishedManifest(source: PackageManifest, versions: PackageVersions): PackageManifest {
  const manifest = {
    ...source,
    dependencies: resolveDependencies(source.dependencies, versions),
    exports: preparePublishedValue(source.exports, versions),
    files: ["**/*"],
    sideEffects: source.sideEffects ?? false,
    types: preparePublishedValue(source.types, versions),
  };

  delete manifest.devDependencies;
  delete manifest.scripts;
  if (!manifest.dependencies) delete manifest.dependencies;
  return manifest;
}
