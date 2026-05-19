# NPDev Safe Beta0 Validation

Web Checkpoint 002 makes Safe Beta0 the only active feature level for the static artifact generator. The site rejects generated artifacts that rely on advanced NPDev surfaces that are not safe defaults for Beta0 generation.

## Why This Exists

Gemini can produce syntactically valid JSON that still promises runtime behavior NPDevGenerator should not accept in Safe Beta0. The browser validation now hard-fails those artifacts before ZIP download, so unsafe outputs do not look successful.

Local NPDev schema validation and generator validation remain the final authority.

## Active Contract

- Site build: `Safe Beta0 Final Prompt Corrections 004D`
- Site contract mode: `Safe Beta0`
- Prompt contract: `NPDEV_PRECISE_FORMAT_GUIDE v4`
- Bundle schema: `npdev-static-generator-artifact-bundle.v4`
- Validation mode: `lightweight-contract-validation`

Use `?v=safe-beta0-004d` or a hard browser refresh when testing deployed Pages output to avoid stale cached JavaScript.

Checkpoint 003 uses compact schema guidance by default. The browser still loads schema metadata from `contracts/`, but normal Gemini requests include only schema names, hashes, Safe Beta0 rules, and a minimal artifact shape. The debug-only full schema prompt mode is off by default because it can exceed proxy limits.

Checkpoint 003B calibrates the proxy limit separately from Gemini context size. Browser diagnostics classify request JSON size as OK under 64 KB, notice from 64-96 KB, warning from 96-128 KB, and blocked above the Worker hard limit of 128 KB. The Worker clamps requested output tokens to 32,000 and reports clamp diagnostics.

Checkpoint 004 adds NPDev schema shape validation. Artifacts now fail when they avoid forbidden Safe Beta0 features but still invent site-local config paths, wrong flow property names, JavaScript-like invariant expressions, empty persistence bindings, or sample-style manifest keys that do not match this static artifact bundle handoff contract.

Checkpoint 004B narrows capability validation so `eventBus.operations: ["emitEvent"]` is allowed. The `save`-only operation rule applies to the `persistence` capability. Object-shaped `emitEvent.payload` remains a hard failure.

Checkpoint 004D makes the final prompt corrections for near-valid Safe Beta0 output: `trialDefaults.apiKey` must be exactly `dev-key`, real secrets are forbidden, and appointment future-date checks must be documented as limitations instead of implemented with function calls in `model.json`.

## Allowed Safe Beta0 Features

- Field types: `string`, `uuid`, `integer`, `decimal`, `boolean`, `date`
- UI widgets: `text`, `textarea`, `checkbox`, `date`, `email`
- Persistence capability operations: `save`
- Event bus capability operations: `emitEvent`
- Flow steps: `enforceInvariants`, `capabilityCall` with persistence `op: save`, `emitEvent` with `event` and `from`, `return`
- Relationships: plain ID fields such as `patientId` and `doctorId`
- Status values: `string` fields, with allowed values documented in markdown
- Endpoints: `GET /api/flows`, `POST /api/flows/<FlowName>/execute`, `GET /api/audit`, `GET /api/correlations/{correlationId}`

## Forbidden Safe Beta0 Features

- `field.type = reference`
- `field.type = enum`
- `field.type = datetime`
- `field.ui.widget = search-dialog`
- invariant expressions containing `now(`
- invariant expressions containing functions such as `date(`, `today(`, `now(`, `includes(`, or `regex(`
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

## Download Filenames

Generated bundle downloads use the same base filename for JSON and ZIP:

`npdev-artifact-bundle_Gemini-Flash_ProjectName_dd-MM-yyyy`

For example:

- `npdev-artifact-bundle_Gemini-Flash_Clinic-Appointment-Manager_18-05-2026.json`
- `npdev-artifact-bundle_Gemini-Flash_Clinic-Appointment-Manager_18-05-2026.zip`

The project segment comes from `bundle.project.name` when present, then `bundle.project.scenarioId`. Filename segments replace spaces with `-`, remove invalid filename characters, collapse repeated `-`, and trim leading/trailing `-`.

## Schema Shape Rules

The browser expects NPDevGenerator-oriented config paths:

- `scenario.outputRoot`: `..\Output`
- `bootstrap.root`: `..\..\NPDevRuntimeHost`
- `artifact.root`: `..\Output\ArtifactNP`
- `finalExec.root`: `..\Output\App`
- `runtime.springProfile`: `dev,step0,trial`

The browser rejects website-local paths such as `contracts/config.schema.json`, `output/<scenario>`, `bootstrap`, `artifacts`, and `final-exec`.

`config.json` must include `trialDefaults.apiKey: "dev-key"`. The browser rejects `YOUR_API_KEY`, `YOUR_API_KEY_HERE`, `placeholder`, empty strings, and any other value for this field. Generated artifacts must not contain real secrets.

Safe Beta0 flows must use:

- `flow.input.concept`
- `flow.input.mode`
- `step.cap`
- `step.op`
- `step.args`
- `step.out`
- `return.value`
- `enforceInvariants.scope`
- `enforceInvariants.invariants`
- `invariant.expr`

The browser rejects `flow.concept`, field-map `input` objects, `step.capability`, `step.operation`, `step.map`, `invariant.expression`, JavaScript expressions such as `.includes()`, array literals, and function calls.

For appointment dates, use `AppointmentDateRequired` with `expr: "appointmentDate != null"`. Do not enforce future-date logic in `model.json`; document it in `generation-notes.md` and `qualityGates.riskNotes` as a Safe Beta0 limitation.

Safe Beta0 event emission must use:

```json
{
  "name": "emit-event",
  "type": "emitEvent",
  "event": "EventName",
  "from": "$saved"
}
```

The browser rejects object-shaped `emitEvent.payload`. Do not use `payload`, `map`, or `from: "EventName"` for event emission.

When persistence is used, `model.bindings` must include `persistence -> repository`. When events or `emitEvent` are present, it must include `eventBus -> inproc`.

The static artifact bundle manifest currently uses `id`, `title`, `complexity`, `mainFlow`, `purpose`, `businessStory`, `features`, `inputFiles`, `walkthrough`, and `expectedOutcomes`. Sample-manifest keys such as `sampleId`, `sampleName`, `category`, `primaryFlows`, `ownedConcepts`, and `verificationTargets` are rejected for this handoff.

## Testing

1. Serve the static site from the detected static site root.
2. Open `http://localhost:8088`.
3. Confirm the visible build label says `Safe Beta0 Final Prompt Corrections 004D`.
4. Use Mock provider and generate artifacts.
5. Confirm the validation box says `Safe Beta0 validation: PASSED`.
6. Preview the prompt and confirm it says `npdev-static-generator-artifact-bundle.v4`, `SAFE BETA0 HARD RULES`, forbidden advanced features, and safe fallbacks.
7. Load `tests/fixtures/unsafe-gemini-response-clinic-appointment.json` as the raw bundle in a browser test or by pasting its JSON through the validation path.
8. Confirm validation fails and errors mention `reference`, `search-dialog`, `datetime`, `enum`, `findById`, `findAll`, `/api/v1`, `/api/clinic`, `DELETE`, and missing manifest input artifacts.
9. Load `tests/fixtures/schema-shape-invalid-clinic-appointment-v4.json` through the validation path.
10. Confirm validation fails and errors mention wrong config paths, wrong flow shape, JavaScript-like invariants, empty bindings, and manifest shape mismatch.
11. Load `tests/fixtures/schema-shape-invalid-manifest-and-event-payload.json` through the validation path.
12. Confirm validation fails for missing manifest keys, sample-manifest keys, and object-shaped `emitEvent.payload`, but does not report `eventBus includes emitEvent`.
13. Load `tests/fixtures/near-valid-api-key-and-date-function.json` through the validation path.
14. Confirm validation fails only for `trialDefaults.apiKey` and the `AppointmentDateFuture` function call.

If the Worker returns `upstream_error` with status `503` or Gemini `UNAVAILABLE`, the site shows: `Gemini is temporarily unavailable or overloaded. Try again later, reduce max output tokens, or switch model.` The raw error JSON remains visible in the raw/debug panel and is not parsed as an artifact bundle.

The unsafe fixture is expected to fail Safe Beta0 validation.
The schema-shape fixture is also expected to fail Safe Beta0 validation.
The manifest/event-payload fixture is expected to fail Safe Beta0 validation for the precise reasons documented above.
The near-valid API key/date fixture is expected to fail Safe Beta0 validation for exactly those two issues.

## Repair Prompt

When validation fails, click `Copy repair prompt`. It copies the original raw response, validation errors, and the Safe Beta0 repair rules so the bundle can be manually repaired by Gemini or another model. Automatic repair is intentionally not enabled in this checkpoint.
