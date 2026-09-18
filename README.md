# Eidos Registry

The registry of published [Eidos](https://github.com/BuildableWorks/Eidos) frameworks: one manifest per package pointing at a root in its author's repository at a tag. Publish with a pull request; CI validates, a merge makes it live.

A package is a whole root someone can install with [`eidosmd`](https://eidosmd.com), or a collection, a variant, a role, or a top-level document pulled out of it. The Registry holds no content: the root stays in the author's repository, under the author's license, and its own `.eidos/Framework.yaml` is the manifest of what it contains. The Registry adds only what a reader needs to find it.

## A package

One file, `packages/<owner>/<name>.yaml`, and nothing else:

```yaml
repo: The-Virtual-Panda/Eidos-Registry   # the GitHub repository the root lives in
path: fixture                            # the root folder inside it; `.` when the repository is the root
ref: fixture/v0.1.0                      # the git tag the published state is read at
description: One line on what this framework is for.
category: fixture                        # one value from categories.yaml
keywords: [fixture, ci]                  # optional
```

- `<owner>` is the owner of `repo`. A manifest under another owner's folder fails CI.
- `<name>` is kebab-case and unique within its owner: the repository's name when it publishes one root, the author's choice when it publishes several.
- The package's name everywhere is `@<owner>/<name>`. There is no short form.
- A package has one `ref`, the latest. Earlier versions are the framework's own record at that ref, so `@owner/name@<version>` resolves through the framework, never through the manifest.
- The package's contents are read from `<repo>/<path>/.eidos/Framework.yaml` at `ref`. Nothing about them is declared here.

## Categories

[`categories.yaml`](categories.yaml) is the list a manifest's `category` draws from, one line of meaning each. A pull request may add a category in the same change that uses it; CI validates against the list as changed, and that pull request waits for the Registry's owner.

## Publishing

1. Tag the commit of your repository that holds the root you want published.
2. Add or change `packages/<owner>/<name>.yaml` in a pull request here. `eidos publish` writes it for you from a clean, tagged root and opens the pull request with `gh`; without `gh` it prints the manifest and the URL.
3. CI validates the manifest, fetches your repository at `ref`, and runs `eidos check` on the root at `path`. Errors fail the pull request with the report.
4. When you are the owner of the repository (or a public member of the organization that is), the change stays inside `packages/<owner>/`, and the checks pass, the pull request merges on its own. The merge is the moment of publication.

A version bump is the same pull request with a new `ref`. A package whose source can no longer be fetched at its ref is left out of the site at its next build; its manifest stays until a pull request removes it.

## What reads this

- [eidosmd.com/registry](https://eidosmd.com/registry) renders a page per package from its manifest, its `Framework.yaml`, and its README at `ref`, rebuilt by a deploy hook the moment a manifest merges.
- `npx eidosmd install @owner/name` resolves a package through its manifest and installs the root, or one piece of it.
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
