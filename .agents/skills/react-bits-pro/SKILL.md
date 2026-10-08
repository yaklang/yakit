---
name: react-bits-pro
description: >
  Install and integrate React Bits Pro components, marketing blocks, App UI
  blocks, Agent Kit skills and landing-page templates into React/Next.js apps
  via the shadcn registry CLI with license-key auth. Use whenever the user wants
  animated components (WebGL/shader backgrounds, GSAP and Motion animation, 3D,
  cursor trails, text effects, cards, carousels, galleries), marketing sections
  (hero, features, pricing, navigation, footer, FAQ, CTA, auth, stats, blog,
  contact, social proof, about, waitlist, showcase, how-it-works, download,
  ecommerce, bento grids and Bento Builder), app interface blocks (app shells, sidebars, dashboards, data
  tables, analytics, command menus, settings, dialogs, kanban, billing,
  onboarding) or AI/agent surfaces (chat, prompt inputs, tool calls, agent
  plans, approvals, usage), landing-page templates, or Agent Kit design skills,
  page prompts and recipes. Also use when integrating these into an existing
  page or design system, or on "react bits", "reactbits",
  "@reactbits-starter", "@reactbits-pro", "app ui" or "agent kit".
license: Proprietary
compatibility: >
  React 18 or 19. Next.js 14+ (App Router recommended) or any React framework
  that supports client components. Tailwind CSS v4 strongly recommended for
  blocks (they use v4 utility names). Node.js 18+ for the shadcn CLI.
metadata:
  author: reactbits
  version: "3.1"
---

# React Bits Pro Integration

You are integrating **React Bits Pro**, a premium shadcn-compatible registry of:

- **150 animated components** (Starter tier and above)
- **280 marketing blocks** in 22 categories (**Pro tier and above**), including 42 composable Bento tiles
- **300 App UI blocks** in 38 categories (**Pro tier and above**)
- **20 Agent Kit items**: design skills, page prompts, recipes and the setup skill (**Pro tier and above**, one free; setup skill available on Starter)
- **15 landing-page templates** (**Ultimate tier**, one free)

Items install as real source files into the user's project; the user owns and can
edit them.

**September 2026 adds 16 components, 42 Bento tiles, the Bento Builder, and four templates:**
Agentframe, Cloudlight, Imageworks and Sparkdesign. The catalogs below include all of them.

**Tier matters before you install anything.** Components are Starter. Marketing
blocks, App UI blocks and the Agent Kit all require **Pro or Ultimate**. Included template
downloads require **Ultimate**, with free and individual-purchase options described below.
Installing a Pro item with a Starter key returns `403`, not a
confusing build error, so check the tier first and tell the user plainly if their
plan does not cover what they asked for.

This document is the single source of truth. Follow it literally. Where it says
"verify," verify: do not guess.

---

## Golden rules (read first, never break these)

1. **Check the tier before installing.** Components are Starter+. **Marketing blocks, App UI
   blocks and the Agent Kit are Pro+.** Included template downloads are Ultimate. A Starter key on a Pro item
   returns `403 Forbidden`. If the user's plan does not cover the request, say so directly
   rather than retrying the install.
2. **Never guess a marketing block's import statement.** Marketing block files use a _mix_ of
   `export default` and named `export` styles, and the identifier does **not** reliably follow
   the slug (`404-3` exports `NotFound3`; `cta-3` exports `CTA3` but `cta-4` exports `Cta4`).
   After installing one, read its `export` line and import accordingly. See
   [Importing installed items](#importing-installed-items). **App UI blocks are the exception:
   all 300 are `export default`.**
3. **Components use a `-tw` or `-css` suffix; every kind of block uses no suffix.**
   `silk-waves-tw` is a component; `hero-1` is a marketing block; `ai-chat-1` is an App UI
   block. Mismatched names return 404.
4. **The license key is a secret.** Put it in `.env.local`, never commit it, never hardcode it.
5. **Never delete the `"use client"` directive.** Every component and block is a client component.
6. **WebGL/shader components need an explicitly sized parent** (a container with width and height).
7. **App UI blocks need a height-bounded parent.** Their root is `h-full min-h-[Npx]`; drop one
   into a parent with no height and its scroll areas collapse. See
   [App UI blocks](#app-ui-blocks-pro-tier).
8. **Always harmonize.** A block is a starting point, not a finished section. When you add a
   block to an existing page, match the host's type scale, colours, spacing, container width
   and radii. When you stack several blocks, reconcile them into one system before showing
   the result. Editing the installed source is expected. See
   [Harmonizing blocks](#harmonizing-blocks-never-skip-this).
9. **Do not overwrite the user's existing `components.json` fields**: only merge in `registries`.
10. **Templates are downloads, not CLI installs.** Ultimate includes template downloads;
    some are also available free or through individual purchase. See [Templates](#templates-ultimate-tier).
11. **Bento tiles do not use the App UI theme.** Keep them outside `.rb-theme-scope` and do not
    apply App UI accent, base, font or radius overrides to them. They still follow the site's
    normal light/dark mode. Customize a tile by editing its own source.

---

## TL;DR: fastest correct path

```bash
# 0. (once) Ensure the project is a shadcn project with the cn() helper.
npx shadcn@latest init            # only if components.json is missing

# 1. Add the license key to .env.local (never commit it):
#    REACTBITS_LICENSE_KEY=rbp...-your-key

# 2. Merge the two registries into components.json (see Step 3 below).

# 3. Install items (components take -tw/-css; all blocks take no suffix):
npx shadcn@latest add @reactbits-starter/silk-waves-tw   # component  (Starter+)
npx shadcn@latest add @reactbits-pro/hero-1              # marketing block (Pro+)
npx shadcn@latest add @reactbits-pro/ai-chat-1           # App UI block   (Pro+)
npx shadcn@latest add @reactbits-pro/skill-swiss-grid    # Agent Kit skill (Pro+)

# 4. Open the installed file, read its `export` line, then import it:
#    components/react-bits/silk-waves.tsx  -> export default  -> import SilkWaves from "@/components/react-bits/silk-waves"
#    components/blocks/hero-1.tsx          -> export function Hero1  -> import { Hero1 } from "@/components/blocks/hero-1"
#    components/blocks/ai-chat-1.tsx       -> export default  -> import AiChat1 from "@/components/blocks/ai-chat-1"
```

If `components.json` already has the `@reactbits-starter` registry, you can also pull
this skill into the project as a local file:

```bash
npx shadcn@latest add @reactbits-starter/skill   # writes ./SKILL.md to the project root
```

---

## When to use this skill

Use it when the user wants to:

- Add React Bits Pro components, blocks, or templates to a project.
- Add animated UI (shaders, particles, 3D, WebGL, cursor effects, text/Motion/GSAP animations).
- Drop in pre-built marketing sections (hero, pricing, features, navigation, footer, FAQ, CTA, etc.).
- Build signed-in product UI: app shells, sidebars, dashboards, data tables, analytics,
  command menus, settings, billing, onboarding, kanban boards.
- Build AI or agent interfaces: chat, prompt inputs, tool calls, agent plans, approvals, usage.
- Assemble a landing page quickly from premium blocks.
- Compose an animated bento grid or use the Bento Builder's generated code or agent prompt.
- Add a section to a page they already have, and make it match the existing design.
- Install an Agent Kit design skill, page prompt or full-page recipe.
- Mention "react bits", "reactbits", "@reactbits-starter", "@reactbits-pro", "app ui", or "agent kit".

Do **not** use it to build generic shadcn/ui primitives (button, dialog, etc.). Those come
from the standard shadcn registry, not React Bits Pro.

---

## Architecture overview

React Bits Pro ships through the **shadcn registry protocol** over two
license-authenticated registries:

| Registry             | Contains                                             | Min. tier to install     | Install prefix                           |
| -------------------- | ---------------------------------------------------- | ------------------------ | ---------------------------------------- |
| `@reactbits-starter` | 150 animated components (each in 2 variants)         | Starter                  | `@reactbits-starter/<slug>-tw` or `-css` |
| `@reactbits-pro`     | 280 marketing blocks (22 categories)                 | **Pro**                  | `@reactbits-pro/<slug>`                  |
| `@reactbits-pro`     | 300 App UI blocks (38 categories)                    | **Pro**                  | `@reactbits-pro/<slug>`                  |
| `@reactbits-pro`     | 20 Agent Kit items (skills, prompts, recipes, setup) | **Pro** (setup: Starter) | `@reactbits-pro/skill-<slug>` etc.       |

Marketing blocks, App UI blocks and the Agent Kit all ship through the **same**
`@reactbits-pro` registry and therefore share the same Pro entitlement. There is no
separate purchase or registry for App UI or the Agent Kit.

Tier hierarchy: **Starter → Pro → Ultimate** (each tier includes everything below it).

| Tier     | License prefix | Components | Marketing blocks | App UI blocks | Agent Kit     | Templates          |
| -------- | -------------- | ---------- | ---------------- | ------------- | ------------- | ------------------ |
| Starter  | `rbps-`        | ✅ 150     | ❌               | ❌            | 1 setup skill | free template only |
| Pro      | `rbpp-`        | ✅ 150     | ✅ 280           | ✅ 300        | ✅ 20         | free template only |
| Ultimate | `rbpu-`        | ✅ 150     | ✅ 280           | ✅ 300        | ✅ 20         | ✅ all 15          |

**Say this plainly to a Starter user who asks for an App UI block, a marketing block or
an Agent Kit item: it requires Pro or Ultimate.** Do not attempt the install and let it
fail with a 403.

Items are written into the codebase as editable source files. They are **not** npm packages.

### Five product types: do not confuse them

| Type                | Source               | Suffix                                  | Delivery                         | Tier              |
| ------------------- | -------------------- | --------------------------------------- | -------------------------------- | ----------------- |
| **Component**       | `@reactbits-starter` | `-tw` / `-css` (required)               | shadcn CLI                       | Starter+          |
| **Marketing block** | `@reactbits-pro`     | none                                    | shadcn CLI                       | **Pro+**          |
| **App UI block**    | `@reactbits-pro`     | none                                    | shadcn CLI                       | **Pro+**          |
| **Agent Kit item**  | `@reactbits-pro`     | `skill-` / `prompt-` / `recipe-` prefix | shadcn CLI                       | **Pro+** (1 free) |
| **Template**        | website download     | n/a                                     | `.zip` download (login required) | Ultimate (1 free) |

**Marketing blocks vs App UI blocks.** Both are Pro, both install to the same directory,
and both are full sections rather than primitives. The difference is what they are _for_:

|             | Marketing block                        | App UI block                                       |
| ----------- | -------------------------------------- | -------------------------------------------------- |
| Purpose     | Public landing/marketing page          | Signed-in product interface                        |
| Examples    | hero, pricing, FAQ, testimonials       | app shell, sidebar, data table, dashboard, AI chat |
| Root height | Heroes may fill the viewport; content sections use `--rb-section-min-h`; Bento tiles fill grid cells | `h-full min-h-[Npx]` (fills its container) |
| Density     | Generous, large type                   | Dense, `text-[13px]` body scale                    |
| Exports     | **Mixed**: always verify               | **Always `export default`**                        |

If the user is building a landing page, reach for marketing blocks. If they are building
a dashboard, admin panel, settings screen or an AI/agent surface, reach for App UI.

### Component variants (`-tw` vs `-css`)

Every component exists in two functionally identical variants. **Pick exactly one per install.**

- **`-tw` (Tailwind)**: styles via Tailwind utility classes and the `cn()` helper. **Default choice.**
  Use this whenever the project uses Tailwind.
- **`-css` (vanilla CSS)**: ships a co-located `.css` file, no Tailwind required. Use only when the
  project does **not** use Tailwind.

Blocks have **no variants**. They are Tailwind-only, single-file.

### Where files are installed

Paths follow the user's `components.json` aliases (and `src/` dir if present). With defaults:

| Item               | On-disk path                                      | Import alias                     |
| ------------------ | ------------------------------------------------- | -------------------------------- |
| Component (`-tw`)  | `components/react-bits/<slug>.tsx`                | `@/components/react-bits/<slug>` |
| Component (`-css`) | `components/react-bits/<slug>.tsx` + `<slug>.css` | `@/components/react-bits/<slug>` |
| Marketing block    | `components/blocks/<slug>.tsx`                    | `@/components/blocks/<slug>`     |
| App UI block       | `components/blocks/<slug>.tsx`                    | `@/components/blocks/<slug>`     |
| Agent Kit skill    | `.claude/skills/<slug>/SKILL.md`                  | n/a (read by the agent)          |
| Agent Kit prompt   | `prompts/<slug>/PROMPT.md`                        | n/a (read by the agent)          |
| Agent Kit recipe   | `recipes/<slug>/RECIPE.md` + `plan.json`          | n/a (read by the agent)          |
| This skill file    | `./SKILL.md` (project root)                       | n/a                              |

App UI blocks and marketing blocks share `components/blocks/`. Category slugs are unique
across both, so they never collide.

The shadcn CLI auto-installs each item's npm dependencies and any registry dependencies.

---

## Step 1: Verify prerequisites

Confirm the project has all of the following before installing:

1. **`components.json` at the project root.** If missing:
   ```bash
   npx shadcn@latest init
   ```
2. **The `cn()` helper at `lib/utils.ts`** (required by every `-tw` component):
   ```typescript
   import { clsx, type ClassValue } from "clsx";
   import { twMerge } from "tailwind-merge";

   export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs));
   }
   ```
   If missing: `npm install clsx tailwind-merge`, then create the file above.
3. **Tailwind CSS configured** (for `-tw` components and all blocks). **Tailwind v4 is strongly
   recommended**: many blocks use v4-renamed utilities such as `bg-linear-to-br` (the v3 name is
   `bg-gradient-to-br`).
4. **A valid license key.** The user must have purchased a React Bits Pro plan. If they have not set
   one up, ask them for it (or point them to https://pro.reactbits.dev/pricing).

---

## Step 2: Configure the license key

Add the key to `.env.local` at the project root:

```bash
REACTBITS_LICENSE_KEY=rbpp-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

- **Never commit `.env.local`.** Ensure `.gitignore` includes it (shadcn's `init` does this by default).
- The shadcn CLI reads this value to fill the `${REACTBITS_LICENSE_KEY}` placeholder in `components.json`.
- If the CLI cannot find the variable, export it in the shell before running `add`:
  ```bash
  export REACTBITS_LICENSE_KEY=rbpp-...
  ```
- The license prefix reveals the tier: `rbps-` = Starter, `rbpp-` = Pro, `rbpu-` = Ultimate.

---

## Step 3: Configure `components.json`

Merge the `registries` object into the existing `components.json`. **Add only this key: do not touch
`$schema`, `style`, `tailwind`, `aliases`, or any other existing field.**

```json
{
  "registries": {
    "@reactbits-starter": {
      "url": "https://pro.reactbits.dev/api/r/starter/{name}.json",
      "headers": {
        "Authorization": "Bearer ${REACTBITS_LICENSE_KEY}"
      }
    },
    "@reactbits-pro": {
      "url": "https://pro.reactbits.dev/api/r/pro/{name}.json",
      "headers": {
        "Authorization": "Bearer ${REACTBITS_LICENSE_KEY}"
      }
    }
  }
}
```

The `{name}` token is replaced by the slug you pass to `add`. `${REACTBITS_LICENSE_KEY}` is read from
the environment / `.env.local`. Configure `@reactbits-starter` even if you only plan to use blocks.
It is also how you install this skill file.

---

## Step 4: Install items

> Components **require** a `-tw` or `-css` suffix. Every kind of block takes **no** suffix.

```bash
# Component: Tailwind variant (default choice)        [Starter+]
npx shadcn@latest add @reactbits-starter/silk-waves-tw

# Component: vanilla-CSS variant (non-Tailwind projects only)
npx shadcn@latest add @reactbits-starter/silk-waves-css

# Marketing block                                      [Pro+]
npx shadcn@latest add @reactbits-pro/hero-1

# App UI block                                         [Pro+]
npx shadcn@latest add @reactbits-pro/ai-chat-1

# Agent Kit: design skill / page prompt / full-page recipe   [Pro+]
npx shadcn@latest add @reactbits-pro/skill-swiss-grid
npx shadcn@latest add @reactbits-pro/prompt-saas
npx shadcn@latest add @reactbits-pro/recipe-saas-homepage

# Several at once (all kinds can be mixed)
npx shadcn@latest add @reactbits-starter/silk-waves-tw @reactbits-pro/hero-1 @reactbits-pro/dashboard-1
```

If any of the `@reactbits-pro` commands above returns **403**, the key is a Starter key.
That is an entitlement result, not a bug: App UI blocks, marketing blocks and the Agent
Kit all require **Pro or Ultimate**. Tell the user rather than retrying.

Optional, inspect an item before installing:

```bash
npx shadcn@latest view @reactbits-starter/silk-waves-tw
```

---

## Importing installed items

This is the step agents most often get wrong. Get the export style right and the import follows.

### Components: always a default export

**Every** `@reactbits-starter` component is `export default`. Import it with **any** local name you like
(no braces):

```tsx
import SilkWaves from "@/components/react-bits/silk-waves";
import AnimatedList from "@/components/react-bits/animated-list";
```

### App UI blocks: always a default export

All **300** App UI blocks are `export default function`, without exception. The identifier
is derived from the slug (`ai-chat-1` exports `AiChat1`, `data-table-3` exports
`DataTable3`), but since it is a default export the local name is yours to choose:

```tsx
import AiChat from "@/components/blocks/ai-chat-1";
import Dashboard from "@/components/blocks/dashboard-4";
```

This is the one case where you do **not** need to read the export line first.

### Marketing blocks: mixed export styles, so verify every time

Marketing block files are **not** consistent: some are `export default function X()` and some
are `export function X()`. The identifier also does **not** reliably match the slug. **Always
confirm the export line, then import accordingly.**

One reliable command to reveal it:

```bash
grep -E "^export (default )?function " components/blocks/<slug>.tsx
```

Apply this rule to the result:

| Export line in the file              | Import to write                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| `export default function Anything()` | `import AnyName from "@/components/blocks/<slug>";` (default import: name is your choice)    |
| `export function Hero1()`            | `import { Hero1 } from "@/components/blocks/<slug>";` (named import: **must** match exactly) |

Examples:

```tsx
// hero-1.tsx contains:  export function Hero1()      -> NAMED import, exact identifier
import { Hero1 } from "@/components/blocks/hero-1";

// 404-3.tsx contains:   export default function NotFound3()  -> DEFAULT import, free name
import ErrorPage from "@/components/blocks/404-3";

// pricing-2.tsx contains: export default function Pricing2()  -> DEFAULT import
import Pricing from "@/components/blocks/pricing-2";
```

### Marketing block import reference (verified)

If you cannot open the file, use this table. **Named-export** blocks must be imported with the **exact**
identifier in braces. **Default-export** blocks can be imported with any name (the listed identifier is the
file's own name, shown for reference). Watch the irregular casing.

**Named exports → `import { Identifier } from "@/components/blocks/<slug>"`:**

| Category     | Slugs                                    | Identifiers                                            |
| ------------ | ---------------------------------------- | ------------------------------------------------------ |
| Auth         | `auth-1..6`                              | `Auth1` … `Auth6`                                      |
| Blog         | `blog-1..5`, `blog-8..11`                | `Blog1` … `Blog5`, `Blog8` … `Blog11`                  |
| Download     | `download-1..3`, `download-6..8`         | `Download1` … `Download3`, `Download6` … `Download8`   |
| Features     | `features-1..5`, `features-10..13`       | `Features1` … `Features5`, `Features10` … `Features13` |
| Footer       | `footer-5`, `footer-6`                   | `Footer5`, `Footer6`                                   |
| Hero         | `hero-1..24`                             | `Hero1` … `Hero24` (all heroes are named)              |
| How It Works | `how-it-works-1..3`, `how-it-works-7..9` | `HowItWorks1..3`, `HowItWorks7..9`                     |
| Navigation   | `navigation-2..8`                        | `Navigation2` … `Navigation8`                          |
| Pricing      | `pricing-5`, `pricing-6`                 | `Pricing5`, `Pricing6`                                 |
| Showcase     | `showcase-1..3`, `showcase-6..8`         | `Showcase1..3`, `Showcase6..8`                         |
| Social Proof | `social-proof-7..9`                      | `SocialProof7`, `SocialProof8`, `SocialProof9`         |

**Default exports → `import AnyName from "@/components/blocks/<slug>"`:**

| Category     | Slugs                                      | File identifiers                                                       |
| ------------ | ------------------------------------------ | ---------------------------------------------------------------------- |
| 404          | `404-1..8`                                 | `NotFound1` … `NotFound8` ⚠️ not "404…"                                |
| About        | `about-1..12`                              | `About1` … `About12`                                                   |
| Bento        | `bento-1..42`                              | `Bento1` … `Bento42` (grid tiles, see Appendix B note)                 |
| Blog         | `blog-6`, `blog-7`                         | `Blog6`, `Blog7`                                                       |
| Comparison   | `comparison-1..8`                          | `Comparison1` … `Comparison8`                                          |
| Contact      | `contact-1..12`                            | `Contact1` … `Contact12`                                               |
| CTA          | `cta-1..14`                                | `CTA1..3`, then `Cta4` … `Cta10`, then `CTA11..14` ⚠️ irregular casing |
| Download     | `download-4`, `download-5`                 | `Download4`, `Download5`                                               |
| Ecommerce    | `ecommerce-1..11`                          | `Ecommerce1` … `Ecommerce11`                                           |
| FAQ          | `faq-1..9`                                 | `FAQ1..3`, then `Faq4`, `Faq5`, then `FAQ6..9` ⚠️ irregular casing     |
| Features     | `features-6..9`                            | `Features6` … `Features9`                                              |
| Footer       | `footer-1..4`, `footer-7..12`              | `Footer1` … `Footer4`, `Footer7` … `Footer12`                          |
| How It Works | `how-it-works-4..6`                        | `HowItWorks4`, `HowItWorks5`, `HowItWorks6`                            |
| Navigation   | `navigation-1`, `navigation-9..15`         | `Navigation1`, `Navigation9` … `Navigation15`                          |
| Pricing      | `pricing-1..4`, `pricing-7..15`            | `Pricing1` … `Pricing4`, `Pricing7` … `Pricing15`                      |
| Profile      | `profile-1..6`                             | `Profile1` … `Profile6`                                                |
| Showcase     | `showcase-4`, `showcase-5`                 | `Showcase4`, `Showcase5`                                               |
| Social Proof | `social-proof-1..6`, `social-proof-10..16` | `SocialProof1` … `SocialProof6`, `SocialProof10` … `SocialProof16`     |
| Stats        | `stats-1..15`                              | `Stats1` … `Stats15`                                                   |
| Waitlist     | `waitlist-1..6`                            | `Waitlist1` … `Waitlist6`                                              |

> If this table ever disagrees with the installed file, **trust the file** and re-run the `grep` check above.

### Using an installed component

```tsx
import SilkWaves from "@/components/react-bits/silk-waves";

export default function Page() {
  return (
    // WebGL/shader components require a sized parent:
    <div className="h-screen w-full">
      <SilkWaves
        speed={1}
        scale={2}
        colors={[
          "#0d1326",
          "#162a52",
          "#1e407e",
          "#2657aa",
          "#2e6ed5",
          "#3785ff",
          "#5092ff",
          "#69a0ff",
        ]}
      />
    </div>
  );
}
```

### Using an installed block

```tsx
import { Hero1 } from "@/components/blocks/hero-1"; // named export → braces

export default function LandingPage() {
  return (
    <main>
      <Hero1 />
    </main>
  );
}
```

Marketing blocks render full-width sections, except Bento tiles, which fill a grid cell.
Blocks take **no props**: customize them by editing the source file.

---

## Composing a landing page from blocks

```bash
npx shadcn@latest add \
  @reactbits-pro/navigation-1 \
  @reactbits-pro/hero-1 \
  @reactbits-pro/features-1 \
  @reactbits-pro/social-proof-1 \
  @reactbits-pro/pricing-1 \
  @reactbits-pro/faq-1 \
  @reactbits-pro/cta-1 \
  @reactbits-pro/footer-1
```

```tsx
// Imports below mix default and named: verified per the reference table above.
import Navigation1 from "@/components/blocks/navigation-1"; // default export
import { Hero1 } from "@/components/blocks/hero-1"; // named export
import { Features1 } from "@/components/blocks/features-1"; // named export
import SocialProof1 from "@/components/blocks/social-proof-1"; // default export
import Pricing1 from "@/components/blocks/pricing-1"; // default export
import Faq1 from "@/components/blocks/faq-1"; // default export (file identifier: FAQ1)
import CTA1 from "@/components/blocks/cta-1"; // default export (file identifier: CTA1)
import Footer1 from "@/components/blocks/footer-1"; // default export

export default function LandingPage() {
  return (
    <>
      <Navigation1 />
      <Hero1 />
      <Features1 />
      <SocialProof1 />
      <Pricing1 />
      <Faq1 />
      <CTA1 />
      <Footer1 />
    </>
  );
}
```

Then edit each block's source to replace placeholder copy, images (`/svg/placeholder.svg`), and links,
wire up forms and buttons, and **run the harmonization pass below**. Installing the blocks is the
first half of the job; making them look like one page is the second.

For a composed page, set `style={{ "--rb-section-min-h": "0px" } as React.CSSProperties}`
on the page wrapper. Content blocks use `min-h-[var(--rb-section-min-h,100vh)]`, so this
lets stacked sections take their natural height. Keep hero and navigation height rules intact.

---

## Harmonizing blocks (never skip this)

**A block is a starting point, not a finished section.** Every block was authored
independently, so each one carries its own design decisions. Stack several
unchanged and you do not get a page, you get a stack of unrelated sections. Across
the 280 marketing blocks the library ships:

- **10 different section paddings** (`py-16` in 135 blocks, `py-12` in 105, `py-20` in 99, `py-24` in 90, and six more)
- **7 different display type sizes** (`text-3xl` through `text-9xl`; 108 blocks reach `text-6xl`, 47 reach `text-7xl`)
- **7 radius families** (`rounded-sm` through `rounded-3xl`, plus `rounded-full`)

Each block is internally consistent. The inconsistency only appears when you
combine them, which is exactly what the user is asking you to do. **Editing the
installed source to reconcile these is expected work, not a workaround**: the
files are the user's now, and they exist to be edited.

There are two distinct jobs. Identify which one you are doing before you start.

### Job A: dropping a block into an existing page

**The host codebase wins. Always.** The user has a design system already; a block
that keeps its own is a foreign object on their page, and that is the most common
way this goes wrong.

Before editing, read the host and write down its actual values:

| Read from the host             | Where to look                                                       |
| ------------------------------ | ------------------------------------------------------------------- |
| Type scale and heading weights | An existing page section or heading component                       |
| Colour tokens                  | `globals.css`, `tailwind.config`, or existing `bg-*`/`text-*` usage |
| Section padding rhythm         | The `<section>` wrappers already on the page                        |
| Container width and gutters    | The page's outer wrapper (`max-w-*`, `px-*`)  ||
| Border radius vocabulary       | Existing buttons and cards, or `--radius`                           |
| Button styles                  | The project's `Button` component or existing CTAs  ||
| Font families                  | `layout.tsx` or the font loader                                     |

Then rewrite the block to those values. In practice:

1. **Swap the colours first.** Replace the block's hardcoded `neutral-*` scale with
   the host's semantic tokens (`bg-background`, `text-foreground`,
   `text-muted-foreground`, `border-border`) if it uses them. This single step does
   most of the work of making a block look native.
2. **Match the container.** Blocks ship `max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8`.
   If the host page is `max-w-5xl`, change it, or the section will visibly bulge
   wider than everything around it.
3. **Match the section padding** to the neighbouring sections, not to the block's default.
4. **Demote the heading.** A block's `h2` is sized to lead a full-viewport section.
   Inside a denser existing page it usually needs to come down a step or two, and it
   must never out-size the page's existing `h1`.
5. **Reuse the host's button component** instead of the block's raw `<button>`, if one
   exists. Keep the block's layout, swap the control.
6. **Match the radius.** A `rounded-3xl` card dropped onto a page of `rounded-md` cards
   reads as pasted in.
7. **Match the motion budget.** If the host page is static, strip the block's entrance
   animation rather than introducing motion the rest of the page does not have.

If the host has no strong system, apply Job B's defaults and treat that as the system.

### Job B: stacking several blocks into a new page

Run this **after** all blocks are installed and the real content is in, and **before**
you show the user anything. Pick one value per row and enforce it across every block.

**Type.** One scale for the whole page:

| Role                         | Class                                                         |
| ---------------------------- | ------------------------------------------------------------- |
| Hero headline (exactly once) | `text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight` |
| Section heading (`h2`)       | `text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight` |
| Card or column title (`h3`)  | `text-lg sm:text-xl font-medium`                              |
| Lead paragraph               | `text-base sm:text-lg leading-relaxed`                        |
| Body copy                    | `text-sm sm:text-base leading-relaxed`                        |
| Eyebrow label                | `text-xs font-medium uppercase tracking-[0.08em]`             |

The hero headline is the largest type on the page; **nothing** below may match or
exceed it. This is the single most common defect when stacking blocks, because 108
blocks ship `text-6xl` and 47 ship `text-7xl` for their own section heading. Any
block whose heading lands at or above the hero must come down to the section-heading
class. Use one weight family: `font-medium` for display type, `font-semibold` only
for emphasis inside running copy.

**Spacing.** One rhythm: `py-16 sm:py-20 lg:py-24` on every section. Two exceptions
are allowed: the navigation (`py-4`), and a logo bar directly under the hero
(`py-10 sm:py-12`) so it reads as attached to the hero rather than as its own section.

**Container.** One width for every section: `max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8`.
A block that constrains to `max-w-6xl` will visibly pinch the page inward mid-scroll.
One inner measure for centred intro copy (`max-w-2xl`).

**Radius.** At most two families: one for cards and panels, one for controls. Keep
`rounded-full` only for avatars, logo chips and icon dots, never as a third card radius.

**Colour.** Exactly two section backgrounds, a base and a recessed tone, alternating
so that **two recessed sections never touch**. One card surface, one border pair, three
text tones (primary, secondary, tertiary). One accent colour, used on the primary CTA
and repeated at most once. Every colour class needs its `dark:` counterpart.

**Alignment.** Pick left-aligned or centred section headers and apply it to the whole
page. Mixed header alignment is the clearest tell of an assembled page. Follow the
hero: if the hero is a split layout with a left-aligned headline, keep a left axis all
the way down.

**Motion.** Only the navigation and the hero may animate on mount. Everything below
the fold reveals on scroll, otherwise the animation fires while the user is still
reading the hero and the section is already static by the time they reach it. Use one
reveal for the entire page:

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-80px" }}
  transition={{ duration: 0.5, ease: "easeOut" }}
>
```

Stagger with `delay: Math.min(index, 5) * 0.06` so any section finishes within ~500ms.
One motion idea per section: never combine parallax, stagger and a counter in one
place. At most **one** scroll-linked (`useScroll`) section on the page. Add
`useReducedMotion()` and collapse to an opacity-only fade when it returns true.

### Ordering and adjacency

- **Exactly one hero**, and it is first (after the navigation).
- **Never place two blocks that do the same job back to back**: two feature grids, or
  a testimonial block directly after a review block, read as a duplicate rather than
  as reinforcement.
- Alternate texture: a dense section (pricing table, comparison, FAQ) should be
  followed by a lighter one (CTA, logo bar, stats), not another dense one.
- Put proof (`social-proof`, `stats`) between a claim and the ask (`pricing`, `cta`).
- One primary call to action per page. Secondary CTAs must be visually secondary.

### Verifying the pass

Count these on the finished page. The expected number follows each:

| Check                                             | Expected             |
| ------------------------------------------------- | -------------------- |
| Distinct section-heading sizes                    | **1**                |
| Distinct section paddings                         | **2** (plus the nav) |
| Distinct outer container widths                   | **1**                |
| Radius families                                   | **at most 2**        |
| Text tones                                        | **3**                |
| Section backgrounds                               | **at most 2**        |
| Elements at or above the hero headline size       | **0**                |
| Mount-animated sections below the fold            | **0**                |
| Scroll-linked sections                            | **at most 1**        |
| Animated elements with no reduced-motion fallback | **0**                |
| Adjacent sections doing the same job              | **0**                |

If the user has Pro, `@reactbits-pro/recipe-*` items ship a pre-solved arrangement
plus a per-block harmonization spec for a whole page. Prefer a recipe over
improvising an order. See [Agent Kit](#agent-kit-pro-tier).

---

## Combining components with blocks

Standalone components can sit behind or alongside blocks (e.g. an animated background).
The same harmonization rule applies: the component must serve the block, not compete with it.

```tsx
import SilkWaves from "@/components/react-bits/silk-waves";
import { Hero1 } from "@/components/blocks/hero-1";

export default function LandingPage() {
  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10">
        <SilkWaves speed={0.5} opacity={0.3} />
      </div>
      <Hero1 />
    </div>
  );
}
```

When layering a component behind a block:

- **Keep the block readable.** Lower the component's `opacity`, or put a scrim
  (`bg-background/60`, or a gradient to the section background) between the two. Verify
  text still meets WCAG AA contrast in both light and dark mode.
- **One ambient effect per viewport.** A shader behind the hero and another behind the
  next section reads as noise and doubles the GPU cost.
- **Count it against the motion budget.** An animated background _is_ the section's one
  motion idea. Do not also add a scroll parallax and a stagger on top of it.
- **Match the palette.** Pass the component the page's existing colours rather than
  accepting its defaults, so it does not introduce a hue the page never uses elsewhere.
- **Bound it.** The wrapper needs `relative` and the component an explicitly sized,
  `absolute inset-0` parent, or a full-bleed canvas will escape the section.

---

## App UI blocks (Pro tier)

> **Requires Pro or Ultimate.** A Starter key returns `403`. App UI is not a separate
> product or purchase: it ships through the same `@reactbits-pro` registry as marketing
> blocks and is covered by the same Pro entitlement.

**300 blocks across 38 categories** for the signed-in half of an application: app shells,
sidebars, dashboards, data tables, analytics, command menus, settings forms, dialogs,
kanban boards, billing, onboarding, and a deep set of AI/agent surfaces.

Install exactly like a marketing block, with no suffix:

```bash
npx shadcn@latest add @reactbits-pro/dashboard-1
npx shadcn@latest add @reactbits-pro/app-sidebar-2 @reactbits-pro/data-table-3
```

They land in `components/blocks/<slug>.tsx`, the same directory as marketing blocks.

### The height contract: the one thing that goes wrong

Every App UI block's root is `h-full min-h-[Npx]`, for example:

```tsx
<div className="relative flex h-full min-h-[640px] w-full flex-col ...">
```

That `min-height` is what gives `flex-1 min-h-0 overflow-y-auto` children a definite
height. **Put an App UI block in a parent with no resolved height and its internal scroll
areas collapse.** Give it a real container:

```tsx
// Good: the block owns a bounded region
<div className="h-screen">
  <AppShell1 />
</div>

// Also good: a fixed panel height
<div className="h-[640px]">
  <AiChat1 />
</div>

// Bad: nothing bounds the height, scroll regions collapse
<main>
  <AiChat1 />
</main>
```

A full-page app screen is usually `h-screen` (or `h-dvh` on mobile) on the wrapper.

### Composing App UI blocks

App UI blocks follow one shared design system, so they compose without adjustment:
consistent spacing, five control heights, one dense `text-[13px]` body scale, explicit
pixel radii, and shared surface and border tokens. Do **not** add per-block spacing,
radius or typography overrides to make two of them line up. If they clash, you have
picked two blocks for the same job.

A typical screen is a shell plus content:

```tsx
"use client";

import AppShell from "@/components/blocks/app-shell-1";
import Dashboard from "@/components/blocks/dashboard-4";

export default function Page() {
  return (
    <div className="h-dvh">
      <AppShell />
    </div>
  );
}
```

Most `app-shell-*` blocks already include their own navigation and a content region, so
prefer editing the shell's content area over nesting a second shell inside it.

### Category map (38 categories, 300 blocks)

| Group                      | Categories                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AI & Agents** (49)       | `ai-chat` (9), `prompt-input` (7), `agent-activity` (7), `tool-calls` (6), `agent-approval` (6), `agent-plan` (6), `ai-usage` (8)                         |
| **Navigation** (41)        | `app-shell` (9), `app-sidebar` (7), `command-menu` (6), `navbar` (14), `mobile` (5)                                                                       |
| **Data** (89)              | `card` (11), `data-table` (8), `dashboard` (14), `analytics` (16), `list` (12), `filtering` (9), `file-manager` (4), `monitoring` (10), `empty-state` (5) |
| **Forms** (18)             | `settings-form` (6), `forms` (12)                                                                                                                         |
| **Overlays** (13)          | `app-dialog` (7), `notifications` (6)                                                                                                                     |
| **Auth & Onboarding** (28) | `onboarding` (7), `paywall` (7), `authentication` (14)                                                                                                    |
| **Workflows** (62)         | `kanban` (6), `wizard` (7), `comments` (6), `scheduling` (7), `integrations` (6), `editor` (5), `feedback` (6), `support` (5), `billing` (8), `chat` (6)  |

Slugs are sequential from `1` within each category: `analytics-1` … `analytics-16`.

Browse them at https://pro.reactbits.dev/docs/app-ui

---

## Customizing

Everything installs as editable source: customize freely.

**Components** accept rich props. Example (`SilkWaves`):

```tsx
<SilkWaves
  speed={1.5}
  scale={3}
  distortion={0.8}
  curve={1.2}
  contrast={1}
  colors={[
    "#1a0533",
    "#2d1b69",
    "#4a2c8a",
    "#6b3fa0",
    "#8b52b8",
    "#ab65d0",
    "#cb78e8",
    "#eb8bff",
  ]}
  rotation={45}
  brightness={1.2}
  opacity={0.9}
  complexity={1.5}
  frequency={1.2}
  className="absolute inset-0"
/>
```

For deeper changes, edit the installed `.tsx` directly: animation timing, breakpoints, new props, color
schemes, data/state wiring, API integration. **Blocks are designed to be edited**. They take no props,
so all customization happens in the file.

---

## Dark mode

Blocks and most components support dark mode via Tailwind's `dark:` class strategy. Ensure a theme
provider toggles a `dark` class on `<html>` (e.g. `next-themes`):

```tsx
// app/layout.tsx
import { ThemeProvider } from "next-themes";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

A few components read the active theme via `next-themes` and adapt their defaults automatically.

---

## Dependencies

The shadcn CLI installs each item's npm dependencies automatically. Know them for troubleshooting:

| Package                                   | Used by                                                   | Notes                                                                                            |
| ----------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `three`                                   | All shader / WebGL / 3D components                        | Import as `import * as THREE from "three"`. Needs a WebGL-capable browser and a sized container. |
| `@react-three/fiber`, `@react-three/drei` | Some 3D components                                        | React renderer + helpers for Three.js.                                                           |
| `motion`                                  | Most components and many blocks                           | Motion v11. **Import from `motion/react`**, not `framer-motion`.                                 |
| `gsap`, `@gsap/react`                     | `text-path`, `3d-text-reveal`, `click-stack`, some blocks | `ScrollTrigger` is registered inside the component.                                              |
| `lucide-react`                            | Most blocks                                               | Icon set.                                                                                        |
| `matter-js`                               | `404-5`                                                   | 2D physics.                                                                                      |
| `lenis`                                   | `about-5`                                                 | Smooth scrolling (loaded dynamically).                                                           |
| `next-themes`                             | Theme-aware components                                    | Dark-mode provider.                                                                              |

There is **no** `d3` or `framer-motion` dependency in the distributed items. Always use `motion/react`.

> Edge case: a few blocks load a package via a dynamic `import()` (e.g. `about-5` → `lenis`). The CLI may
> not auto-install these. If a block throws "module not found" at runtime, install the named package manually
> (e.g. `npm install lenis`).

### `"use client"` is required

Every component and block begins with `"use client"`. In the Next.js App Router you can import them
directly into Server Components: Next.js handles the client boundary. **Never remove `"use client"`.**

---

## Agent Kit (Pro tier)

> **Requires Pro or Ultimate**, with one deliberate exception: the `terminal-dark` design
> skill is **free** and installs with no license key at all. Everything else in the Agent
> Kit returns `403` on a Starter key.

The Agent Kit is **written material for you, the agent**, not React components. It contains
20 items: design-direction documents in three kinds, plus the setup skill:

| Kind             | Count | What it is                                                                                                     | Registry name                  | Installs to                      |
| ---------------- | ----- | -------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------- |
| **Design skill** | 8     | A complete landing-page design system: type scale, grid, colour, motion, anti-patterns, self-verification loop | `@reactbits-pro/skill-<slug>`  | `.claude/skills/<slug>/SKILL.md` |
| **Page prompt**  | 8     | A brief for one website type or vertical: what the page must prove, section order, copy strategy               | `@reactbits-pro/prompt-<slug>` | `prompts/<slug>/PROMPT.md`       |
| **Recipe**       | 3     | A tested block arrangement that assembles a whole page, plus a `plan.json` data model                          | `@reactbits-pro/recipe-<slug>` | `recipes/<slug>/RECIPE.md`       |
| **Setup skill**  | 1     | Instructions for installing, finding and composing React Bits Pro correctly                                    | `@reactbits-starter/skill`     | `./SKILL.md`                     |

```bash
npx shadcn@latest add @reactbits-pro/skill-terminal-dark      # free, no license needed
npx shadcn@latest add @reactbits-pro/skill-swiss-grid         # Pro+
npx shadcn@latest add @reactbits-pro/prompt-saas              # Pro+
npx shadcn@latest add @reactbits-pro/recipe-saas-homepage     # Pro+
```

### How to use it

Design skills install to `.claude/skills/` by default, so a compatible agent **autoloads**
them: each one ships spec-compliant frontmatter (`name`, `description`) and the description
carries the trigger vocabulary. Once installed, asking for "a Swiss-style landing page" is
enough.

**On a different agent runtime**, add `?agent=` to the registry URL in your
`components.json` so skills land where your agent scans:

```jsonc
"@reactbits-pro": {
  // claude (default) · codex · cursor · none
  "url": "https://pro.reactbits.dev/api/r/pro/{name}.json?agent=codex",
  "headers": { "Authorization": "Bearer ${REACTBITS_LICENSE_KEY}" }
}
```

| `?agent=`            | Skills install to                |
| -------------------- | -------------------------------- |
| `claude` _(default)_ | `.claude/skills/<slug>/SKILL.md` |
| `codex`              | `.agents/skills/<slug>/SKILL.md` |
| `cursor`             | `.cursor/skills/<slug>/SKILL.md` |
| `none`               | `skills/<slug>/SKILL.md`         |

For a runtime not listed, set the directory explicitly with
`?skillsDir=.some/path`. Prompts and recipes are unaffected. They are reference
material an agent opens on demand, not autoloaded, so they always install to
`prompts/` and `recipes/`.

The intended combination is **one design skill plus one page prompt**: the skill decides
how it looks, the prompt decides what it must say. A recipe then adds the section order.

```bash
# "A developer-tool landing page that looks like a terminal"
npx shadcn@latest add @reactbits-pro/skill-terminal-dark @reactbits-pro/prompt-developer-tool
```

### Available items

| Design skills (8)          | Page prompts (8)    | Recipes (3)       |
| -------------------------- | ------------------- | ----------------- |
| `apple-minimal`            | `agency`            | `saas-homepage`   |
| `corporate-trust`          | `consumer-hardware` | `agency-homepage` |
| `editorial`                | `developer-tool`    | `product-launch`  |
| `luxury-serif`             | `ecommerce-brand`   |                   |
| `neobrutalism`             | `fintech`           |                   |
| `playful-motion`           | `fitness`           |                   |
| `swiss-grid`               | `real-estate`       |                   |
| `terminal-dark` **(free)** | `saas`              |                   |

### Two different things both called "skill"

Do not confuse them:

|             | This document                             | Agent Kit design skill                        |
| ----------- | ----------------------------------------- | --------------------------------------------- |
| Name        | `@reactbits-starter/skill`                | `@reactbits-pro/skill-<slug>`                 |
| Purpose     | How to **install and use** React Bits Pro | How to **design** a landing page in one style |
| Tier        | Starter+                                  | **Pro+** (`terminal-dark` free)               |
| Installs to | `./SKILL.md`                              | `.claude/skills/<slug>/SKILL.md`              |

### Recipes do not require the block library

Recipes read best with the registries configured, but every section in a recipe's
`plan.json` carries a `fallback` describing its minimum viable structure in plain markup.
A recipe is still a usable structural brief without a single React Bits block installed.

Browse the kit at https://pro.reactbits.dev/docs/agent-kit

---

## Templates (Ultimate tier)

Templates are **full landing-page projects delivered as `.zip` downloads**. They are **not** installed
through the shadcn CLI. There is no `@reactbits-pro/<template>` install command.

To obtain an included template download:

1. Be **logged in** at https://pro.reactbits.dev with an **Ultimate** license (prefix `rbpu-`).
2. Download the `.zip` from the template's page (the free `portfolio-template` needs no login/Ultimate).
3. Unzip it and follow its own README to install and run.

Templates with a **Buy template** button can also be purchased individually through the checkout
linked on their page. An individual purchase is separate from Ultimate access; do not imply it
unlocks the full library or the Ultimate download API. Portfolio remains free.

| Template           | Slug                 | Tier     |
| ------------------ | -------------------- | -------- |
| SaaS Landing       | `saas-landing`       | Ultimate |
| AI SaaS Landing    | `ai-saas-landing`    | Ultimate |
| Minimal Landing    | `minimal-landing`    | Ultimate |
| Finance Landing    | `finance-landing`    | Ultimate |
| Agency Site        | `agency-site`        | Ultimate |
| Shader Template    | `shader-template`    | Ultimate |
| Wireframe Template | `wireframe-template` | Ultimate |
| 8 Bit Template     | `8-bit-template`     | Ultimate |
| AI App Template    | `ai-app-template`    | Ultimate |
| Security Template  | `security-template`  | Ultimate |
| Portfolio Template | `portfolio-template` | **Free** |
| Agentframe Template | `agentframe-template` | Ultimate |
| Cloudlight Template | `cloudlight-template` | Ultimate |
| Imageworks Template | `imageworks-template` | Ultimate |
| Sparkdesign Template | `sparkdesign-template` | Ultimate |

If a user on Starter/Pro asks to "install a template," explain that templates are website downloads:
Ultimate includes them, individual purchase is available where the page offers it, and Portfolio is free.
Offer to build an equivalent page from blocks when that better fits their existing access.

---

## Troubleshooting

The registry API returns clear JSON errors. Map them as follows:

| Symptom / error                            | Cause                                                     | Fix                                                                                                                                         |
| ------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Unknown registry @reactbits-starter`      | `registries` missing from `components.json`               | Add it per Step 3.                                                                                                                          |
| `401 Unauthorized: License key required`   | `REACTBITS_LICENSE_KEY` not set / not readable by the CLI | Add it to `.env.local`, or `export` it in the shell.                                                                                        |
| `401 Unauthorized: Invalid license key`    | Wrong, expired, or revoked key                            | Verify the key; check it is active in the Polar customer portal.                                                                            |
| `403 Forbidden: Insufficient tier`         | Tier too low for the item                                 | Blocks need **Pro+**; templates need **Ultimate**. Upgrade at /pricing.                                                                     |
| Component `404: must end with -css or -tw` | Missing variant suffix                                    | Use `silk-waves-tw` or `silk-waves-css`, never bare `silk-waves`.                                                                           |
| Block `404, does not exist`                | Wrong slug or an accidental suffix                        | Blocks take **no** suffix: `hero-1`, not `hero-1-tw`. Check the slug exists in the catalog.                                                 |
| Import error / "X is not exported"         | Wrong import style for a block                            | Re-check the file's `export` line; named exports need braces, default do not.  ||
| `cn` is not defined                        | Missing helper                                            | `npm install clsx tailwind-merge` and create `lib/utils.ts` (Step 1).                                                                       |
| WebGL component renders blank              | No size, or no WebGL                                      | Give the parent explicit width/height; ensure `three` installed; the browser must support WebGL.                                            |
| Block gradients/utilities look broken      | Project on Tailwind **v3**                                | Blocks use Tailwind **v4** utility names (e.g. `bg-linear-to-*`). Upgrade to v4, or rename classes (`bg-linear-to-r` → `bg-gradient-to-r`). |
| Blocks completely unstyled                 | Tailwind not scanning the files                           | Ensure Tailwind is configured and `globals.css` imports it (`@import "tailwindcss";` in v4).                                                |
| GSAP scroll effects don't fire  | Custom scroll container These expect the default document unless you rewire `ScrollTrigger`.|

Alternative auth (if env substitution is unavailable): the API also accepts an `X-License-Key: <key>`
header or a `?license_key=<key>` query parameter.

---

## Best practices

1. **Verify the export line before importing a block**. This is the #1 source of breakage.
2. **Pick one component variant project-wide**: use `-tw` for Tailwind projects (smaller, better integrated);
   reserve `-css` for non-Tailwind projects.
3. **Wrap WebGL components in a sized container**, and lazy-load heavy ones below the fold:
   ```tsx
   import dynamic from "next/dynamic";
   const SilkWaves = dynamic(
     () => import("@/components/react-bits/silk-waves"),
     { ssr: false },
   );
   ```
4. **Treat blocks as starting points**: edit copy, images, links, and styles directly in the source.
   Never hand back a page of unmodified blocks.
5. **Harmonize before you hand anything back**. One heading scale, one section rhythm, one
   container width, at most two radius families, and the hero headline as the largest type on
   the page. When adding to an existing codebase, adopt that codebase's tokens instead.
   See [Harmonizing blocks](#harmonizing-blocks-never-skip-this).
6. **Keep the license key in env vars**: never hardcode or commit it.
7. **Prefer Tailwind v4** so block utilities render correctly out of the box.
8. **Install this skill locally** for offline reference: `npx shadcn@latest add @reactbits-starter/skill`.

---

## Appendix A: Component catalog (`@reactbits-starter`, 150, Starter tier)

Install any of these as `@reactbits-starter/<slug>-tw` (Tailwind) or `<slug>-css` (vanilla CSS).
All are `export default`. Components described as shader/WebGL/3D/particle render to a canvas: give them a
sized parent and consider `ssr: false`.

### Text & typography (10)

| Slug              | Name            | Description                                                  |
| ----------------- | --------------- | ------------------------------------------------------------ |
| `staggered-text`  | Staggered Text  | Feature-rich staggered text reveals                          |
| `glitch-text`     | Glitch Text     | Canvas sticky glitch text reacting to the cursor             |
| `text-path`       | Text Path       | Text animated along an SVG path (GSAP)                       |
| `3d-text-reveal`  | 3D Text Reveal  | Scroll-triggered 3D text animation (GSAP)                    |
| `particle-text`   | Particle Text   | Interactive 3D WebGL particle text                           |
| `text-scatter`    | Text Scatter    | Interactive letter-scatter effect                            |
| `3d-letter-swap`  | 3D Letter Swap  | Staggered 3D letter swap                                     |
| `blur-highlight`  | Blur Highlight  | Blur-in paragraph with auto text highlighting                |
| `bending-marquee` | Bending Marquee | A marquee that bends along a curve as it scrolls             |
| `speeding-text`   | Speeding Text   | Text that stretches and smears as it races past the viewport |

### Cursor effects (8)

| Slug            | Name          | Description                                                 |
| --------------- | ------------- | ----------------------------------------------------------- |
| `smooth-cursor` | Smooth Cursor | Canvas smooth cursor trail with spring physics              |
| `custom-cursor` | Custom Cursor | Cursor with smooth target morphing                          |
| `dither-cursor` | Dither Cursor | Pixelated dithering trail                                   |
| `ascii-cursor`  | Ascii Cursor  | ASCII-character trail cursor                                |
| `glass-cursor`  | Glass Cursor  | Glass cursor with refraction and blur                       |
| `cursor-wave`   | Cursor Wave   | Grid of shapes reacting to cursor and clicks                |
| `user-cursor`   | User Cursor   | Cursor with a follower name tag                             |
| `pixel-magnet`  | Pixel Magnet  | A cursor trail that magnetises the pixels it passes through |

### Cards & interactive (12)

| Slug             | Name           | Description                                                    |
| ---------------- | -------------- | -------------------------------------------------------------- |
| `shader-card`    | Shader Card    | Card with animated WebGL shader background                     |
| `chroma-card`    | Chroma Card    | Card with chromatic color shifting                             |
| `credit-card`    | Credit Card    | 3D credit card with parallax tilt                              |
| `depth-card`     | Depth Card     | Perspective depth reacting to the mouse                        |
| `modal-cards`    | Modal Cards    | Cards expanding into full-screen modals                        |
| `rotating-cards` | Rotating Cards | Draggable 3D circular card carousel                            |
| `parallax-cards` | Parallax Cards | Layered cards with mouse-driven parallax                       |
| `click-stack`    | Click Stack    | Click-to-cycle animated card stack (GSAP)                      |
| `warped-card`    | Warped Card    | Image card with mouse-following bulge shader                   |
| `card-spread`    | Card Spread    | A fanned deck of cards that spreads open on hover              |
| `page-flip`      | Page Flip      | A book-style page flip you can drag through                    |
| `scroll-stack`   | Scroll Stack   | Pinned cards that stack, turn and dissolve as the page scrolls |

### Backgrounds, shaders & visual effects (82)

| Slug               | Name             | Description                                                        |
| ------------------ | ---------------- | ------------------------------------------------------------------ |
| `silk-waves`       | Silk Waves       | Smooth flowing silk-like waves                                     |
| `shader-waves`     | Shader Waves     | Animated wave patterns with noise                                  |
| `chroma-waves`     | Chroma Waves     | Wave shader with noise distortion                                  |
| `aurora-blur`      | Aurora Blur      | Ethereal aurora-borealis blur                                      |
| `gradient-blob`    | Gradient Blob    | Morphing 3D blob with cursor interaction                           |
| `ai-blob`          | AI Blob          | Animated 3D blob with glow                                         |
| `dither-wave`      | Dither Wave      | Wave with retro dithering                                          |
| `radial-liquid`    | Radial Liquid    | Radial shader waves with distortion                                |
| `grain-wave`       | Grain Wave       | Grainy wave texture                                                |
| `glass-flow`       | Glass Flow       | Flowing glass-like blur                                            |
| `falling-rays`     | Falling Rays     | Rays falling like rain of light                                    |
| `light-droplets`   | Light Droplets   | Falling light streaks with glow                                    |
| `lightspeed`       | Lightspeed       | Hyperspace light-streak effect                                     |
| `rising-lines`     | Rising Lines     | Ascending lines/particles with a laser beam                        |
| `liquid-bars`      | Liquid Bars      | Liquid bars with smooth wave motion                                |
| `liquid-lines`     | Liquid Lines     | Flowing liquid lines                                               |
| `shadow-bars`      | Shadow Bars      | Animated shadow bars with depth                                    |
| `color-loops`      | Color Loops      | Colorful orbital loops                                             |
| `mosaic`           | Mosaic           | Mosaic over an animated wave or video                              |
| `vortex`           | Vortex           | Spinning 3D tunnel with particles                                  |
| `portal`           | Portal           | Circular portal shader with particles                              |
| `perspective-grid` | Perspective Grid | Infinite 3D perspective grid (WebGL)                               |
| `glitter-warp`     | Glitter Warp     | Starfield warp tunnel                                              |
| `star-burst`       | Star Burst       | Star-burst particle explosion                                      |
| `rotating-stars`   | Rotating Stars   | Orbiting star particles                                            |
| `dot-shift`        | Dot Shift        | Shifting grid of animated dots                                     |
| `synaptic-shift`   | Synaptic Shift   | Neural-network connection animation                                |
| `ascii-waves`      | Ascii Waves      | Waves rendered as ASCII characters                                 |
| `squircle-shift`   | Squircle Shift   | Morphing squircle animation                                        |
| `center-flow`      | Center Flow      | Radial flow from the center                                        |
| `warp-twister`     | Warp Twister     | Twisting warp distortion                                           |
| `neon-reveal`      | Neon Reveal      | Neon bar sweep                                                     |
| `agentic-ball`     | Agentic Ball     | 3D orb with swirl and glow                                         |
| `black-hole`       | Black Hole       | Gravitational particles with color cycling                         |
| `blurred-rays`     | Blurred Rays     | Flickering vertical light beams with bloom                         |
| `flame-paths`      | Flame Paths      | Flame-like wave effect                                             |
| `frame-border`     | Frame Border     | Animated noise-textured border                                     |
| `gradient-bars`    | Gradient Bars    | Animated striped gradient bars                                     |
| `halftone-vortex`  | Halftone Vortex  | Cursor-reactive halftone dot vortex                                |
| `halftone-wave`    | Halftone Wave    | Halftone dot grid with noise                                       |
| `liquid-ascii`     | Liquid Ascii     | Fluid simulation as ASCII characters                               |
| `metallic-swirl`   | Metallic Swirl   | Metallic swirl shader                                              |
| `retro-lines`      | Retro Lines      | Retro perspective grid with scrolling waves                        |
| `rubber-fluid`     | Rubber Fluid     | Rubbery fluid distortion shader                                    |
| `simple-swirl`     | Simple Swirl     | Concentric swirl with glow                                         |
| `square-matrix`    | Square Matrix    | Animated dot grid with wave presets                                |
| `star-swipe`       | Star Swipe       | Conformal star-warp shader                                         |
| `swirl-blend`      | Swirl Blend      | Iterative swirl shader with palette controls                       |
| `text-cube`        | Text Cube        | Cursor-following 3D text cube                                      |
| `watercolor`       | Watercolor       | Watercolor noise shader, two-color blend                           |
| `fog-sphere`       | Fog Sphere       | Soft swirling sphere of fog                                        |
| `ascii-tiles`      | ASCII Tiles      | Glassy tiles of glowing ASCII characters                           |
| `twilight-lines`   | Twilight Lines   | Glowing lines pulsing with a warm sweep                            |
| `chroma-blinds`    | Chroma Blinds    | Diagonal stripes bending toward the cursor                         |
| `glass-tiles`      | Glass Tiles      | Shimmering colorful glass tiles                                    |
| `blinking-squares` | Blinking Squares | Grid of quietly twinkling squares                                  |
| `aura-blob`        | Aura Blob        | A soft glowing blob surrounded by a slowly shifting aura           |
| `aurora-beam`      | Aurora Beam      | A sweeping aurora beam built from layered sheets of light          |
| `blinking-dots`    | Blinking Dots    | A crisp field of dots blinking in and out on a fixed grid          |
| `glowing-wave`     | Glowing Wave     | A single luminous wave sweeping slowly across the screen           |
| `glue-dots`        | Glue Dots        | Metaball dots that stick together and stretch apart as they meet   |
| `grid-rise`        | Grid Rise        | A raymarched tile field that lifts and ripples under the cursor    |
| `landscape`        | Landscape        | A procedurally generated landscape scrolling toward the horizon    |
| `minimal-ripple`   | Minimal Ripple   | Quiet concentric ripples spreading outward from a still point      |
| `mosaic-waves`     | Mosaic Waves     | Waves rolling through a mosaic of shifting tiles                   |
| `neural-float`     | Neural Float     | Soft neural filaments drifting weightlessly across the canvas      |
| `neural-tunnel`    | Neural Tunnel    | An endless tunnel of pulsing neural strands                        |
| `pixel-rain`       | Pixel Rain       | Pixelated streaks falling in a quiet digital rain                  |
| `rising-particles` | Rising Particles | Particles glowing softly as they rise and drift upward             |
| `rolling-blinds`   | Rolling Blinds   | Bands of light that roll open and closed like window blinds        |
| `specter-orb`      | Specter Orb      | A ghostly raymarched orb wrapped in drifting smoke                 |
| `spectral-clouds`  | Spectral Clouds  | Volumetric clouds tinted with drifting spectral light              |
| `squares-terminal` | Squares Terminal | A terminal-style grid of squares that flicker on and off           |
| `tech-wall`        | Tech Wall        | A wall of technical panels lighting up in sequence                 |
| `thinking-dots`    | Thinking Dots    | A dot matrix breathing around a drifting cloud of density          |
| `wireframe-ball`   | Wireframe Ball   | A rotating wireframe polyhedron raymarched in a shader             |
| `eclipse`          | Eclipse          | Turbulent spectral corona burning around a dark eclipse            |
| `neural-flash`     | Neural Flash     | Storm of glowing filaments folding through a feedback field        |
| `ravine`           | Ravine           | Ray-marched flight down an endless monochrome canyon               |
| `long-exposure`    | Long Exposure    | Light trails streaming along a bending road, long-exposure style   |
| `glowing-ridges`   | Glowing Ridges   | Iridescent ridges of colour rolling across a dark surface          |
| `ascii-ripple`     | ASCII Ripple     | Monospace text as a liquid surface; pointer sends waves through it |

### Galleries, carousels & layout (21)

| Slug                  | Name                | Description                                                       |
| --------------------- | ------------------- | ----------------------------------------------------------------- |
| `circle-gallery`      | Circle Gallery      | Draggable circular carousel with inertia                          |
| `gradient-carousel`   | Gradient Carousel   | 3D carousel with dynamic gradient extraction                      |
| `circles`             | Circles             | Rotating orbital rings with images                                |
| `draggable-grid`      | Draggable Grid      | Pannable grid with drag and momentum                              |
| `animated-list`       | Animated List       | List with multiple entrance animations                            |
| `comparison-slider`   | Comparison Slider   | Before/after image comparison                                     |
| `hover-preview`       | Hover Preview       | Image previews on hovering target words                           |
| `infinite-gallery`    | Infinite Gallery    | 3D infinite scrolling gallery with parallax                       |
| `parallax-carousel`   | Parallax Carousel   | Draggable image carousel with parallax                            |
| `circle-stack`        | Circle Stack        | Tilted cycling stack of circular images                           |
| `lenticular-carousel` | Lenticular Carousel | A gallery whose cards turn over like a lenticular print           |
| `reel-gallery`        | Reel Gallery        | Tilted reels of images that glide as you scroll                   |
| `skewed-carousel`     | Skewed Carousel     | A skewed marquee of cards that tilts and scales as it scrolls     |
| `tilted-tiles`        | Tilted Tiles        | A tilted grid of image columns that drift as you scroll           |
| `tumble-carousel`     | Tumble Carousel     | Cards that tumble end over end as the carousel advances           |
| `scroll-portal`       | Scroll Portal       | Scroll flies the camera through nested frames revealing scenes    |
| `inverted-dome`       | Inverted Dome       | Endless draggable image grid bent across a lens                   |
| `bend-gallery`        | Bend Gallery        | Column of images that folds over as it scrolls                    |
| `twisting-gallery`    | Twisting Gallery    | Images spinning through a lazy twist as they scroll past          |
| `dolly-gallery`       | Dolly Gallery       | Images stacked in depth that the camera dollies through on scroll |
| `tile-reveal`         | Tile Reveal         | Sticky grid whose tiles fly in on scroll, then reveal a headline  |

### Images & reveals (12)

| Slug              | Name            | Description                                                           |
| ----------------- | --------------- | --------------------------------------------------------------------- |
| `shader-reveal`   | Shader Reveal   | Interactive liquid image reveal                                       |
| `liquid-swap`     | Liquid Swap     | Image transition via a liquid glass ball                              |
| `pixelate-hover`  | Pixelate Hover  | Cursor-controlled pixelation reveal                                   |
| `pixel-reveal`    | Pixel Reveal    | Image revealed through a pixel sweep                                  |
| `magic-transform` | Magic Transform | Documents fly in and resolve into results                             |
| `frame-scrub`     | Frame Scrub     | Scroll drives a frame sequence through a canvas playhead              |
| `particle-image`  | Particle Image  | An image dissolved into GPU particles that swirl apart and reassemble |
| `scroll-mask`     | Scroll Mask     | Scroll opens a mask that reveals an image six ways                    |
| `particle-morph`  | Particle Morph  | GPU particles flowing between images, logos and silhouettes           |
| `pixel-sculpt`    | Pixel Sculpt    | Image rebuilt as a relief of tiles that ripple under the pointer      |
| `glass-reveal`    | Glass Reveal    | Pointer-following glass lens refracting one image through another     |
| `depth-image`     | Depth Image     | Relights a flat photo with a pointer-driven light and estimated depth |

### Other / utility (5)

| Slug             | Name           | Description                                   |
| ---------------- | -------------- | --------------------------------------------- |
| `globe`          | Globe          | Interactive 3D globe with animated arcs       |
| `device`         | Device         | CSS device mockup with custom content         |
| `simple-graph`   | Simple Graph   | Animated, customizable line graph             |
| `preloader`      | Preloader      | Animated loading screens, multiple variants   |
| `parallax-pills` | Parallax Pills | Bouncy labeled pills drifting with the cursor |

---

## Appendix B: Marketing block catalog (`@reactbits-pro`, 280, **Pro tier**)

Install as `@reactbits-pro/<slug>` (no suffix). Slugs are sequential within each category starting at 1.
See [Marketing block import reference](#marketing-block-import-reference-verified) for the per-slug export style.

| Category       | Slug range                           | Count | What it covers                                                                                |
| -------------- | ------------------------------------ | ----- | --------------------------------------------------------------------------------------------- |
| Hero           | `hero-1` … `hero-24`                 | 24    | Headers/heroes: split, centered, video, carousel, WebGL, animated                             |
| Features       | `features-1` … `features-13`         | 13    | Feature grids, tabs, marquees, auto-cycling carousels                                         |
| Social Proof   | `social-proof-1` … `social-proof-16` | 16    | Logos, testimonials, reviews, marquees, video                                                 |
| Contact        | `contact-1` … `contact-12`           | 12    | Contact forms and split/card layouts                                                          |
| Footer         | `footer-1` … `footer-12`             | 12    | Footers with links, newsletter, branding                                                      |
| Comparison     | `comparison-1` … `comparison-8`      | 8     | Feature/pricing comparison tables and charts                                                  |
| Navigation     | `navigation-1` … `navigation-15`     | 15    | Top/side/bottom navs and mobile menus                                                         |
| Auth           | `auth-1` … `auth-6`                  | 6     | Sign-in / sign-up layouts                                                                     |
| Call To Action | `cta-1` … `cta-14`                   | 14    | CTAs with parallax, cursor trails, video masks                                                |
| FAQ            | `faq-1` … `faq-9`                    | 9     | Accordion, chat-style, tabbed FAQs                                                            |
| Pricing        | `pricing-1` … `pricing-15`           | 15    | Pricing tables with toggles and comparisons                                                   |
| Stats          | `stats-1` … `stats-15`               | 15    | Metrics with charts, maps, animations                                                         |
| 404            | `404-1` … `404-8`                    | 8     | Creative error pages                                                                          |
| Profile        | `profile-1` … `profile-6`            | 6     | User profile cards and sections                                                               |
| About          | `about-1` … `about-12`               | 12    | Story, timeline, team, metrics                                                                |
| Waitlist       | `waitlist-1` … `waitlist-6`          | 6     | Pre-launch signup sections                                                                    |
| Showcase       | `showcase-1` … `showcase-8`          | 8     | Portfolio and product display                                                                 |
| How It Works   | `how-it-works-1` … `how-it-works-9`  | 9     | Step-by-step process sections                                                                 |
| Download       | `download-1` … `download-8`          | 8     | App/file download sections                                                                    |
| Blog           | `blog-1` … `blog-11`                 | 11    | Blog listings and article layouts                                                             |
| Ecommerce      | `ecommerce-1` … `ecommerce-11`       | 11    | Product pages, catalogs, storefronts                                                          |
| Bento          | `bento-1` … `bento-42`               | 42    | Animated feature tiles for bento grids: mock UIs, illustrations, marquees, carousels, AI chat |

**Bento tiles are grid cells, not sections.** A `bento-N` fills whatever cell it is given (`h-full`,
no viewport height, no page gutter). Place tiles inside a grid you own and put the column/row
spans on wrapper `div`s, never on the tile:

```tsx
<section className="w-full px-4 py-16 sm:px-6 lg:px-8">
  <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[minmax(380px,auto)]">
    <div className="sm:col-span-2">
      <Bento2 />
    </div>
    <div className="lg:row-span-2">
      <Bento8 />
    </div>
    <Bento5 />
  </div>
</section>
```

The [Bento Builder](https://pro.reactbits.dev/docs/blocks/tools/bento-builder) provides 2, 3 or 4
desktop columns and six spans: 1x1, 2x1, 3x1, 1x2, 2x2 and 3x2. Wide spans clamp to the chosen
column count. Layouts adapt to one column on mobile and two on tablet.

- Drag tiles onto the canvas, resize from the edges, reposition them, and tidy gaps.
- Set an optional section heading and preview the responsive layout.
- Export the generated grid component and install command, or copy the agent prompt.
- Keep the generated responsive spans, row heights and placements when integrating the result.
  Install only the referenced tiles; `bento-grid` is generated code, not an installable registry slug.
- The [Landing Builder](https://pro.reactbits.dev/builder) also supports Bento grids as page sections,
  including editing, full-page preview and project export alongside ordinary marketing blocks.

Bento's mock interfaces are illustrations inside marketing tiles, not App UI blocks. Do wrapp
the grid in `.rb-theme-scope` or apply the App UI theme tokens. Global light/dark mode still applies.

---

## Appendix C: App UI block catalog (`@reactbits-pro`, 300, **Pro tier**)

Application-interface blocks for the signed-in product: shells, navigation, data,
forms, overlays, auth, and AI/agent surfaces. Install as `@reactbits-pro/<slug>`
(no suffix), exactly like a marketing block.

**All 300 are `export default`**: the one block family where you do not need to read the
export line first. Every root is `h-full min-h-[Npx]`, so give each one a
height-bounded parent. See [App UI blocks](#app-ui-blocks-pro-tier).

Slugs are sequential from `1` within each category.

### AI & Agents (49)

| Slug range                              | Count | What it covers                                                      |
| --------------------------------------- | ----- | ------------------------------------------------------------------- |
| `agent-activity-1` … `agent-activity-7` | 7     | Live agent run logs, step timelines and status streams              |
| `agent-approval-1` … `agent-approval-6` | 6     | Human-in-the-loop approval gates for agent actions                  |
| `agent-plan-1` … `agent-plan-6`         | 6     | Multi-step agent plans with progress and revision                   |
| `ai-chat-1` … `ai-chat-9`               | 9     | Conversation surfaces with streaming, citations and message actions |
| `ai-usage-1` … `ai-usage-8`             | 8     | Token, cost and quota reporting                                     |
| `prompt-input-1` … `prompt-input-7`     | 7     | Composer inputs with attachments, model pickers and slash commands  |
| `tool-calls-1` … `tool-calls-6`         | 6     | Tool invocation cards with arguments, results and errors            |

### Navigation (41)

| Slug range                          | Count | What it covers                                              |
| ----------------------------------- | ----- | ----------------------------------------------------------- |
| `app-shell-1` … `app-shell-9`       | 9     | Full application frames: sidebar, topbar and content region |
| `app-sidebar-1` … `app-sidebar-7`   | 7     | Standalone sidebars with nav trees, workspaces and collapse |
| `command-menu-1` … `command-menu-6` | 6     | Command palettes and keyboard-driven launchers              |
| `mobile-1` … `mobile-5`             | 5     | Mobile app chrome: tab bars, sheets and headers             |
| `navbar-1` … `navbar-14`            | 14    | Application top bars with search, actions and account menus |

### Data (89)

| Slug range                          | Count | What it covers                                  |
| ----------------------------------- | ----- | ----------------------------------------------- |
| `analytics-1` … `analytics-16`      | 16    | Charts, funnels, cohorts and reporting surfaces |
| `card-1` … `card-11`                | 11    | Metric, entity and summary cards                |
| `dashboard-1` … `dashboard-14`      | 14    | Composed dashboard screens                      |
| `data-table-1` … `data-table-8`     | 8     | Sortable, selectable and paginated tables       |
| `empty-state-1` … `empty-state-5`   | 5     | First-run, no-results and error placeholders    |
| `file-manager-1` … `file-manager-4` | 4     | File browsers, uploads and asset grids          |
| `filtering-1` … `filtering-9`       | 9     | Filter bars, facet panels and saved views       |
| `list-1` … `list-12`                | 12    | Dense record lists, inboxes and feeds           |
| `monitoring-1` … `monitoring-10`    | 10    | Status boards, incidents, logs and health       |

### Forms (18)

| Slug range                            | Count | What it covers                                    |
| ------------------------------------- | ----- | ------------------------------------------------- |
| `forms-1` … `forms-12`                | 12    | General multi-field forms with validation layouts |
| `settings-form-1` … `settings-form-6` | 6     | Account, workspace and preference forms           |

### Overlays (13)

| Slug range                            | Count | What it covers                            |
| ------------------------------------- | ----- | ----------------------------------------- |
| `app-dialog-1` … `app-dialog-7`       | 7     | Modals, confirmations, sheets and drawers |
| `notifications-1` … `notifications-6` | 6     | Toasts, notification centres and inboxes  |

### Auth & Onboarding (28)

| Slug range                               | Count | What it covers                              |
| ---------------------------------------- | ----- | ------------------------------------------- |
| `authentication-1` … `authentication-14` | 14    | Sign in, sign up, MFA and recovery screens  |
| `onboarding-1` … `onboarding-7`          | 7     | Welcome flows, checklists and product tours |
| `paywall-1` … `paywall-7`                | 7     | Upgrade prompts, plan gates and trial walls |

### Workflows (62)

| Slug range                          | Count | What it covers                                       |
| ----------------------------------- | ----- | ---------------------------------------------------- |
| `billing-1` … `billing-8`           | 8     | Plans, invoices, payment methods and usage           |
| `chat-1` … `chat-6`                 | 6     | Team and support messaging (non-AI)                  |
| `comments-1` … `comments-6`         | 6     | Threads, mentions and activity discussion            |
| `editor-1` … `editor-5`             | 5     | Rich text and document editing surfaces              |
| `feedback-1` … `feedback-6`         | 6     | Surveys, ratings, NPS and feature requests           |
| `integrations-1` … `integrations-6` | 6     | Connection directories, API keys and webhooks        |
| `kanban-1` … `kanban-6`             | 6     | Board views with columns, cards and drag affordances |
| `scheduling-1` … `scheduling-7`     | 7     | Calendars, availability and booking                  |
| `support-1` … `support-5`           | 5     | Help centres, ticketing and contact surfaces         |
| `wizard-1` … `wizard-7`             | 7     | Multi-step flows with progress and validation        |

Browse them at https://pro.reactbits.dev/docs/app-ui

---

## Quick reference

- **Install component** _(Starter+)_: `npx shadcn@latest add @reactbits-starter/<slug>-tw` (or `-css`)
- **Install marketing block** _(Pro+)_: `npx shadcn@latest add @reactbits-pro/<slug>`
- **Install App UI block** _(Pro+)_: `npx shadcn@latest add @reactbits-pro/<slug>`
- **Install Agent Kit item** _(Pro+)_: `npx shadcn@latest add @reactbits-pro/{skill,prompt,recipe}-<slug>`
- **Install this skill** _(Starter+)_: `npx shadcn@latest add @reactbits-starter/skill`
- **Component import:** `import AnyName from "@/components/react-bits/<slug>"` (always default)
- **App UI block import:** `import AnyName from "@/components/blocks/<slug>"` (always default)
- **Marketing block import:** open the file → `export default` ⇒ default import · `export function X` ⇒ `import { X }`
- **Reveal a marketing block's export:** `grep -E "^export (default )?function " components/blocks/<slug>.tsx`
- **App UI needs a bounded height:** wrap in `h-dvh`, `h-screen` or a fixed `h-[Npx]`
- **Tiers:** Starter = 150 components + setup skill · **Pro = + 280 marketing blocks, + 300 App UI blocks, + the complete 20-item Agent Kit** · Ultimate = + 15 template downloads
- **Free without any license:** `@reactbits-pro/skill-terminal-dark`
- **Live catalogs:** https://pro.reactbits.dev/docs/components · /docs/blocks · /docs/app-ui · /docs/agent-kit · /docs/templates
