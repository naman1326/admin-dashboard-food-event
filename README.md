# Admin dashboard

React + Vite, same pattern as the attendant app — talks directly to Supabase,
no separate backend.

## Before running this: two new SQL files
This dashboard needs two migrations beyond the four you already ran:

| File | What it does |
|---|---|
| `db/05_admin_actions.sql` | Adds the `admin_actions` audit log, plus `admin_confirm_checkpoint()` and `admin_undo_checkpoint()` |
| `db/06_realtime.sql` | Turns on live push updates for the `scans` table |

Run both in the Supabase SQL editor, in order, before starting the dashboard.
(`06` can also be done by hand: Database → Publications → `supabase_realtime` →
toggle `scans` on — same effect, if you'd rather click than run SQL.)

## Run it locally
```
npm install
cp .env.example .env.local     # fill in your project URL, anon key, and pick an admin password
npm run dev
```

## Deploying
Same as the attendant app: push to a repo, import into Vercel, add the three
env vars in the project settings.

## What it does
- **Live grid**: every participant × every checkpoint. Fetches everything once
  on load, then a Supabase Realtime subscription pushes updates as scans happen
  anywhere in the system — no polling, no manual refresh needed (though a
  Refresh button is there as a fallback if you ever want one). A row briefly
  flashes amber when a live update lands on it.
- **Search/filter**: instant, client-side (the whole participant list is
  already in memory, so there's no extra round trip while typing). Filters:
  not entered yet, entered with no food yet, and fully done — "entered" is
  whichever checkpoint sorts first, same convention as the rest of the system,
  so this keeps working if you ever rename or reorder checkpoints.
- **Manual override**: click any row to open that participant's full
  checkpoint breakdown. Marking something as done reuses the exact same
  conflict-safe logic as a real scan. Undoing a scan requires a typed reason —
  that's deliberate, not a bug — and every override (both directions) is
  logged in `admin_actions` with who did what, when, and why.

## The password gate, honestly
It's a convenience screen, not real access control — the note on the login
screen itself says so. Anyone holding your Supabase anon key can already query
this data directly via the API, regardless of this password. For a college
event this is a proportionate tradeoff (nothing here is highly sensitive), but
it's worth knowing precisely what it does and doesn't protect against: it
stops someone from casually opening your dashboard link, not a deliberate
attempt to access the data.

## What was verified here vs. what needs a real browser
Verified:
- `npm run build` compiles cleanly
- 19 unit tests covering grid construction, stats, all three filters (plus
  filter+search combined), realtime event handling (including that a
  re-delivered insert doesn't create a duplicate row), and time formatting
- The two new database functions were tested directly against a real local
  Postgres: confirm, duplicate-guard, undo without a reason (rejected), undo
  with a reason (succeeds), undo on something never scanned (safe no-op), and
  that a slot freed by an undo can be scanned again for real afterward

Not verified here — needs a real browser against your live project:
- The realtime subscription actually pushing a row update within your Supabase
  project specifically (the underlying mechanism was confirmed against current
  Supabase documentation, but this sandbox can't reach supabase.co to fire an
  actual round trip)
- On-screen appearance of the flash animation, stat cards, and detail panel

Fastest way to check both at once: open the dashboard in one tab, open the
attendant app in another, scan one of the demo QR codes, and watch the row
appear/flash on the dashboard without touching refresh.
