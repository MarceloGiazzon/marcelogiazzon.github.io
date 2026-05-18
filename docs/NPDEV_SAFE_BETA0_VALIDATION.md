# NPDev Safe Beta0 Validation

Web Checkpoint 002 makes Safe Beta0 the only active feature level for the static artifact generator. The site rejects generated artifacts that rely on advanced NPDev surfaces that are not safe defaults for Beta0 generation.

## Why This Exists

Gemini can produce syntactically valid JSON that still promises runtime behavior NPDevGenerator should not accept in Safe Beta0. The browser validation now hard-fails those artifacts before ZIP download, so unsafe outputs do not look successful.

Local NPDev schema validation and generator validation remain the final authority.

## Active Contract

- Site build: `Safe Beta0 Contract Enforcement 002`
- Site contract mode: `Safe Beta0`
- Prompt contract: `NPDEV_PRECISE_FORMAT_GUIDE v4`
- Bundle schema: `npdev-static-generator-artifact-bundle.v4`
- Validation mode: `lightweight-contract-validation`

Use `?v=safe-beta0-002` or a hard browser refresh when testing deployed Pages output to avoid stale cached JavaScript.

## Allowed Safe Beta0 Features

- Field types: `string`, `uuid`, `integer`, `decimal`, `boolean`, `date`
- UI widgets: `text`, `textarea`, `checkbox`, `date`, `email`
- Capability operations: `save`
- Flow steps: `enforceInvariants`, `capabilityCall` with `op: save`, `emitEvent` with `from`, `return`
- Relationships: plain ID fields such as `patientId` and `doctorId`
- Status values: `string` fields, with allowed values documented in markdown
- Endpoints: `GET /api/flows`, `POST /api/flows/<FlowName>/execute`, `GET /api/audit`, `GET /api/correlations/{correlationId}`

## Forbidden Safe Beta0 Features

- `field.type = reference`
- `field.type = enum`
- `field.type = datetime`
- `field.ui.widget = search-dialog`
- invariant expressions containing `now(`
- flow step type `assign`
- capability operations `findById`, `findAll`, `delete`
- flow step operations `findById`, `findAll`, `delete`
- object-shaped `emitEvent.payload`
- expected active CRUD endpoints under `/api/v1`
- expected active CRUD endpoints under `/api/clinic`
- `DELETE /...` endpoints
- `PUT /api/...` endpoints
- `GET /api/.../{id}` concept CRUD endpoints
- `POST /api/...` concept CRUD endpoints outside `/api/flows/<FlowName>/execute`

## Safe Fallbacks

- Replace `reference` with a `uuid` field such as `patientId` plus label `Patient ID`.
- Replace `enum` with `string` and document allowed values in `expected-behavior.md` or `generation-notes.md`.
- Replace `datetime` with `date` or `string` and document the expected format.
- Replace retrieval promises with flow execution notes; do not promise `findAll` endpoints.
- Replace updates with full-object `save` only when appropriate, otherwise document the limitation as future work.
- Replace CRUD endpoints with flow endpoints.

## Manifest Input Files

Every path listed in `manifest.json` `inputFiles` must also exist in `artifacts[]`. For example, `input/example-request.json` is valid only when the artifact bundle includes an artifact with that exact path.

## Testing

1. Serve the static site from the detected static site root.
2. Open `http://localhost:8088`.
3. Confirm the visible build label says `Safe Beta0 Contract Enforcement 002`.
4. Use Mock provider and generate artifacts.
5. Confirm the validation box says `Safe Beta0 validation: PASSED`.
6. Preview the prompt and confirm it says `npdev-static-generator-artifact-bundle.v4`, `SAFE BETA0 HARD RULES`, forbidden advanced features, and safe fallbacks.
7. Load `tests/fixtures/unsafe-gemini-response-clinic-appointment.json` as the raw bundle in a browser test or by pasting its JSON through the validation path.
8. Confirm validation fails and errors mention `reference`, `search-dialog`, `datetime`, `enum`, `findById`, `findAll`, `/api/v1`, `/api/clinic`, `DELETE`, and missing manifest input artifacts.

If the Worker returns `upstream_error` with status `503` or Gemini `UNAVAILABLE`, the site shows: `Gemini is temporarily unavailable or overloaded. Try again later, reduce max output tokens, or switch model.` The raw error JSON remains visible in the raw/debug panel and is not parsed as an artifact bundle.

The unsafe fixture is expected to fail Safe Beta0 validation.

## Repair Prompt

When validation fails, click `Copy repair prompt`. It copies the original raw response, validation errors, and the Safe Beta0 repair rules so the bundle can be manually repaired by Gemini or another model. Automatic repair is intentionally not enabled in this checkpoint.
