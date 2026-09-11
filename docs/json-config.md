# JSON-serializable tour config

This page moved. The user-facing format and usage documentation for building a workflow from a
plain, JSON-serializable object is maintained as a single document on the documentation site:

- Published: <https://glowtour.dev/docs/guides/json-config>
- Source: [`apps/website/src/content/docs/docs/guides/json-config.md`](../apps/website/src/content/docs/docs/guides/json-config.md)

Edit the source file above. This file is a pointer kept so existing links to `docs/json-config.md`
keep resolving; do not restate the format here, or the two copies will drift apart again.

The design rationale behind the format - why `WorkflowConfig` is generic over the content type,
which slots accept a `BuiltinAction` versus a plain function, and the entry-point wiring - stays in
[`json-config-design.md`](json-config-design.md).
