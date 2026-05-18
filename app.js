'use strict';

const $ = (id) => document.getElementById(id);

const state = {
  lastPrompt: '',
  lastRaw: '',
  lastBundle: null,
  lastFiles: []
};

const REQUIRED_ARTIFACT_PATHS = [
  'config.json',
  'model.json',
  'manifest.json',
  'expected-behavior.md',
  'expected-endpoints.md'
];

const OPTIONAL_ARTIFACT_PATHS = [
  'generation-notes.md',
  'input/example-request.json'
];

const NPDEV_RESPONSE_SCHEMA_HINT = {
  schemaVersion: 'npdev-static-generator-artifact-bundle.v2',
  project: {
    name: 'string',
    scenarioId: 'kebab-case-string',
    objective: 'string',
    assumptions: ['string'],
    warnings: ['string']
  },
  artifacts: [
    {
      path: 'config.json',
      content: {
        $schema: '..\\\\..\\\\NPDevContract\\\\schemas\\\\config.schema.json',
        configVersion: '1.0',
        scenario: {
          name: 'kebab-case-scenario-id',
          description: 'string',
          outputRoot: '..\\\\Output'
        },
        generator: {
          failIfModelMissing: true,
          failIfConfigMissing: true,
          cleanOutputBeforeGenerate: true,
          emitPluginAssets: true,
          emitRuntimeAssets: true,
          emitUiAssets: true
        },
        bootstrap: {
          root: '..\\\\..\\\\NPDevRuntimeHost',
          mergeStrategy: 'clean-copy'
        },
        artifact: {
          root: '..\\\\Output\\\\ArtifactNP',
          generatedFolderName: 'npdev-generated',
          libsFolderName: 'libs',
          metaFolderName: 'npdev-meta'
        },
        finalExec: {
          root: '..\\\\Output\\\\App',
          deleteBeforeMount: true
        },
        database: {
          provider: 'docker-postgres',
          host: 'localhost',
          port: 5432,
          database: 'scenario_database_name',
          username: 'finalexec',
          password: 'finalexec',
          adminDatabase: 'postgres',
          resetMode: 'reset',
          containerName: 'npdev-scenario-id'
        },
        runtime: {
          springProfile: 'dev,step0,trial',
          serverPort: 8083,
          javaArgs: [],
          gradleTask: 'bootRun'
        },
        trialDefaults: {
          apiKey: 'dev-key',
          recommendedProfiles: 'dev,step0,trial',
          runtimeUrl: 'http://localhost:8083/',
          databaseMode: 'step0-h2',
          pluginDiscoveryMode: 'filesystem-folder',
          pluginPackageDirectory: './npdev-generated/src/main/resources/npdev/plugin-packages',
          notes: ['string']
        }
      }
    },
    {
      path: 'model.json',
      content: {
        $schema: '..\\\\..\\\\NPDevContract\\\\schemas\\\\model.schema.json',
        namespace: 'trial.example',
        dslVersion: '1.0.0',
        version: '1.0',
        metadata: {
          purpose: 'string'
        },
        concepts: [
          {
            name: 'PascalCaseConcept',
            ui: {
              label: 'Human label'
            },
            fields: [
              {
                name: 'camelCaseField',
                type: 'uuid|string|integer|decimal|boolean|date|datetime|enum|reference',
                id: true,
                required: true,
                enumValues: ['optional for enum'],
                reference: {
                  target: 'OtherConcept',
                  displayField: 'name'
                },
                ui: {
                  label: 'Human label',
                  widget: 'text|textarea|select|checkbox|date|email|search-dialog'
                }
              }
            ],
            invariants: [
              {
                name: 'PascalCaseRuleName',
                expr: "fieldName != null && fieldName != ''"
              }
            ]
          }
        ],
        capabilities: [
          {
            name: 'persistence',
            type: 'PersistenceCapability',
            operations: ['save']
          }
        ],
        bindings: [
          {
            capability: 'persistence',
            adapter: 'repository'
          },
          {
            capability: 'eventBus',
            adapter: 'inproc'
          }
        ],
        events: [
          {
            name: 'PascalCaseEvent',
            payload: [
              { name: 'id', type: 'uuid' }
            ]
          }
        ],
        flows: [
          {
            name: 'PascalCaseFlowName',
            input: {
              concept: 'PascalCaseConcept',
              mode: 'create'
            },
            steps: [
              {
                name: 'validate-input',
                type: 'enforceInvariants',
                scope: 'PascalCaseConcept',
                invariants: ['PascalCaseRuleName']
              },
              {
                name: 'save-record',
                type: 'capabilityCall',
                cap: 'persistence',
                op: 'save',
                args: ['$input'],
                out: '$saved'
              },
              {
                name: 'return-record',
                type: 'return',
                value: '$saved'
              }
            ]
          }
        ]
      }
    },
    {
      path: 'manifest.json',
      content: {
        id: 'scenario-id',
        title: 'Human title',
        complexity: 'simple|medium|tenant',
        mainFlow: 'PascalCaseFlowName',
        purpose: 'string',
        businessStory: 'string',
        features: ['concept', 'invariants', 'persistence', 'event', 'trace'],
        inputFiles: ['input/example-request.json'],
        walkthrough: ['string'],
        expectedOutcomes: ['string']
      }
    },
    {
      path: 'expected-behavior.md',
      content: '# Expected Behavior\\n\\n...'
    },
    {
      path: 'expected-endpoints.md',
      content: '# Expected Endpoints\\n\\n...'
    },
    {
      path: 'generation-notes.md',
      content: '# Generation Notes\\n\\n...'
    }
  ],
  qualityGates: {
    missingInformation: ['string'],
    riskNotes: ['string'],
    humanReviewChecklist: ['string'],
    beta0ScopeNotes: ['string']
  }
};

function setStatus(kind, title, message) {
  const dot = $('statusDot');
  dot.classList.remove('busy', 'error');
  if (kind === 'busy') dot.classList.add('busy');
  if (kind === 'error') dot.classList.add('error');
  $('statusTitle').textContent = title;
  $('statusMessage').textContent = message;
}

function splitCsv(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toKebabCase(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'npdev-generated-app';
}

function toPascalCase(value) {
  return String(value || '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('') || 'GeneratedEntity';
}

function getFormValues() {
  const projectName = $('projectName').value.trim();
  return {
    projectName,
    scenarioId: toKebabCase($('scenarioId').value.trim() || projectName),
    objective: $('objective').value.trim(),
    entities: splitCsv($('entities').value),
    mainFlow: toPascalCase($('mainFlow').value.trim() || 'MainBusinessFlow'),
    backendTarget: $('backendTarget').value,
    databaseProvider: $('databaseProvider').value,
    serverPort: Number($('serverPort').value || 8083),
    complexity: $('complexity').value,
    constraints: $('constraints').value.trim(),
    provider: $('provider').value,
    model: $('model').value.trim() || 'gemini-2.5-flash',
    endpoint: $('endpoint').value.trim(),
    temperature: Number($('temperature').value || 0.1),
    maxTokens: Number($('maxTokens').value || 8000)
  };
}

function buildNpdevPrompt(input) {
  const projectName = input.projectName || 'Generated NPDev Application';
  const scenarioId = input.scenarioId || toKebabCase(projectName);
  const entities = input.entities.length ? input.entities.join(', ') : 'infer 1 to 4 core concepts from objective';
  const constraints = input.constraints || 'Keep Beta0 Path B. Avoid trusted-source execution and unsupported custom procedure code. Prefer model-governed concepts, invariants, flows, capabilities, events, and simple panels only when safe.';

  return `You are generating input artifacts for NPDevGenerator, not generic application code.

NPDevGenerator consumes a folder similar to:
Input/
  config.json
  model.json
  manifest.json
  expected-behavior.md
  expected-endpoints.md
  input/example-request.json optional

Your job:
Generate a conservative, schema-shaped artifact bundle for NPDev Beta0 usage.

Project:
- Name: ${projectName}
- Scenario id: ${scenarioId}
- Main flow: ${input.mainFlow}
- Complexity: ${input.complexity}
- Backend target: ${input.backendTarget}
- Database provider: ${input.databaseProvider}
- Runtime port: ${input.serverPort}
- Primary concepts/entities: ${entities}
- Constraints: ${constraints}

Objective:
${input.objective}

CRITICAL FORMAT RULES:
1. Return JSON only. No markdown fence. No commentary outside JSON.
2. The outer response must match schemaVersion "npdev-static-generator-artifact-bundle.v2".
3. artifacts must be an array of objects with path and content.
4. config.json content must be a JSON object using NPDevGenerator config shape:
   - configVersion: "1.0"
   - scenario.name, scenario.description, scenario.outputRoot
   - generator flags: failIfModelMissing, failIfConfigMissing, cleanOutputBeforeGenerate, emitPluginAssets, emitRuntimeAssets, emitUiAssets
   - bootstrap.root and bootstrap.mergeStrategy
   - artifact.root, generatedFolderName, libsFolderName, metaFolderName
   - finalExec.root, deleteBeforeMount
   - database.provider, host, port, database, username, password, adminDatabase, resetMode, containerName
   - runtime.springProfile, serverPort, javaArgs, gradleTask
   - trialDefaults
5. model.json content must be a JSON object using NPDev DSL 1.0.0 shape:
   - dslVersion: "1.0.0"
   - version: "1.0"
   - namespace
   - concepts[] with fields[] and invariants[]
   - capabilities[] and bindings[]
   - events[] when useful
   - flows[] with steps such as enforceInvariants, capabilityCall, emitEvent, return
   - queries/procedures/panels only if the objective needs them and they stay declarative
6. manifest.json must include id, title, complexity, mainFlow, purpose, businessStory, features, inputFiles, walkthrough, expectedOutcomes.
7. expected-behavior.md and expected-endpoints.md must explain what NPDev runtime should expose and how to validate it.
8. Do not output Java, TypeScript, SQL, Gradle, or Docker files.
9. Do not invent unsupported custom runtime code.
10. If something is uncertain, make a conservative assumption and record it in project.assumptions and qualityGates.missingInformation.
11. Keep the model small. Prefer 1 to 4 concepts and 1 to 3 flows.
12. Use valid JSON only. JSON.parse must succeed.

Expected outer JSON shape:
${JSON.stringify(NPDEV_RESPONSE_SCHEMA_HINT, null, 2)}
`;
}

async function callProvider(input, prompt) {
  if (input.provider === 'mock') {
    return JSON.stringify(buildMockBundle(input), null, 2);
  }

  if (input.provider === 'cloudflare') {
    return callCloudflareWorker(input, prompt);
  }

  throw new Error(`Unsupported provider: ${input.provider}`);
}

async function callCloudflareWorker(input, prompt) {
  if (!input.endpoint) {
    throw new Error('Cloudflare Worker endpoint is required. Example: https://npdev-ai-proxy.YOUR_ACCOUNT.workers.dev/v1/generate');
  }

  const response = await fetch(input.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: input.model,
      prompt,
      schemaHint: JSON.stringify(NPDEV_RESPONSE_SCHEMA_HINT),
      temperature: input.temperature,
      maxOutputTokens: input.maxTokens
    })
  });

  const data = await safeReadJson(response);

  if (!response.ok) {
    throw new Error(formatApiError('Cloudflare Worker request failed', data));
  }

  if (typeof data.text === 'string' && data.text.trim()) return data.text;
  if (data.json) return JSON.stringify(data.json, null, 2);
  throw new Error('Worker returned no text or json field.');
}

async function safeReadJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function formatApiError(prefix, data) {
  const message = data?.error?.message || data?.message || data?.raw || JSON.stringify(data);
  return `${prefix}: ${message}`;
}

function parseArtifactBundle(rawText) {
  const cleaned = extractJsonText(rawText);
  const parsed = JSON.parse(cleaned);
  const artifacts = normalizeArtifacts(parsed);
  const validation = validateArtifacts(parsed, artifacts);
  return { bundle: parsed, artifacts, validation };
}

function extractJsonText(rawText) {
  const trimmed = String(rawText || '').trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) return fenceMatch[1].trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

function normalizeArtifacts(bundle) {
  if (Array.isArray(bundle.artifacts)) {
    return bundle.artifacts
      .map((artifact) => ({
        path: String(artifact.path || '').trim(),
        content: artifact.content
      }))
      .filter((artifact) => artifact.path);
  }

  if (bundle.files && typeof bundle.files === 'object') {
    return Object.entries(bundle.files).map(([path, content]) => ({ path, content }));
  }

  return [];
}

function validateArtifacts(bundle, artifacts) {
  const errors = [];
  const warnings = [];
  const paths = new Set(artifacts.map((artifact) => artifact.path));

  if (bundle.schemaVersion !== 'npdev-static-generator-artifact-bundle.v2') {
    warnings.push('Outer schemaVersion is missing or not v2.');
  }

  for (const required of REQUIRED_ARTIFACT_PATHS) {
    if (!paths.has(required)) errors.push(`Missing required artifact: ${required}`);
  }

  const config = artifacts.find((a) => a.path === 'config.json')?.content;
  const model = artifacts.find((a) => a.path === 'model.json')?.content;
  const manifest = artifacts.find((a) => a.path === 'manifest.json')?.content;

  if (!config || typeof config !== 'object') errors.push('config.json must be JSON object content.');
  if (!model || typeof model !== 'object') errors.push('model.json must be JSON object content.');
  if (!manifest || typeof manifest !== 'object') errors.push('manifest.json must be JSON object content.');

  if (config && typeof config === 'object') {
    if (config.configVersion !== '1.0') errors.push('config.json must include configVersion "1.0".');
    for (const key of ['scenario', 'generator', 'bootstrap', 'artifact', 'finalExec', 'database', 'runtime']) {
      if (!config[key]) errors.push(`config.json missing required section: ${key}`);
    }
  }

  if (model && typeof model === 'object') {
    if (model.dslVersion !== '1.0.0') errors.push('model.json must include dslVersion "1.0.0".');
    if (!model.version) errors.push('model.json must include version.');
    if (!Array.isArray(model.concepts) || !model.concepts.length) errors.push('model.json must include at least one concept.');
  }

  if (manifest && typeof manifest === 'object') {
    if (!manifest.id) errors.push('manifest.json must include id.');
    if (!manifest.mainFlow) warnings.push('manifest.json should include mainFlow.');
  }

  for (const artifact of artifacts) {
    if (!artifact.path.match(/^[A-Za-z0-9._\-\/]+$/)) errors.push(`${artifact.path} contains unsupported path characters.`);
    if (artifact.path.includes('..')) errors.push(`${artifact.path} must not contain parent directory traversal.`);
    if (artifact.path.endsWith('.json') && typeof artifact.content !== 'object') {
      errors.push(`${artifact.path} should have JSON object content, not string content.`);
    }
  }

  return { errors, warnings, passed: errors.length === 0 };
}

function artifactContentToString(content, path) {
  if (typeof content === 'string') return content;
  if (content === null || content === undefined) return '';
  if (path.endsWith('.json')) return JSON.stringify(content, null, 2) + '\n';
  return typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content);
}

function renderArtifacts(artifacts, validation) {
  const list = $('artifactList');
  list.innerHTML = '';

  if (!artifacts.length) {
    $('validationBox').className = 'validation-box error';
    $('validationBox').textContent = 'No artifacts were found in the response.';
    setDownloadButtons(false);
    return;
  }

  $('validationBox').className = validation.passed ? 'validation-box ok' : 'validation-box error';
  $('validationBox').innerHTML = renderValidationMessage(validation, artifacts);

  for (const artifact of artifacts) {
    const content = artifactContentToString(artifact.content, artifact.path);
    const card = document.createElement('article');
    card.className = 'artifact-card';
    card.innerHTML = `
      <header>
        <h3></h3>
        <div class="button-row right">
          <button type="button" class="ghost-button copy-file">Copy</button>
          <button type="button" class="secondary-button download-file">Download</button>
        </div>
      </header>
      <pre></pre>
    `;
    card.querySelector('h3').textContent = artifact.path;
    card.querySelector('pre').textContent = content;
    card.querySelector('.copy-file').addEventListener('click', () => copyText(content, `${artifact.path} copied.`));
    card.querySelector('.download-file').addEventListener('click', () => downloadTextFile(artifact.path, content));
    list.appendChild(card);
  }

  setDownloadButtons(true);
}

function renderValidationMessage(validation, artifacts) {
  const parts = [];
  parts.push(`<strong>${validation.passed ? 'Artifact validation passed' : 'Artifact validation failed'}</strong>`);
  parts.push(`${artifacts.length} file(s) generated.`);
  if (validation.errors.length) {
    parts.push('<br><strong>Errors:</strong><ul>' + validation.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('') + '</ul>');
  }
  if (validation.warnings.length) {
    parts.push('<br><strong>Warnings:</strong><ul>' + validation.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('') + '</ul>');
  }
  return parts.join(' ');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setDownloadButtons(enabled) {
  $('downloadZipButton').disabled = !enabled;
  $('downloadBundleButton').disabled = !enabled;
}

function buildMockBundle(input) {
  const name = input.projectName || 'Clinic Appointment Manager';
  const scenarioId = input.scenarioId || toKebabCase(name);
  const namespace = `trial.${scenarioId.replace(/-/g, '')}`;
  const objective = input.objective || 'Manage patients, doctors, and appointment scheduling with validation and runtime evidence.';
  const entities = input.entities.length ? input.entities : ['Patient', 'Doctor', 'Appointment'];
  const mainFlow = input.mainFlow || 'ScheduleAppointment';

  return {
    schemaVersion: 'npdev-static-generator-artifact-bundle.v2',
    project: {
      name,
      scenarioId,
      objective,
      assumptions: ['Generated by the local mock provider for UI validation.'],
      warnings: ['Review all artifacts before running NPDevGenerator.']
    },
    artifacts: [
      {
        path: 'config.json',
        content: {
          $schema: '..\\..\\NPDevContract\\schemas\\config.schema.json',
          configVersion: '1.0',
          scenario: {
            name: scenarioId,
            description: objective,
            outputRoot: '..\\Output'
          },
          generator: {
            failIfModelMissing: true,
            failIfConfigMissing: true,
            cleanOutputBeforeGenerate: true,
            emitPluginAssets: true,
            emitRuntimeAssets: true,
            emitUiAssets: true
          },
          bootstrap: {
            root: '..\\..\\NPDevRuntimeHost',
            mergeStrategy: 'clean-copy'
          },
          artifact: {
            root: '..\\Output\\ArtifactNP',
            generatedFolderName: 'npdev-generated',
            libsFolderName: 'libs',
            metaFolderName: 'npdev-meta'
          },
          finalExec: {
            root: '..\\Output\\App',
            deleteBeforeMount: true
          },
          database: {
            provider: input.databaseProvider || 'docker-postgres',
            host: 'localhost',
            port: 5432,
            database: scenarioId.replace(/-/g, '_'),
            username: 'finalexec',
            password: 'finalexec',
            adminDatabase: 'postgres',
            resetMode: 'reset',
            containerName: `npdev-${scenarioId}`
          },
          runtime: {
            springProfile: 'dev,step0,trial',
            serverPort: input.serverPort || 8083,
            javaArgs: [],
            gradleTask: 'bootRun'
          },
          trialDefaults: {
            apiKey: 'dev-key',
            recommendedProfiles: 'dev,step0,trial',
            runtimeUrl: `http://localhost:${input.serverPort || 8083}/`,
            databaseMode: 'step0-h2',
            pluginDiscoveryMode: 'filesystem-folder',
            pluginPackageDirectory: './npdev-generated/src/main/resources/npdev/plugin-packages',
            notes: ['Mock output uses Beta0-compatible conservative defaults.']
          }
        }
      },
      {
        path: 'model.json',
        content: {
          $schema: '..\\..\\NPDevContract\\schemas\\model.schema.json',
          namespace,
          dslVersion: '1.0.0',
          version: '1.0',
          metadata: { purpose: objective },
          concepts: entities.map((entityName) => ({
            name: toPascalCase(entityName),
            ui: { label: toPascalCase(entityName).replace(/([a-z])([A-Z])/g, '$1 $2') },
            fields: [
              { name: 'id', type: 'uuid', id: true, required: true },
              { name: 'name', type: 'string', required: true, ui: { label: 'Name', widget: 'text' } },
              { name: 'status', type: 'string', required: true, ui: { label: 'Status', widget: 'text' } }
            ],
            invariants: [
              { name: `${toPascalCase(entityName)}NameRequired`, expr: "name != null && name != ''" }
            ]
          })),
          capabilities: [
            { name: 'persistence', type: 'PersistenceCapability', operations: ['save'] }
          ],
          bindings: [
            { capability: 'persistence', adapter: 'repository' },
            { capability: 'eventBus', adapter: 'inproc' }
          ],
          events: [
            { name: `${mainFlow}Completed`, payload: [{ name: 'id', type: 'uuid' }, { name: 'status', type: 'string' }] }
          ],
          flows: [
            {
              name: mainFlow,
              input: { concept: toPascalCase(entities[0]), mode: 'create' },
              steps: [
                { name: 'validate-input', type: 'enforceInvariants', scope: toPascalCase(entities[0]), invariants: [`${toPascalCase(entities[0])}NameRequired`] },
                { name: 'save-record', type: 'capabilityCall', cap: 'persistence', op: 'save', args: ['$input'], out: '$saved' },
                { name: 'emit-completed-event', type: 'emitEvent', event: `${mainFlow}Completed`, from: '$saved' },
                { name: 'return-record', type: 'return', value: '$saved' }
              ]
            }
          ]
        }
      },
      {
        path: 'manifest.json',
        content: {
          id: scenarioId,
          title: name,
          complexity: input.complexity || 'simple',
          mainFlow,
          purpose: `Generate a Beta0 NPDev sample for ${name}.`,
          businessStory: objective,
          features: ['concept', 'invariants', 'persistence', 'event', 'trace'],
          inputFiles: ['input/example-request.json'],
          walkthrough: [
            `Run the sample through NPDevGenerator.`,
            `Call GET /api/flows and confirm ${mainFlow} exists.`,
            `POST the example request to /api/flows/${mainFlow}/execute.`
          ],
          expectedOutcomes: [
            'The input is validated.',
            'The record is persisted through a governed capability.',
            'Runtime evidence is inspectable.'
          ]
        }
      },
      {
        path: 'expected-behavior.md',
        content: `# Expected Behavior\n\n- \`${mainFlow}\` accepts a valid request for ${name}.\n- The runtime validates invariants, saves the primary concept, emits an event, and returns the saved record.\n- Invalid required fields produce explicit validation failure.\n`
      },
      {
        path: 'expected-endpoints.md',
        content: `# Expected Endpoints\n\n- \`GET /api/flows\`\n- \`POST /api/flows/${mainFlow}/execute\`\n- \`GET /api/audit\`\n- \`GET /api/correlations/{correlationId}\`\n- \`GET /api/admin/model/export\`\n`
      },
      {
        path: 'generation-notes.md',
        content: '# Generation Notes\n\nMock output validates the UI and file contract. Use Cloudflare Worker + Gemini for real generation.\n'
      },
      {
        path: 'input/example-request.json',
        content: {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Example record',
          status: 'SUBMITTED'
        }
      }
    ],
    qualityGates: {
      missingInformation: [],
      riskNotes: ['Mock provider output is illustrative only.'],
      humanReviewChecklist: [
        'Validate config.json against NPDevContract schemas.',
        'Validate model.json against NPDevContract schemas.',
        'Run the relevant NPDev sample/generator validation scripts before accepting the output.'
      ],
      beta0ScopeNotes: ['Trusted-source execution and deep custom procedure implementation remain outside default Beta0 Path B.']
    }
  };
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: guessMimeType(filename) });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.split('/').pop();
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function guessMimeType(filename) {
  if (filename.endsWith('.json')) return 'application/json;charset=utf-8';
  if (filename.endsWith('.md')) return 'text/markdown;charset=utf-8';
  return 'text/plain;charset=utf-8';
}

function downloadBundleJson() {
  if (!state.lastBundle) return;
  downloadTextFile('npdev-artifact-bundle.json', JSON.stringify(state.lastBundle, null, 2) + '\n');
}

function downloadZip() {
  if (!state.lastFiles.length) return;
  const files = state.lastFiles.map((artifact) => ({
    name: artifact.path,
    content: artifactContentToString(artifact.content, artifact.path)
  }));
  const blob = createZipBlob(files);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${toKebabCase($('scenarioId').value || $('projectName').value || 'npdev-artifacts')}-input.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function createZipBlob(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const crc = crc32(contentBytes);
    const mod = dosDateTime(new Date());

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, mod.time, true);
    localView.setUint16(12, mod.date, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, contentBytes.length, true);
    localView.setUint32(22, contentBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, contentBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, mod.time, true);
    centralView.setUint16(14, mod.date, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, contentBytes.length, true);
    centralView.setUint32(24, contentBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + contentBytes.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
}

function dosDateTime(date) {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

async function copyText(text, successMessage) {
  await navigator.clipboard.writeText(text || '');
  setStatus('ready', 'Copied', successMessage || 'Copied to clipboard.');
}

function clearOutput() {
  state.lastPrompt = '';
  state.lastRaw = '';
  state.lastBundle = null;
  state.lastFiles = [];
  $('promptOutput').value = '';
  $('rawOutput').value = '';
  $('artifactList').innerHTML = '';
  $('validationBox').className = 'validation-box';
  $('validationBox').textContent = 'No artifact generated yet.';
  setDownloadButtons(false);
  setStatus('ready', 'Ready', 'Output cleared.');
}

function updateProviderDefaults() {
  const provider = $('provider').value;
  if (provider === 'mock') {
    $('model').value = 'mock-npdev-generator';
    $('endpointRow').classList.add('hidden');
  } else {
    $('model').value = $('model').value && $('model').value !== 'mock-npdev-generator' ? $('model').value : 'gemini-2.5-flash';
    $('endpointRow').classList.remove('hidden');
  }
}

function loadExample() {
  $('projectName').value = 'Clinic Appointment Manager';
  $('scenarioId').value = 'clinic-appointment-manager';
  $('objective').value = 'Create a small clinic appointment management app. Receptionists register patients and doctors, schedule appointments, change appointment status, and inspect runtime evidence. The app should validate required patient contact information and appointment date/status.';
  $('entities').value = 'Patient, Doctor, Appointment';
  $('mainFlow').value = 'ScheduleAppointment';
  $('backendTarget').value = 'spring-boot-runtimehost';
  $('databaseProvider').value = 'docker-postgres';
  $('serverPort').value = '8083';
  $('complexity').value = 'simple';
  $('constraints').value = 'Beta0 Path B. Keep output conservative. Do not generate trusted-source execution or unsupported custom procedure code.';
  setStatus('ready', 'Example loaded', 'Preview the prompt or generate artifacts.');
}

async function handleGenerate() {
  const input = getFormValues();
  if (!input.objective) {
    setStatus('error', 'Missing objective', 'Describe the project objective first.');
    return;
  }

  if ($('storeEndpoint').checked && input.endpoint) {
    localStorage.setItem('npdev.workerEndpoint', input.endpoint);
  }

  const prompt = buildNpdevPrompt(input);
  state.lastPrompt = prompt;
  $('promptOutput').value = prompt;
  $('rawOutput').value = '';

  try {
    setStatus('busy', 'Generating', input.provider === 'mock' ? 'Generating mock artifacts.' : 'Calling Cloudflare Worker proxy.');
    const raw = await callProvider(input, prompt);
    state.lastRaw = raw;
    $('rawOutput').value = raw;

    const { bundle, artifacts, validation } = parseArtifactBundle(raw);
    state.lastBundle = bundle;
    state.lastFiles = artifacts;
    renderArtifacts(artifacts, validation);

    if (validation.passed) {
      setStatus('ready', 'Generated', 'Artifacts are ready for review and download.');
    } else {
      setStatus('error', 'Validation failed', 'The AI responded, but artifact validation found issues.');
    }
  } catch (error) {
    setStatus('error', 'Generation failed', error.message);
    $('rawOutput').value = error.stack || error.message;
  }
}

function previewPrompt() {
  const input = getFormValues();
  const prompt = buildNpdevPrompt(input);
  state.lastPrompt = prompt;
  $('promptOutput').value = prompt;
  setStatus('ready', 'Prompt ready', 'Review or copy the prompt before generation.');
}

function init() {
  $('generateButton').addEventListener('click', handleGenerate);
  $('previewPromptButton').addEventListener('click', previewPrompt);
  $('clearButton').addEventListener('click', clearOutput);
  $('loadExampleButton').addEventListener('click', loadExample);
  $('downloadBundleButton').addEventListener('click', downloadBundleJson);
  $('downloadZipButton').addEventListener('click', downloadZip);
  $('copyPromptButton').addEventListener('click', () => copyText($('promptOutput').value, 'Prompt copied.'));
  $('copyRawButton').addEventListener('click', () => copyText($('rawOutput').value, 'Raw response copied.'));
  $('provider').addEventListener('change', updateProviderDefaults);

  const savedEndpoint = localStorage.getItem('npdev.workerEndpoint');
  if (savedEndpoint) {
    $('endpoint').value = savedEndpoint;
    $('storeEndpoint').checked = true;
  }

  updateProviderDefaults();
}

document.addEventListener('DOMContentLoaded', init);
