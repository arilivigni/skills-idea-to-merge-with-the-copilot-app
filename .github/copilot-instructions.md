# Copilot instructions

Project context Copilot should apply to every session in this repository.

## Stack

- Framework: Astro (static output).
- Language: TypeScript.
- Styling: plain CSS in the base layout.

## Conventions

- Keep components small and focused.
- Prefer semantic HTML and accessible markup.
- Do not close, or add closing keywords for, the exercise walkthrough issue (issue #1) in any pull request. The exercise's GitHub Actions workflows manage that issue. When you open a pull request for app work, link only the specific app work-item issue you are implementing.

## Persistence and hydration rules

- **Persistence:** bookmarks are persisted in the browser with `localStorage` under the `mona-bookmarks` key. There is no backend, database, or shortener service — the original URL and its locally generated short slug are both stored client-side. Treat stored values as untrusted: validate the parsed value is an array of `{ url, slug }` objects and drop anything malformed instead of throwing.
- **Hydration:** browser-only code runs behind a client-side boundary. Use the `client:load` directive (or an inline `<script>` in an Astro component) for anything that touches `localStorage`, `window`, or `document`. Never read or write browser APIs from Astro component frontmatter, so the static build never touches them during SSR.
