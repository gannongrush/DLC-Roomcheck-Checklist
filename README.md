# Roomcheck — Apartment 1953 #101

A shared weekly cleaning checklist. Anyone with the link can check off tasks,
and everyone else's screen picks up the change within a few seconds (it polls
the server every 4 seconds). Tapping **"Start new week"** clears every
checkbox and rotates every job's assigned person down one spot.

## How it works

- `public/index.html` — the whole page (no build step, no framework).
- `netlify/functions/state.js` — a small serverless function that reads and
  writes the shared checklist state.
- State is stored in **Netlify Blobs**, a key-value store built into every
  Netlify site — you don't need to sign up for a separate database.

## Deploy it (no coding required)

**Easiest path — deploy via Git:**

1. Create a free account at [github.com](https://github.com) if you don't
   already have one, and a free account at
   [app.netlify.com](https://app.netlify.com) (you can sign up with your
   GitHub account in one click).
2. Create a new GitHub repository and upload this whole folder to it (on
   github.com you can drag-and-drop all these files into a new repo using
   "Add file → Upload files" — no terminal needed).
3. In Netlify, click **Add new site → Import an existing project**, choose
   GitHub, and pick the repository you just created.
4. Netlify will detect `netlify.toml` automatically (build settings are
   already configured — you don't need to change anything). Click **Deploy**.
5. After a minute or two you'll get a URL like
   `https://your-site-name.netlify.app`. That's the link to send your
   roommates. You can rename it (Site settings → Change site name) to
   something like `apt1953-101-roomcheck.netlify.app`.

**Alternative — Netlify CLI**, if you're comfortable with a terminal:

```
npm install -g netlify-cli
cd roomcheck-netlify
npm install
netlify deploy --prod
```

## Editing the checklist later

- Task text and roommate names live in `public/index.html` — search for the
  text you want to change and edit it directly, then redeploy (push to
  GitHub, or run `netlify deploy --prod` again).
- Checkbox order matters for the rotation math but not which specific line
  is checked — if you add or remove a task, also update the `data-key`
  attributes and the matching `ALL_KEYS` list near the top of the
  `<script>` block in `index.html`.
