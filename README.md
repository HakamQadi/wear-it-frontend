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
