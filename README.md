# Diagram Motion Lab

A local-first playground for editorial diagrams, flowing connections, and growing branches. Built with native ES modules, SVG, and CSS; no dependency installation or build step.

## Workflow

We work in **feature branches and pull requests by default**, unless explicitly requested otherwise. No direct pushes to `main`; review locally before merging and publishing. See [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md).

## Run

```sh
npm run dev
```

Open http://127.0.0.1:4178. `npm test` checks graph editing and layout contracts; `npm run check` checks JavaScript syntax.

## Jev devtools prototype

A reusable React package and local playground in [`devtools/`](devtools/README.md) uses a focused, resizable Jev drawer to inspect Jev calls with our diagram styles. It includes sample Choice, Score, Noul, and Box requests, retries, errors, and cancellation. Requires Node 22.12+: `npm --prefix devtools ci`, then `npm run dev:devtools` (port 4182). The existing lab remains dependency-free. The package exposes one root `<JevDevtools enabled={import.meta.env.DEV} />` component plus `createJevDevtools()` for server-side recording and SSE delivery. It is installable from `npm pack` (not published to npm); see the package README for the integration and independent React example.

### Install devtools in another React package

Requires **Node 22.12+**, **React 18 or 19**, and a Node server for your Jev calls. The package is not published to npm yet; install the archive built from this repository.

1. Build the package from a checkout of this repository:

   ```sh
   git clone https://github.com/diegoag64/diagram-motion-lab.git
   cd diagram-motion-lab/devtools
   npm ci
   npm pack
   ```

   This creates `diagram-motion-lab-jev-devtools-0.1.0.tgz` in `devtools/`. If you already have a checkout, start with `cd devtools` from its root.

2. From the directory containing your new React package's `package.json`, install that archive (replace the path with its actual location):

   ```sh
   npm install /absolute/path/to/diagram-motion-lab/devtools/diagram-motion-lab-jev-devtools-0.1.0.tgz
   ```

   Keep the archive at a stable location accessible to teammates and CI, or vendor it into your project and install using a relative path. In a workspace with separate frontend and server packages, install it in both packages that import it.

3. Add the stylesheet and mount the component once alongside your app at the React root:

   ```tsx
   import { JevDevtools } from '@diagram-motion-lab/jev-devtools';
   import '@diagram-motion-lab/jev-devtools/styles.css';

   export function Root() {
     return <>
       <App />
       <JevDevtools enabled={import.meta.env.DEV} />
     </>;
   }
   ```

   `App` is your existing application component. This example uses Vite's development flag. For Next.js, mount in a client component and use `enabled={process.env.NODE_ENV === 'development'}`. The inspector defaults to disabled; no provider or manual subscription is needed.

4. On your Node server, create one shared adapter and use its client for your Jev calls:

   ```ts
   import { createJevDevtools } from '@diagram-motion-lab/jev-devtools/server';

   export const inspector = createJevDevtools({
     enabled: process.env.NODE_ENV === 'development',
     origin: 'http://localhost:3000', // replace with your exact browser origin
   });
   export const jev = inspector.createClient({
     apiKey: process.env.TYPESAFE_API_KEY,
   });

   // In your existing Express/Connect server setup, before fallback routes:
   app.use(inspector.middleware);
   // Existing inference handlers now call jev.systemOne(...) normally.
   // On server shutdown: inspector.dispose();
   ```

   Set `TYPESAFE_API_KEY` only in your server environment. Both the inference handlers and inspector middleware must use this same adapter instance. Keep its default `/api/jev-devtools` endpoint, or set the same custom `endpoint` on both the server adapter and React component. If frontend and backend use separate ports, proxy the inspector endpoint and inference routes through the frontend origin. History is in memory and shared across local tabs by default.

Start your app in development mode and run a Jev request through the instrumented client. It will appear in the drawer with its context, questions, typed results, and transport details. To try this without an API key, run the [standalone sample consumer](devtools/examples/react-vite/) using the commands in the [full setup guide](devtools/README.md#local-playground-and-independent-example).

See the [server integration guide](devtools/README.md#server-setup) for Next.js route handlers, same-origin proxy requirements, and process/runtime limits, and [history and access](devtools/README.md#history-and-access) for authorization and per-user scopes.

## Playground

- Eleven starting diagrams: four interactive Jev examples (Choice, Score, Noul, and Box), plus branching ideas, pipeline, parallel fan-out, feedback loop, architecture, a blank starting point, and the Jev request/response composition (`?preset=jev`).
- Use **Build a flow** to add evidence, instructions, distributions, Noul probabilities, image regions, and code actions. Edit answer values and thresholds to highlight the active code paths. See [Jev visual primitives](docs/jev-primitives.md) for examples, semantics, and the reusable schema.
- Select a node to rename it, edit its detail, or spawn one to three branches. Branches can themselves spawn more branches.
- Signal, stream, and trace connection effects; independent flow speed and playback speed.
- Six card styles above the canvas: Baseline (open surfaces and rounded outlines), plus Slate (the original filled cards), Soft, Neon, Offset, and Terminal. Styles apply to every preset, work in light/dark mode, persist locally, and carry through static SVG export.
- Replay and scrub the growth sequence. Pause freezes the animation clock. Drag empty canvas to pan; zoom or fit with the canvas controls.
- Undo edits, remove a subtree, and reset a preset. The active diagram and appearance settings are saved in this browser's local storage; switching presets replaces the active graph (Undo can recover it during the current session).
- SVG export produces a complete static diagram, including nodes hidden by the current timeline position, with portable system fonts and the current palette. It does not export animation.
- Reduced-motion preferences show complete diagrams without travel effects. Native controls and SVG nodes are keyboard accessible.

![Choice classification example](docs/images/jev-choice.png)

## Structure

- `dist/model.js`: graph schema, presets, immutable editing operations, tree layout, and connector geometry. Nodes own a primary parent for layout; cross-links represent fan-in and feedback.
- `dist/renderer.js`: SVG scene, interpolated layout transitions, connection effects, pan/zoom, and static export.
- `dist/app.js`: controls, timeline clock, undo, persistence, and accessibility behavior.
- `dist/jev-primitives.js`: typed block data, probability math, conditional routes, and four Jev example graphs.
- `dist/primitive-renderer.js` / `dist/primitive-editor.js`: SVG cards and their editing controls.
- `dist/style.css`: extracted/adapted visual tokens and responsive application layout.

To add a concept, add a preset to `PRESETS`. To add a motion treatment, extend the renderer's connection modes. Node `born` times currently drive the reveal sequence; a future scene/event track can add collapse, reparent, and narrative states without replacing the graph model.

## Composition primitives

The Jev preset recreates a supplied reference as editable SVG, using reusable schema fields:

- **Multiline nodes:** `width`, `height`, and newline-separated `subtitle` support explanatory cards. Details can be edited in the inspector, up to four lines.
- **Merge junction:** `kind: 'junction'` creates a point connection without a box. Multiple incoming edges meet at exactly the same point; `arrow: false` removes their arrowheads.
- **Named containers:** `groups: [{id, label, eyebrow, members, focal}]` draws a labeled boundary around member nodes. Its bounds follow the members, with room reserved for its title.
- **Boundary connections:** edge `fromGroup` / `toGroup` connects to a container boundary while retaining semantic `from` / `to` node IDs for ordering and animation.
- **Edge annotations:** `label` draws a readable label alongside a connector with a paper-colored backing. Compact layouts place annotations beside vertical connections.
- **Authored composition:** `layoutMode: 'authored'` uses each node's `position` and `compactPosition` to preserve a specific explanatory layout. It supports multiple input roots and remains editable; new branches are placed in open space below the composition.

The Jev view makes the canvas wider and moves the inspector below it. Containers, labels, multiline text, and junctions are included in complete static SVG exports. Exported text uses portable fonts with preserved text widths. This is an explanatory diagram, with no Jev service integration or live model calls.

The canvas is capped at 40 nodes to keep it useful for explaining concepts. Automatic layout follows a left-to-right tree on desktop and a vertical tree on compact canvases; arbitrary cyclic graph layout and drag-to-reposition nodes are not implemented. Compact canvases start at a readable zoom; use pan to explore or Fit to see the entire diagram.

## Design provenance

Palette, type hierarchy, fine strokes, restrained emphasis, and small radii are adapted from [Cathryn Lavery's Diagram Design](https://github.com/cathrynlavery/diagram-design), inspected at commit `f2f4d49ea8d632f17cf196ba26599277a93f767b`. This playground warms the background slightly and increases interface typography for interaction. The graph renderer and motion system are new implementation, rather than the upstream skill's canonical controller.

The upstream MIT notice is retained in `dist/THIRD_PARTY_NOTICES.txt`. Fonts load from Google Fonts and fall back to installed system fonts when offline. No upstream icon bundle is included. The static diagram playground has no backend, telemetry, or API integration; the optional Jev devtools package has its own server adapter described above.

## Unlisted docs preview

The TypeSafe introduction layout study is mounted at `/docs/` in the same package and server:

- Playground: http://127.0.0.1:4178/
- Docs: http://127.0.0.1:4178/docs/

`/docs` redirects to `/docs/`. No playground navigation points to the docs route. The page retains `noindex,nofollow`; being unlisted is not an access-control mechanism. This integration is local-only until publication is requested.

Both views import `dist/model.js`, `dist/renderer.js`, `dist/card-themes.js`, and `dist/diagram.css`. The docs use the renderer's read-only mode (complete diagram, no editing or panning, full mobile fit), with their own page layout and appearance preferences. The playground keeps its interactive mode. Changes to shared graph geometry, motion, or card styles affect both views.

`dist/docs/` contains the TypeSafe page layout, condensed rewritten introduction, original Mermaid reference, and public logo assets. It supports Original / Animated comparison, card styles, pause, expansion, theme switching, and local navigation search. Links to other documentation pages go to the official docs. Source reference: https://docs.typesafe.ai/introduction. No TypeSafe analytics or authentication code is included.
