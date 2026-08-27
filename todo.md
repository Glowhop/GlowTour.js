
# Remaining work

The authoritative implementation status and exact recovery action live in
`AUDIT_IMPLEMENTATION_PROGRESS.md`.

## Before leaving `dev`

- Configure npm trusted publishing for the seven packages before the first stable GitHub Release.

Completed audit tasks are intentionally not duplicated here.

[ ] passer les méthodes du builder goNext() etc dans le do() en ajoutant next(), previous(), cancel() dans le context. puis supprimer goNext et goPrevious du WorkflowStepBuilder
[ ] renommer certains principes : goPrevious (canGoPrevious) -> previous , goNext (canGoNext) -> advance
[ ] corriger les tests
[ ] cleaner le flow de modification d'étape en cours de tuto
[ ] cleaner le code (ex: tour-controller)
[x] exporter useTour


