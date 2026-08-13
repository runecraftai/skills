# Example Run — Complete Flywheel Loop (Two Phases)

A step-by-step walkthrough of a full Flywheel loop, from roadmap generation through
two-phase completion, with a programmatic gate, an LLM-judge gate, a NEEDS_CONTEXT
retry, and a mid-phase pause/resume across hosts.

**Project**: Recipes API — a simple web app for sharing cooking recipes, built with
Express.js. User: Alex, a solo founder who knows enough code to read it but wants
the agent to do the heavy lifting.

**Host context**: Starts in Cursor. Mid-phase pause; resumes in Claude Code.

---

## Step 0 — Initial workspace

Alex has a bare project directory:

```
/home/alex/projects/recipes-api/
├── package.json         # { "name": "recipes-api", "dependencies": { "express": "^5.0" } }
└── tsconfig.json        # strict mode, ESNext
```

No `.flywheel/` directory yet. Alex wants Flywheel to build the project from this
starting point.

---

## Step 1 — `/loop-roadmap`: Generate the roadmap

Alex runs `/loop-roadmap` in Cursor. Flywheel detects the bare project, picks
`type: application` (rigor: deep), and runs a coach-style interview:

> **Flywheel**: What's the one outcome that means this shipped?
> **Alex**: A public page where anyone can browse recipes, and a register endpoint
> for contributors.
>
> **Flywheel**: What are the core entities?
> **Alex**: User (email + name) and Recipe (title, ingredients, steps, author).

The interview is brief — the project scope is small. Flywheel writes two files.

### `.flywheel/roadmap.md` (after generation)

```markdown
# Recipes API Roadmap

type: application
rigor: deep

## Vision

A web app with a styled homepage listing recipes and a registration endpoint
so contributors can sign up. Publicly browsable; registration is self-serve.

## Out of Scope

- Authentication (login, sessions, JWT)
- Recipe submission UI
- Admin panel
- Deployment / hosting

## Milestones

### M1: Core API + Homepage

- [ ] P1 — Add user registration endpoint  · id: m1-p1  · risk: standard
- [ ] P2 — Style the homepage              · id: m1-p2  · risk: standard

## Autonomy

mode: hitl
budget_per_phase: 3
```

**What happened**: `loop-roadmap` detected the project type (`application`) and
ran a deep-rigor interview, but the scope was narrow so it produced a single
milestone with two phases. Both are `standard` risk — internal changes, no money
or auth at stake, so the default HITL mode applies without forced sign-off.

### `.flywheel/state.md` (after generation)

```markdown
# Loop State

- active-phase-id: (none)
- iteration: 0
- percentage-complete: 0%
- autonomy-mode: hitl
- budget-remaining: 3
- status: idle
```

**What happened**: Fresh state, no phase active yet. `loop-run` will pick up from
here.

---

## Step 2 — `/loop-contract`: Contract for Phase 1

Alex runs `/loop-contract`. Flywheel reads `roadmap.md`, finds `m1-p1` is the
next pending phase, and generates its contract.

### `.flywheel/contracts/m1-p1.md` (after creation)

```markdown
# Phase Contract: m1-p1 — Add user registration endpoint

risk: standard

## Objective

Add a POST /api/register endpoint that accepts a JSON body with `email` and
`name`, validates both fields are non-empty, and returns `{ "success": true }`
on valid input or `{ "success": false, "error": "..." }` on invalid input.

## Scope (allowed files)

- src/index.ts
- src/routes/auth.ts
- package.json

## Out of Scope

- Database persistence (store in-memory array for now)
- Password / hashing
- Email verification
- Tests (not in scope for this phase)

## Acceptance Criteria (BDD)

- AC-1:
    Given a running server on port 3000
    When  I POST to /api/register with { "email": "ada@example.com", "name": "Ada" }
    Then  the response has HTTP 200 and body.success is true

- AC-2:
    Given a running server on port 3000
    When  I POST to /api/register with { "email": "", "name": "" }
    Then  the response has HTTP 200 and body.success is false with an error message

## Verify Method

kind: programmatic
command: "curl -s http://localhost:3000/api/register -X POST -H 'Content-Type: application/json' -d '{\"email\":\"ada@example.com\",\"name\":\"Ada\"}' | python3 -c \"import sys,json; d=json.load(sys.stdin); sys.exit(0 if d.get('success') else 1)\""
sensor: on

## Impact

impact: internal

## Mandatory sub-steps

contract → apply → measure → judge → learn

## Budget & Stop

max_iterations: 3
stop_criterion: "halt if the server cannot start within 2 iterations"
```

**What happened**: `loop-contract` scaffolded the contract from the roadmap phase
entry. The verify method is **programmatic**: a `curl` command piped through
`python3` that exits 0 if `success === true`. The `sensor: on` field means the
discrimination sensor will inject a known-bad variant before judging.

---

## Step 3 — `/loop-run`: Execute Phase 1

Alex runs `/loop-run`. Flywheel reads `state.md` (no active phase), selects
`m1-p1` from `roadmap.md`, finds the contract exists, and begins the loop.

```
loop-run: SELECT → m1-p1 (first pending)
loop-run: CONTRACT → m1-p1.md found ✓
loop-run: entering Phase 1 — "Add user registration endpoint" (risk: standard)
loop-run: budget: 3 iterations, autonomy: hitl
```

### Iteration 1 — APPLY (in-session)

`loop-run` edits the allowed files. It creates a minimal Express server with a
POST route:

**`src/index.ts`** (created):
```typescript
import express from 'express';

const app = express();
app.use(express.json());

// placeholder — route will be wired next
app.post('/api/register', (req, res) => {
  // TODO
});

app.listen(3000, () => console.log('server on :3000'));
```

**`src/routes/auth.ts`** (created):
```typescript
// intentionally empty — the implementation is incomplete
```

This is where the problem starts. The agent wired a placeholder but didn't
complete the handler body or import the route module.

### Iteration 1 — MEASURE → JUDGE

```
loop-run: MEASURE → running programmatic gate...
$ curl -s http://localhost:3000/api/register -X POST ... | python3 -c ...
  exit code: 1  (command failed — no success field in response)
loop-run: invoking loop-judge (fresh pass, author≠verifier)
```

`loop-judge` reads the contract, the workspace, and the run-log. It attempts to
verify AC-1 and AC-2. The server starts, but the `/api/register` endpoint returns
no body — the handler is a placeholder. The gate fails. The judge also cannot
determine whether the framework routing is set up correctly — the `auth.ts`
module is empty and not imported.

`loop-judge` emits:

```
status: NEEDS_CONTEXT
verdict: (none — no revert needed, the gate hasn't been met yet)
evidence: "src/routes/auth.ts:1 — empty file, no implementation.
          src/index.ts:7 — handler body is a TODO placeholder.
          Programmatic gate exit code: 1 (no success field)."
note: "Cannot determine intended framework routing pattern.
       Missing context: is auth.ts meant to export a Router or a
       function? Does the handler need middleware for body parsing?"
```

### Iteration 1 — Decision flow: NEEDS_CONTEXT

```
loop-run: judge status → NEEDS_CONTEXT
loop-run: launching discovery subagent to gather routing context...
```

The **discovery subagent** researches the project:

- Reads `package.json` → Express 5.x is the dependency.
- Reads `tsconfig.json` → ESNext, strict.
- Searches the codebase → no existing route patterns; this is the first route.

**Subagent findings (appended to `.flywheel/runs/m1-p1.md`)**:

```
## Discovery Findings (NEEDS_CONTEXT retry)

- Framework: Express 5.x, using ES module syntax.
- Routing convention: Express Router pattern — create a Router in routes/auth.ts,
  export it, mount it with app.use() in index.ts.
- Body parsing: express.json() middleware is already applied in index.ts:4.
- Validation: manual checks (no Zod in dependencies). Return { success: false,
  error: "..." } for empty fields.
```

### Iteration 2 — APPLY (retry with context)

`loop-run` retries with the discovered context. Implementations this time are
complete:

**`src/routes/auth.ts`** (rewritten):
```typescript
import { Router } from 'express';

const router = Router();

const users: { email: string; name: string }[] = [];

router.post('/register', (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) {
    res.json({ success: false, error: 'email and name are required' });
    return;
  }
  users.push({ email, name });
  res.json({ success: true });
});

export default router;
```

**`src/index.ts`** (updated):
```typescript
import express from 'express';
import authRoutes from './routes/auth.js';

const app = express();
app.use(express.json());
app.use('/api', authRoutes);

app.listen(3000, () => console.log('server on :3000'));
```

### Iteration 2 — MEASURE → JUDGE

```
loop-run: MEASURE → running programmatic gate...
$ curl -s http://localhost:3000/api/register -X POST \
    -H 'Content-Type: application/json' \
    -d '{"email":"ada@example.com","name":"Ada"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if d.get('success') else 1)"
  exit code: 0  ✓

$ curl -s http://localhost:3000/api/register -X POST \
    -H 'Content-Type: application/json' \
    -d '{"email":"","name":""}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if not d.get('success') else 1)"
  exit code: 0  ✓  (success is false, error present)

loop-run: invoking loop-judge (fresh pass, author≠verifier)
```

`loop-judge` runs the gate independently and activates the **discrimination sensor**:

```
loop-judge: sensor check → injecting known-bad variant...
  Variant: removed email/name validation, always returns { success: true }
  Gate result on variant: exit code 0 (PASS — this is BAD)
  Sensor: FAIL — gate did not reject the broken variant.
          The gate command only checks success=true, not success=false cases.

loop-judge: adapting gate for sensor requirements...
  Updated gate command to test BOTH AC-1 AND AC-2 explicitly:
  curl ... | jq -e '.success == true'   # AC-1: valid input → success
  curl ... | jq -e '.success == false'  # AC-2: invalid input → error

loop-judge: re-running gate with updated command...
  AC-1: exit 0 ✓  |  AC-2: exit 0 ✓
  Sensor retest on known-bad: exit 1 (AC-2 fails — success is true when it
  should be false) ✓  Sensor now PASSES.

loop-judge: verdict → KEEP
  status: DONE
  evidence: "AC-1: curl→jq exit 0, response body: {success:true}
             AC-2: curl→jq exit 0, response body: {success:false,error:'email and name are required'}
             Sensor: rejected known-bad variant (AC-2 caught the bypass)"
```

**Annotation**: The sensor caught a gap in the original gate command — it only
checked the happy path. The judge tightened the command to test both ACs explicitly,
then confirmed the sensor rejects a variant that skips validation. This is the
anti-self-approval mechanism from `spec-driven` at work.

### Iteration 2 — UNIFY

```
loop-run: judge status → DONE (KEEP)
loop-run: invoking loop-learn to record decision...
loop-run: marking m1-p1 as [x] in roadmap.md
loop-run: updating state.md → percentage-complete: 50%
loop-run: Phase 1 complete. 2 iterations used / 3 budget.
```

### `.flywheel/runs/m1-p1.md` (after phase 1)

```markdown
# Run Log: m1-p1

## Iteration 1

- **hypothesis**: Create Express server with POST /api/register route;
  wire auth.ts as route module.
- **diff-range**: src/index.ts (new), src/routes/auth.ts (new)
- **measure**: programmatic gate exit code 1 vs baseline (no server running)
- **status**: NEEDS_CONTEXT
- **verdict**: (none)
- **evidence**: src/routes/auth.ts:1 — empty file; src/index.ts:7 — TODO
  placeholder; gate exit code 1.
- **note**: Handler incomplete. Routing pattern unclear — Express Router vs
  inline handler.

## Discovery Findings (NEEDS_CONTEXT retry)

- Framework: Express 5.x, ES module syntax.
- Routing convention: Express Router pattern — create Router in routes/auth.ts,
  export, mount with app.use().
- Body parsing: express.json() already applied in index.ts:4.
- Validation: manual checks. Return { success: false, error: "..." } for
  empty fields.

## Iteration 2

- **hypothesis**: Complete the Router-based handler in auth.ts with email/name
  validation, import and mount in index.ts.
- **diff-range**: src/routes/auth.ts (rewritten), src/index.ts (updated
  import + mount)
- **measure**: programmatic gate — AC-1 exit 0 ✓, AC-2 exit 0 ✓ vs baseline
  (gate failed)
- **status**: DONE
- **verdict**: KEEP
- **evidence**: AC-1: curl→jq exit 0, response {success:true}. AC-2: curl→jq
  exit 0, response {success:false,error:'email and name are required'}. Sensor:
  rejected known-bad variant (validation bypass caught).
- **note**: Sensor flagged original gate gap (only happy-path tested). Judge
  tightened command to cover both ACs. Sensor passed after fix.

## Outcome

- **phase**: DONE
- **iterations-used**: 2 / 3
```

### `.flywheel/state.md` (after phase 1)

```markdown
# Loop State

- active-phase-id: (none)
- iteration: 0
- percentage-complete: 50%
- autonomy-mode: hitl
- budget-remaining: 3
- status: idle
```

---

## Step 4 — `/loop-contract`: Contract for Phase 2

Alex runs `/loop-contract`. Flywheel reads `roadmap.md`, finds `m1-p2` is the
next pending phase, and generates its contract.

### `.flywheel/contracts/m1-p2.md` (after creation)

```markdown
# Phase Contract: m1-p2 — Style the homepage

risk: standard

## Objective

Create a styled, responsive homepage at / that lists recipes with a clean
layout, readable typography, and a color scheme that feels warm and culinary.

## Scope (allowed files)

- public/index.html
- public/style.css
- src/index.ts         # (read-only — may need to serve static files)

## Out of Scope

- JavaScript interactivity
- Dark mode
- Responsive beyond desktop + tablet (mobile deferred)
- Recipe data API (use hardcoded sample data in HTML)

## Acceptance Criteria (BDD)

- AC-1:
    Given a running server serving /public as static files
    When  I visit http://localhost:3000/
    Then  I see a page with a header ("Recipes"), a subtitle, and at least
          3 recipe cards each showing a title and list of ingredients

- AC-2:
    Given the homepage is rendered
    When  I visually inspect the layout
    Then  the design uses a warm color palette (oranges, browns, creams),
          typography is readable at 16px+ base size, and the recipe cards
          have visual separation (borders, shadows, or spacing)

- AC-3:
    Given the homepage is rendered
    When  I resize the browser to a tablet-width viewport (768px)
    Then  the recipe cards reflow into a multi-column or stacked layout
          without horizontal overflow or text clipping

## Verify Method

kind: llm-judge
judge_rubric: |
  Score 0–100 against AC-1..AC-3:
  - AC-1 (40 pts): header, subtitle, ≥3 recipe cards with title+ingredients
  - AC-2 (35 pts): warm palette, readable typography (≥16px), card separation
  - AC-3 (25 pts): responsive at 768px, no overflow, clean reflow
  PASS threshold: 70
sensor: on

## Impact

impact: internal

## Mandatory sub-steps

contract → apply → measure → judge → learn

## Budget & Stop

max_iterations: 3
stop_criterion: "stop if scoring < 40 after 2 iterations (fundamental
disconnect in design taste)"
```

**What happened**: This phase uses an **LLM-judge** gate. The judge_rubric
breaks the acceptance criteria into weighted buckets (40/35/25) with a minimum
70% threshold. `sensor: on` means the judge will inject a visual defect (e.g.,
removing the color palette, breaking the cards) and confirm it's rejected.

---

## Step 5 — `/loop-run`: Execute Phase 2 (with mid-phase pause/resume)

Alex runs `/loop-run`. Flywheel selects `m1-p2` and enters the phase.

```
loop-run: SELECT → m1-p2 (next pending)
loop-run: CONTRACT → m1-p2.md found ✓
loop-run: entering Phase 2 — "Style the homepage" (risk: standard)
loop-run: budget: 3 iterations, autonomy: hitl
```

### Iteration 1 — APPLY (in-session)

`loop-run` creates the homepage files. It also updates `src/index.ts` to serve
static files (read-only scope — the contract allows this).

**`public/index.html`** (created):
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recipes</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header>
    <h1>Recipes</h1>
    <p class="subtitle">Discover and share your favorite dishes</p>
  </header>
  <main class="recipe-grid">
    <article class="recipe-card">
      <h2>Classic Margherita Pizza</h2>
      <ul>
        <li>Pizza dough</li>
        <li>San Marzano tomatoes</li>
        <li>Fresh mozzarella</li>
        <li>Basil leaves</li>
      </ul>
    </article>
    <article class="recipe-card">
      <h2>Thai Green Curry</h2>
      <ul>
        <li>Coconut milk</li>
        <li>Green curry paste</li>
        <li>Chicken thighs</li>
        <li>Thai basil</li>
      </ul>
    </article>
    <article class="recipe-card">
      <h2>Chocolate Lava Cake</h2>
      <ul>
        <li>Dark chocolate</li>
        <li>Butter</li>
        <li>Eggs</li>
        <li>Flour</li>
      </ul>
    </article>
  </main>
</body>
</html>
```

**`public/style.css`** (created):
```css
:root {
  --warm-cream: #fdf6ec;
  --warm-orange: #e07c3a;
  --warm-brown: #5c3d2e;
  --card-bg: #fffaf3;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--warm-cream);
  color: var(--warm-brown);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 17px;
  line-height: 1.6;
  padding: 2rem;
}

header {
  text-align: center;
  margin-bottom: 3rem;
}

header h1 {
  font-size: 2.5rem;
  color: var(--warm-orange);
  margin-bottom: 0.5rem;
}

.subtitle {
  font-style: italic;
  color: #8b6f5a;
}

.recipe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.recipe-card {
  background: var(--card-bg);
  border: 1px solid #e8d5b7;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.recipe-card h2 {
  font-size: 1.25rem;
  color: var(--warm-orange);
  margin-bottom: 0.75rem;
}

.recipe-card ul {
  list-style: none;
  padding-left: 0;
}

.recipe-card li {
  padding: 0.25rem 0;
  border-bottom: 1px dotted #e0d0bb;
}

.recipe-card li:last-child {
  border-bottom: none;
}
```

**`src/index.ts`** (updated — added static file serving):
```typescript
import express from 'express';
import authRoutes from './routes/auth.js';

const app = express();
app.use(express.json());
app.use(express.static('public'));   // ← added for homepage
app.use('/api', authRoutes);

app.listen(3000, () => console.log('server on :3000'));
```

---

### Mid-phase Pause

At this point — **after APPLY but before MEASURE/JUDGE** — Alex needs to switch
machines. Cursor is on their desktop; they want to continue from their laptop
using Claude Code.

```
alex@desktop:~/projects/recipes-api$ /loop-run pause
```

#### `/loop-run pause` — what happens

```
loop-run: pause requested mid-phase (m1-p2, iteration 1, after APPLY)
loop-run: flushing run-log...
loop-run: writing state.md with current position...
loop-run: in-flight change is committed as checkpoint (not reverted).
          commit: "checkpoint: m1-p2 iteration 1 APPLY complete,
                   pending MEASURE/JUDGE"
loop-run: paused. Resume with /loop-run resume in any host.
```

### `.flywheel/state.md` (after pause)

```markdown
# Loop State

- active-phase-id: m1-p2
- iteration: 1
- percentage-complete: 50%
- autonomy-mode: hitl
- budget-remaining: 2
- status: paused
- checkpoint: APPLY complete, pending MEASURE/JUDGE
```

**What happened**: `state.md` now records the exact position: phase `m1-p2`,
iteration 1, APPLY done but pending measurement. The in-flight change was
committed as a checkpoint — not left ambiguous. Budget remaining is 2 (one
iteration was consumed by APPLY).

---

### Resume in a different host (Claude Code)

Alex opens the project on their laptop, inside Claude Code:

```
alex@laptop:~/projects/recipes-api$ /loop-run resume
```

#### `/loop-run resume` — what happens

```
loop-run: reading .flywheel/state.md...
  active-phase-id: m1-p2
  iteration: 1
  status: paused
  checkpoint: APPLY complete, pending MEASURE/JUDGE

loop-run: reading .flywheel/contracts/m1-p2.md...
  verify-method: llm-judge, sensor: on, threshold: 70

loop-run: reading .flywheel/runs/m1-p2.md...
  (no prior iterations — this is a fresh phase)

loop-run: reconstructing position...
  Phase: m1-p2, Iteration: 1
  State: APPLY done → next step: MEASURE
  Host: Claude Code (changed from Cursor) ← detected, no issue — state is file-based

loop-run: resuming from iteration 1, MEASURE step.
```

**Annotation**: Resume works because everything `loop-run` needs is in the files:
`state.md` gives position, the contract gives the rules, and the run-log gives
history. No runtime state survived — it was all reconstructed from `.flywheel/`.

### Iteration 1 (continued) — MEASURE → JUDGE

`loop-run` continues from where it left off. The APPLY work is already on disk
(committed as a checkpoint). MEASURE runs the LLM-judge gate:

```
loop-run: MEASURE → invoking loop-judge (llm-judge gate, author≠verifier)...
```

`loop-judge` (fresh Claude Code session, independent verifier) reads the
contract, inspects the rendered pages, and scores against the rubric:

```
loop-judge: reading contract → judging AC-1..AC-3

  AC-1 (max 40): header "Recipes" ✓, subtitle ✓, 3 recipe cards ✓,
                 each has title ✓ + ingredient list ✓
  → Score: 40/40

  AC-2 (max 35): warm palette (cream bg, orange headers, brown text) ✓,
                 base font 17px ✓, cards have borders ✓ + shadows ✓
  → Score: 35/35

  AC-3 (max 25): grid uses auto-fill with minmax(300px, 1fr) ✓,
                 at 768px cards reflow to 2 columns ✓,
                 no horizontal overflow ✓
  → Score: 25/25

  Raw score: 100/100

loop-judge: sensor check → injecting known-bad variant...
  Variant: removed all CSS — no colors, no grid, unstyled HTML.
  Re-scoring on variant:
    AC-1: 20/40 (cards present but unstyled)
    AC-2: 0/35 (no palette, no typography control)
    AC-3: 10/25 (browser defaults, no grid reflow)
    Total: 30/100 — below threshold of 70
  Sensor: PASS ✓ (variant correctly rejected)

loop-judge: final score: 100/100 (sensor: pass)
  verdict: KEEP
  status: DONE
  evidence: "AC-1: public/index.html:18-42 — 3 recipe cards with h2 + ul.
             AC-2: public/style.css:1-15 — warm palette variables;
             style.css:28 — 17px base; style.css:60-66 — border + box-shadow.
             AC-3: style.css:52-56 — grid auto-fill minmax(300px, 1fr);
             verified at 768px in browser — cards stack 2-column, no overflow.
             Sensor: unstyled variant scored 30/100, below 70 threshold, rejected."
```

### Iteration 1 — UNIFY

```
loop-run: judge status → DONE (KEEP)
loop-run: invoking loop-learn to record decision...
loop-run: marking m1-p2 as [x] in roadmap.md
loop-run: updating state.md → percentage-complete: 100%
loop-run: Phase 2 complete. 1 iteration used / 3 budget.
loop-run: All phases complete. Roadmap done.
```

### `.flywheel/runs/m1-p2.md` (after phase 2)

```markdown
# Run Log: m1-p2

## Iteration 1

- **hypothesis**: Create index.html with 3 recipe cards + style.css with warm
  palette, readable typography, responsive grid. Add express.static to index.ts.
- **diff-range**: public/index.html (new), public/style.css (new),
  src/index.ts (+1 line: express.static)
- **measure**: LLM-judge score 100/100 vs baseline (no homepage existed)
- **status**: DONE
- **verdict**: KEEP
- **evidence**: AC-1: public/index.html:18-42 — 3 cards with h2 + ul (40/40).
  AC-2: public/style.css:1-15 — warm palette vars; :28 — 17px base;
  :60-66 — border + box-shadow (35/35). AC-3: style.css:52-56 — grid
  auto-fill minmax(300px,1fr); verified at 768px — 2-col, no overflow (25/25).
  Sensor: unstyled variant scored 30/100 < 70 threshold, correctly rejected.
- **note**: Clean pass — all ACs met on first iteration. Sensor confirmed the
  gate distinguishes styled vs unstyled output.

## Outcome

- **phase**: DONE
- **iterations-used**: 1 / 3
```

---

## Final State

### `.flywheel/state.md` (roadmap complete)

```markdown
# Loop State

- active-phase-id: (none)
- iteration: 0
- percentage-complete: 100%
- autonomy-mode: hitl
- budget-remaining: 3
- status: done
```

### `.flywheel/roadmap.md` (all phases checked)

```markdown
# Recipes API Roadmap

type: application
rigor: deep

## Vision

A web app with a styled homepage listing recipes and a registration endpoint
so contributors can sign up. Publicly browsable; registration is self-serve.

## Out of Scope

- Authentication (login, sessions, JWT)
- Recipe submission UI
- Admin panel
- Deployment / hosting

## Milestones

### M1: Core API + Homepage

- [x] P1 — Add user registration endpoint  · id: m1-p1  · risk: standard
- [x] P2 — Style the homepage              · id: m1-p2  · risk: standard

## Autonomy

mode: hitl
budget_per_phase: 3
```

### `.flywheel/memory/decisions.md` (both phase outcomes recorded)

```markdown
# Decisions

## m1-p1 — Add user registration endpoint
- date: 2026-07-25
- decision: Express Router-based POST /api/register with manual email+name
  validation; in-memory users array.
- rationale: Router pattern is the Express convention; manual validation avoids
  a Zod dependency for a single endpoint. In-memory storage is sufficient for
  this phase (persistence is out of scope).
- evidence: src/routes/auth.ts:1-17 — Router + validation handler;
  src/index.ts:8 — mount at /api. AC-1 curl exit 0 ✓; AC-2 curl exit 0 ✓.
- status: DONE
- concern: (none)

## m1-p2 — Style the homepage
- date: 2026-07-25
- decision: Static HTML + CSS with warm culinary palette (cream, orange, brown);
  CSS Grid recipe cards; express.static for serving.
- rationale: Warm palette matches food/recipe theme. CSS Grid auto-fill gives
  responsive reflow without media queries for core layout. 17px base font for
  readability.
- evidence: public/style.css:1-15 — palette variables; :52-56 — grid;
  :28 — 17px base. LLM-judge score: 100/100; sensor passed.
- status: DONE
- concern: (none)
```

### `.flywheel/memory/lessons.md` (from the sensor catch in phase 1)

```markdown
# Lessons

## m1-p1 — Gate focused only on happy path
- trigger: Discrimination sensor injected a validation-bypass variant and the
  gate (checking only `success === true`) did not reject it.
- root-cause: The original programmatic gate command tested only AC-1 (valid
  input → success). AC-2 (invalid input → error) was untested until the sensor
  flagged the gap.
- guidance: When writing programmatic gate commands, test BOTH passing AND
  failing acceptance criteria explicitly. A gate that only checks the happy
  path is vulnerable to bypass — the sensor will catch it, but it costs an
  iteration to fix mid-run.
- evidence: Original gate: `curl ... | jq .success` (AC-1 only). Sensor
  variant: removed validation, always returns success=true → gate passed.
  Fixed gate: separate jq checks for AC-1 (success=true) and AC-2
  (success=false).
```

---

## Summary

| What | How it played out |
|---|---|
| **Two phases** | m1-p1 (programmatic gate via curl) and m1-p2 (LLM-judge gate with rubric) |
| **Roadmap gen** | `/loop-roadmap` → interview → roadmap.md + state.md |
| **Contract per phase** | `/loop-contract` → scoped program.md with BDD ACs, gate type, sensor, budget |
| **Phase 1: NEEDS_CONTEXT** | First APPLY was incomplete → judge returned NEEDS_CONTEXT → discovery subagent researched Express patterns → iteration 2 succeeded with DONE |
| **Phase 1: sensor catch** | Discrimination sensor caught a gate gap (happy-path-only check) → judge tightened the command → sensor re-passed |
| **Mid-phase pause/resume** | Paused in Cursor after APPLY, resumed in Claude Code — state reconstructed from `.flywheel/state.md` + contract + run-log alone |
| **Phase 2: LLM-judge** | judge scored 100/100 across 3 ACs; sensor injected unstyled variant, confirmed rejection |
| **Final state** | state.md at 100% done, roadmap.md all [x], decisions.md has both phases, lessons.md has the sensor finding |
| **Audit trail** | `runs/m1-p1.md` shows 2 iterations + discovery findings; `runs/m1-p2.md` shows 1 iteration |
| **Cross-host resume** | Paused in Cursor, resumed in Claude Code — state survived because it's file-based |
