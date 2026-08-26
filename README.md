# Wear It Frontend

Next.js app for the Wear It personal virtual closet.

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

- `/` — landing page
- `/register`, `/login` — member accounts
- `/closet` — the member's virtual wardrobe (items added from the device or from a link)
- `/photos` — saved personal photos
- `/studio` — build an outfit (one item per clothing type) and generate it on a photo
- `/looks` — generated looks
- `/admin` — clothing-type CMS, member activity and site copy

`NEXT_PUBLIC_API_URL` must point at the backend's `/api` prefix.

Set `API_PROXY_TARGET` (at build time) to serve the API and uploaded media through this
app's own origin instead — useful behind a single tunnel or reverse proxy, since the browser
then makes same-origin requests and no CORS configuration is involved. Pair it with
`NEXT_PUBLIC_API_URL=/api`.

## Languages

**Arabic is the default**, with English available from the switch in the header. The document
is served as `lang="ar" dir="rtl"`; choosing English flips `lang`/`dir` and is remembered in
`localStorage` under `wear_it_locale`.

- Interface strings live in `src/lib/i18n/ar.ts` and `src/lib/i18n/en.ts`. English is typed
  against the Arabic dictionary, so a key added to one and missed in the other fails the build.
- `useI18n()` gives `{ locale, dir, tag, t, setLocale }`. `t('closet.title')` is checked
  against the dictionary's keys; a missing entry falls back to Arabic, then to the key itself
  so it is visible rather than blank.
- The layout uses logical CSS properties (`inset-inline-start`, `text-align: start`), so it
  mirrors automatically. Arrow icons and the decorative shape on the auth pages are mirrored
  by hand — glyphs and `transform` do not flip with direction.
- Numbers and dates go through `Intl` with `tag`. Arabic pins the Latin numbering system, so
  digits do not vary with the browser's ICU build.
- **Admin-managed content is bilingual data, not UI strings:** site copy is stored per
  language, and clothing types carry `name` and `nameAr`. Both are edited in the CMS.
- Backend errors arrive as a stable `code` plus an English `message`; the client shows the
  translation for the code and falls back to the message. `class-validator` messages (field
  length, format) are still English — translating those needs a custom exception filter.

## Browser QA

`qa/browser.mjs` drives the whole member and admin journey in Chromium: register, fill a
closet, save a photo, build an outfit (including the one-item-per-type swap), generate a look,
sign out and back in, and run the CMS. It also asserts that a member token cannot reach the
admin API and that the page never scrolls sideways on a phone.

```bash
npx playwright install chromium          # once
BASE_URL=http://localhost:3000 API_URL=http://localhost:4000/api npm run qa:browser
# add SHOTS=./qa-shots to save a screenshot at each milestone
```

Point it at a backend running against a throwaway database and the stubbed image API from
`wear-it-backend/qa/openai-stub.mjs`, not at production. The link-import step imports from
that stub over loopback, so the backend needs `IMAGE_IMPORT_ALLOW_LOOPBACK=true`; override the
source with `LINK_IMAGE_URL` if you point the suite somewhere else.
