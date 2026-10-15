# Eidos Registry

The registry of published [Eidos](https://github.com/BuildableWorks/Eidos) frameworks, plugins, and plugin configurations: one manifest per package pointing at its author's repository at a tag. Publish with a pull request; CI validates, a merge makes it live.

A package is a whole root someone can install with [`eidosmd`](https://eidosmd.com), or a collection, a variant, a role, or a top-level document pulled out of it. The Registry holds no content: the root stays in the author's repository, under the author's license, and its own `.eidos/Framework.yaml` is the manifest of what it contains. The Registry adds only what a reader needs to find it.

## A package

One file, `packages/<owner>/<name>.yaml`, and nothing else:

```yaml
repo: The-Virtual-Panda/Eidos-Registry   # the GitHub repository the root lives in
path: fixture                            # the root folder inside it; `.` when the repository is the root
ref: fixture/v0.1.0                      # the git tag the published state is read at
description: One line on what this framework is for.
category: fixture                        # `parent` or `parent/child` from categories.yaml
keywords: [fixture, ci]                  # optional
```

- `<owner>` is the owner of `repo`. A manifest under another owner's folder fails CI.
- `<name>` is kebab-case and unique within its owner: the repository's name when it publishes one root, the author's choice when it publishes several.
- The package's name everywhere is `@<owner>/<name>`. There is no short form.
- A package has one `ref`, the latest. Earlier versions are the framework's own record at that ref, so `@owner/name@<version>` resolves through the framework, never through the manifest.
- The package's contents are read from `<repo>/<path>/.eidos/Framework.yaml` at `ref`. Nothing about them is declared here.

## A plugin

A plugin from outside `eidosmd` is published the way Obsidian publishes one: the author builds it and attaches the built files to a GitHub release, and the manifest here points at that release and pins each file's sha256.

```yaml
kind: plugin
repo: alice/eidos-pomodoro                # the GitHub repository whose releases carry the plugin
description: A timer beside each task.
keywords: [time, backlog]                 # optional
versions:
  1.2.0:
    ref: v1.2.0                           # the tag of the GitHub release
    files:                                # each release file and its sha256
      manifest.yaml: 3f1c…                # the plugin's manifest, with its name and min_host
      cli.js: 9a0b…                       # its CLI entry, bundled, eidosmd/plugin left external
      app.js: 51de…                       # its app entry, when it has one
      page.js: c07e…                      # its page half, when it has one
```

- `<name>` is the `name` in the plugin's own manifest, and no two plugins in the Registry share one: a root keeps one plugin of a name, under `.eidos/plugins/<name>/`.
- Every version stays listed, so a root that names an older one installs exactly what it named. The newest is the highest version.
- `eidos plugin install @owner/name[@version]` downloads that version's files and refuses any whose sha256 differs from the manifest, so a moved tag or a replaced release file never reaches anyone. A plugin then runs only once a person on that machine allows it.
- A plugin has no category; its keywords carry what it is for.

## A plugin configuration

A configuration is a plugin's settings for a root, published from a root that uses them: a Scrum board for Backlog, reading budgets for Metrics, rules for the Linter. It is a piece of that root, as a collection or a role is, so the root stays in the author's repository and is checked like any other.

```yaml
kind: config
repo: alice/eidos-scrum
path: .
ref: v1.0.0
description: A Scrum board with sprints, story points, and a review column.
category: software
plugins: [backlog, "@alice/pomodoro"]     # whose settings it offers: a core plugin by name, or a plugin here by @owner/name
```

- The root at `path` holds `.eidos/plugins/<name>/settings.yaml` for each plugin named, the settings a root shares; nothing personal (`local.yaml`) is ever published.
- `eidos install @owner/name` installs those settings into a root, a root that already has its own for a plugin choosing to keep them or take the incoming ones. A plugin from the Registry that the machine does not have is offered for install.

## Categories

[`categories.yaml`](categories.yaml) is the tree a manifest's `category` draws from, one line of meaning each: a parent names a family of things (`software`, `media`, `building`), a child names one kind within it (`software/game`, `media/book`). A manifest declares `parent/child`, or `parent` alone when the root is general, as a seed is, or when no child fits. A category names the kind of thing the root defines, never who makes it; keywords carry the rest. A pull request may add a category in the same change that uses it; CI validates against the tree as changed, and that pull request waits for the Registry's owner.

## Publishing

1. Tag the commit of your repository that holds the root you want published. For a plugin, make a GitHub release at the tag with its built files attached.
2. Add or change `packages/<owner>/<name>.yaml` in a pull request here. `eidos publish` writes it for you from a clean, tagged root or a built plugin (with each file's sha256) and opens the pull request with `gh`; without `gh` it prints the manifest and the URL.
3. CI validates the manifest. For a framework or a configuration it fetches your repository at `ref` and runs `eidos check` on the root at `path`, and a configuration's root must hold the settings of every plugin it names. For a plugin it downloads the newest version's release files, fails on any whose sha256 differs from the manifest, and loads the plugin with `eidos plugin verify`. Errors fail the pull request with the report.
4. A framework merges on its own when you are the owner of the repository (or a public member of the organization that is), the change stays inside `packages/<owner>/`, and the checks pass. A plugin or a configuration, added, changed, or removed, always waits for the Registry's owner to read it: a plugin is code that runs on other people's machines. The merge is the moment of publication.

A framework's or a configuration's version bump is the same pull request with a new `ref`; a plugin's adds an entry under `versions`. A package whose source can no longer be fetched at its ref is left out of the site at its next build; its manifest stays until a pull request removes it.

## What reads this

- [eidosmd.com/registry](https://eidosmd.com/registry) renders a page per package from its manifest, its `Framework.yaml`, and its README at `ref`, rebuilt by a deploy hook the moment a manifest merges.
- `npx eidosmd install @owner/name` resolves a package through its manifest and installs the root, or one piece of it, a configuration's plugin settings among them; `eidos plugin install @owner/name` installs a plugin.
- Anyone else: the default branch of this repository is the registry, readable with `git` or over HTTP.

## The fixture

[`fixture/`](fixture) is a root the Registry publishes as `@The-Virtual-Panda/fixture` to prove its own checks. It is the only content this repository holds, and it is not meant to be installed.

## Validating locally

```bash
npm ci
npm run validate               # every manifest against the contract and the category list
npx eidosmd check --root fixture
```

## License

Apache-2.0. Each package's content is licensed by its author in its own repository.
