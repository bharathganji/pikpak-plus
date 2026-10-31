# PikPak Plus (`pikpak-plus-client`) — Zero-Regression UI/UX Refactoring Playbook for AI Coding Agents

> **Purpose of This Document:** Give this specification file directly to your AI coding agent (Antigravity, Cursor, Windsurf, or Claude Code) before asking for any UI/UX improvements on **[PikPak Plus](https://pikpak-plus.com/)** ([`bharathganji/pikpak-plus`](https://github.com/bharathganji/pikpak-plus)). It forces the agent to analyze your existing Next.js 16 + React 19 + Tailwind CSS 4 codebase first and restricts all modifications strictly to visual presentation (`className` tokens, spacing, surfaces, and visual hierarchy) with **zero changes to existing functionality, hooks, API payloads, or state logic**.

---

## 1. Agent System Directive & Hard Guardrails (The Zero-Regression Contract)

When acting on this repository (`pikpak-plus-client`), you are operating in **Strict Presentational Refactor Mode**. You must treat all business logic, state management, API communication, and component contracts as **immutable**.

### Hard Rules (Mandatory Compliance)

| Rule Category              | Strictly Forbidden (NEVER Do This)                                                                                                                                        | Allowed & Expected (ONLY Do This)                                                                                                                  |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scope & Features**       | Do NOT invent new features, mock data, fake buttons, new tabs, or extra modals that do not already exist in the component.                                                | Improve the visual styling, layout alignment, spacing, typography, and contrast of existing UI elements only.                                      |
| **Backend & API**          | Do NOT touch `pikpak-plus-server/`, Flask routes, Celery workers, Redis logic, Supabase schemas, or Next.js API proxy routes.                                             | Leave all backend files, `docker-compose.yml`, and API endpoints 100% untouched.                                                                   |
| **React State & Hooks**    | Do NOT add, remove, reorder, or rename `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`, or custom hooks.                                                      | Keep every hook declaration and dependency array byte-for-byte identical to the original file.                                                     |
| **Event Handlers & Props** | Do NOT alter `onClick`, `onSubmit`, `onChange`, or prop interfaces. Do NOT rename callback functions or change their arguments.                                           | Preserve every `onClick={...}`, `onSubmit={...}`, `disabled={...}`, and `value={...}` binding verbatim on its corresponding JSX element.           |
| **Conditional Rendering**  | Do NOT delete, simplify, or invert conditional rendering branches (`{error && ...}`, `{isLoading ? ... : ...}`).                                                          | Style the containers inside each conditional branch (loading skeletons, empty states, error alerts, success badges) so every state looks polished. |
| **Dependencies**           | Do NOT run `npm install` or add external UI libraries. Work exclusively with the existing stack (Next.js 16, React 19, Tailwind CSS 4, Radix UI, Lucide React, Recharts). | Use existing `lucide-react` icons, Radix UI primitives, and Tailwind CSS v4 utility classes already configured in `pikpak-plus-client`.            |
| **Execution Granularity**  | Do NOT rewrite multiple components in a single turn or replace entire files with truncated `// ... existing code` placeholders.                                           | Refactor **one file at a time**, completing a pre-edit audit and a post-edit TypeScript/build check before moving to the next file.                |

---

## 2. Phase 1: Mandatory Pre-Edit Analysis Protocol

Before modifying a single line of code in any `.tsx` file inside `pikpak-plus-client`, the agent **MUST** perform a read-only analysis of the target file and output a structured **Component Audit Block** in chat:

1. **Read the Target File Completely:** Inspect all imports, TypeScript interfaces, props, hooks, helper functions, and JSX return trees.
2. **Output the Pre-Edit Inventory:** List the following 4 items before proposing any edit:
   - **State & Hooks Inventory:** Every `useState`, `useEffect`, `useContext`, or custom hook in the file.
   - **API & Data Bindings:** Every `fetch` call, Supabase call, or prop callback (`onAction`, `onRefresh`, etc.).
   - **Conditional UI States:** Every branch rendered conditionally (e.g., loading spinner, empty state, >25 GB magnet size error alert, WhatsLink preview card, global share deduplication badge, Celery countdown timer).
   - **Interactive Elements Count:** Exact count of `<form>`, `<input>`, `<button>`, `<select>`, and Radix UI triggers/dialogs.
3. **Verify Parity Post-Edit:** After applying Tailwind CSS / JSX layout upgrades, verify that the count and bindings of all 4 categories above remain 100% identical.

---

## 3. Core Functionality Preservation Matrix (`bharathganji/pikpak-plus`)

Every view in `pikpak-plus-client` contains domain-specific workflows that AI agents frequently break when regenerating JSX. Use this matrix to ensure zero regressions:

| Module / Route                                 | Core Functionality & Edge Cases That MUST Be Retained Verbatim                                                                                                                                                                                                                                                                                                        | Allowed UI/UX Improvements                                                                                                                                                                                                                                                                                                        |
| :--------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Global Header & Layout**                     | • Brand logo & navigation links<br>• **Statistics Dashboard** trigger button (bar-chart icon)<br>• **Celery Scheduler Countdown Timers** (next task status sync, 24h auto-cleanup, WebDAV rotation)<br>• Links to `/faq`, Telegram, `/admin` (when admin), and Dark/Light theme toggle                                                                                | • Upgrade header to a sticky glassmorphic bar (`backdrop-blur-xl bg-background/80 border-b`)<br>• Style scheduler countdowns as compact monospace status pills with subtle pulse indicators<br>• Refine spacing and mobile responsiveness                                                                                         |
| **Download Tab (Magnet & Task Queue)**         | • Magnet link `<input>` and form submission handler<br>• **WhatsLink API Link Analysis** preview states (`analyze_link`)<br>• **Issue #177 Detailed Size-Limit Error Display** when a magnet exceeds `MAX_FILE_SIZE_GB` (25 GB default)<br>• Real-time task queue polling, progress bars, file size, status badges, "My Tasks" filter, and 24h auto-cleanup countdown | • Elevate the magnet input bar into a prominent command card with clear focus rings<br>• Style the `#177` size-limit error banner with high-contrast rose/amber alert surfaces (`border-destructive/40 bg-destructive/10`)<br>• Upgrade task items into scannable cards with smooth gradient progress bars and clean status pills |
| **Create & Share Tab (`share-section.tsx`)**   | • Cloud directory/file traversal and folder breadcrumb state<br>• File selection and one-click share link creation<br>• **Global Share Deduplication Logic** (one link per file reused across all users, 24h expiration, Issues #170 / #178 / #182)<br>• Copy-to-clipboard handlers and loading states per file item                                                  | • Transform the file list into a clean cloud drive explorer with distinct folder vs. media/archive icon badges<br>• Style active deduplicated links with emerald status badges and clear copy-button feedback<br>• Improve mobile row wrapping so file names and action buttons never collide                                     |
| **WebDAV Tab**                                 | • Display of auto-generated 24-hour rotating WebDAV client credentials (server URL, username, password, status/countdown)<br>• Copy-to-clipboard buttons for each credential field<br>• Platform connection instructions (Windows, macOS, Linux `davfs2`, Mobile clients)                                                                                             | • Present each WebDAV client node as a structured credential card with monospace copy fields<br>• Organize the Windows, macOS, Linux, and Mobile setup instructions into clean, scannable cards or tabs                                                                                                                           |
| **Quota Tab**                                  | • Real-time personal/shared storage utilization, cloud download transfer quota, downstream playback traffic, and VIP status/expiration                                                                                                                                                                                                                                | • Upgrade raw numbers into visual telemetry cards with clear progress bars, percentage indicators, and semantic color coding (indigo for storage, emerald for transfer, violet for downstream traffic)                                                                                                                            |
| **Statistics Dashboard (Header Modal / View)** | • 30-day historical metrics collected every 24h: **Tasks Added**, **Storage Utilization**, **Cloud Download Usage**, and **Downstream Traffic** rendered via `Recharts`                                                                                                                                                                                               | • Wrap each `Recharts` `<ResponsiveContainer>` in a fixed-height card container (`h-64` or `h-72`) with styled dark/light tooltips, subtle grid lines, and consistent color tokens                                                                                                                                                |
| **Auth (`/`, `/register`) & FAQ (`/faq`)**     | • Supabase email/password sign-in, registration, password reset, error alerts, and FAQ accordion/list items                                                                                                                                                                                                                                                           | • Center auth forms in a refined card with subtle gradient branding, accessible input labels, and clear validation feedback                                                                                                                                                                                                       |
| **Admin Console (`/admin`)**                   | • User management CRUD & block/unblock (#159)<br>• Content moderation (tasks & shares deletion)<br>• System Settings tab validated with Marshmallow/Redis (#181)<br>• Manual Celery cleanup trigger (`celery_app.send_task`, #195)                                                                                                                                    | • Refine data table density, action button hierarchy (destructive vs. primary actions), and settings form spacing without altering any admin API calls                                                                                                                                                                            |

---

## 4. Visual Design System & Tailwind CSS v4 Token Mapping

To achieve a cohesive, modern cloud workspace aesthetic across both Dark and Light modes without touching business logic, apply these standardized Tailwind CSS class patterns to existing JSX wrappers:

### 4.1 Surface & Container Hierarchy

| UI Element                                  | Legacy / Generic Pattern                 | Upgraded UI Token Pattern (Tailwind CSS)                                                                                                                           |
| :------------------------------------------ | :--------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Page Background**                         | `bg-background` or plain flat gray/black | `min-h-screen bg-slate-50 dark:bg-[#090B10] text-slate-900 dark:text-slate-100 antialiased selection:bg-indigo-500/30`                                             |
| **Sticky App Header**                       | Standard solid header bar                | `sticky top-0 z-30 backdrop-blur-xl bg-white/85 dark:bg-[#090B10]/85 border-b border-slate-200/80 dark:border-slate-800/80`                                        |
| **Primary Section Card**                    | `border rounded p-4`                     | `rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#11151F]/90 p-5 sm:p-6 shadow-sm dark:shadow-xl dark:shadow-black/20`           |
| **Interactive List Row (Task / File Item)** | Basic row or unstyled flex container     | `group rounded-xl border border-slate-200/80 dark:border-slate-800/90 bg-slate-50/70 dark:bg-[#0B0E17] p-4 hover:border-indigo-500/40 transition-all duration-150` |
| **Monospace Credential / Hash Box**         | Plain text or basic `<input>`            | `font-mono text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200`        |

### 4.2 Controls, Inputs & Status Pills

| Control Type                           | Upgraded UI Token Pattern (Tailwind CSS)                                                                                                                                                                                                                                                |
| :------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Segmented Tab Bar (`TabsList`)**     | `inline-flex flex-wrap gap-1 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#11151F]/90`                                                                                                                                                          |
| **Active Tab Trigger (`TabsTrigger`)** | `data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/20 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all` |
| **Primary Action Button**              | `inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50`           |
| **Magnet / Search Text Input**         | `w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-[#090B10] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`                                                                                                    |
| **Active / Deduplicated Share Pill**   | `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30`                                                                                                           |
| **Countdown / Warning Pill**           | `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30`                                                                                                         |
| **Error / Size-Limit Alert (#177)**    | `rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-200 flex items-start gap-3`                                                                                                                                                               |

---

## 5. Phase 2: Step-by-Step Execution Queue (One Component Per Turn)

Instruct your coding agent to execute the UI upgrade in the following **6 isolated steps**, verifying `npm run build` (or `npx tsc --noEmit`) after each individual step before proceeding to the next:

### Step 1: Global Theme Tokens & App Shell (`globals.css`, Header, and Main Tab Bar)

- **Target:** Root layout, global stylesheet, header component, and the 4-tab navigation wrapper.
- **UI Upgrades:** Apply the obsidian/slate surface tokens (`#090B10` dark background, `#11151F` card surface), sticky glassmorphic header blur, monospace Celery scheduler countdown pills, and gradient active tab triggers.
- **Verification Gate:** Confirm Dark/Light theme toggle, Statistics modal button, FAQ link, and all 4 tab switches work without console or TypeScript errors.

### Step 2: Download Tab & Magnet Pre-Flight UI (`download-section` / task components)

- **Target:** Magnet input form, WhatsLink preview card, `#177` size-limit error banner, and task queue list items.
- **UI Upgrades:** Style the magnet input command bar, give the WhatsLink metadata preview and >25 GB size-limit error alert clear semantic borders and iconography, and upgrade task progress bars and status badges.
- **Verification Gate:** Confirm submitting a magnet, displaying the >25 GB size limit error, filtering "My Tasks", and task polling updates all work identically to before.

### Step 3: Create & Share Cloud Explorer (`share-section.tsx`)

- **Target:** `share-section.tsx` and any child file/folder row components.
- **UI Upgrades:** Refine the breadcrumb bar, folder/file row hover states, file-type icon badges, and the one-click share button (highlighting globally deduplicated active links and 24-hour expiration timers).
- **Verification Gate:** Confirm folder navigation, creating a share link, deduplication reuse, and copy-to-clipboard notifications work with zero state changes.

### Step 4: WebDAV Client Pool & Quota Telemetry Views

- **Target:** WebDAV tab component and Quota tab component.
- **UI Upgrades:** Format each 24-hour rotating WebDAV client into a structured credential card with monospace copy fields and clean OS connection guide cards; format Quota storage, cloud download, and downstream traffic metrics into visual progress cards.
- **Verification Gate:** Confirm copying WebDAV URLs/usernames/passwords, toggling password visibility, and reading quota values work properly.

### Step 5: 30-Day Statistics Dashboard (`Recharts` views)

- **Target:** Statistics dashboard modal/view triggered from the header.
- **UI Upgrades:** Place each `Recharts` chart inside a consistent fixed-height card (`h-64` or `h-72`), refine chart colors (`#818cf8` indigo, `#34d399` emerald, `#a855f7` violet), and style custom tooltips to match the dark/light card surface.
- **Verification Gate:** Confirm all 4 historical charts (Tasks Added, Storage Utilization, Cloud Download Usage, Downstream Traffic) render responsively on desktop and mobile.

### Step 6: Authentication (`/`, `/register`), FAQ (`/faq`), and Admin (`/admin`) Views

- **Target:** Sign-in/Sign-up pages, FAQ page, and Admin dashboard tabs.
- **UI Upgrades:** Polish auth form cards and input focus states, format FAQ items into clean cards/accordions, and align `/admin` tables, User CRUD controls, and Celery action buttons with the updated design system.
- **Verification Gate:** Run full `npm run build` and `npm run lint` inside `pikpak-plus-client` to verify zero TypeScript, ESLint, or Next.js build regressions.

---

## 6. Copy-Paste Master Prompt for Antigravity / Coding Agents

Copy and paste the prompt below into Antigravity alongside this file to start the safe, step-by-step UI refactor:

```text
Read @PIKPAK_PLUS_AGENT_UI_PLAYBOOK.md completely before taking any action.

We are upgrading ONLY the visual UI/UX of `pikpak-plus-client` without introducing any new features or changing any existing functionality.

Follow these rules strictly:
1. Execute ONLY Step 1 from Section 5 first (wait for my approval before moving to Step 2).
2. Before editing any file in Step 1, output the "Phase 1 Pre-Edit Inventory" (Section 2) listing every state hook, API call, conditional render branch, and interactive control in that file.
3. Apply the Tailwind CSS v4 visual token upgrades from Section 4 by modifying ONLY JSX `className` strings, visual wrappers, and spacing.
4. DO NOT add, remove, or rename any hooks, state variables, props, event handlers, API calls, or conditional logic.
5. After editing the file, run TypeScript/build checks to confirm zero regressions, and show me a summary of the visual classes changed.
```
