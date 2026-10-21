# Diagram Motion Lab

A local-first playground for editorial diagrams, flowing connections, and growing branches. Built with native ES modules, SVG, and CSS; no dependency installation or build step.

## Run

```sh
npm run dev
```

Open http://127.0.0.1:4178. `npm test` checks graph editing and layout contracts; `npm run check` checks JavaScript syntax.

## Playground

- Six starting diagrams: branching ideas, pipeline, parallel fan-out, feedback loop, architecture, and a blank starting point.
- Select a node to rename it, edit its detail, or spawn one to three branches. Branches can themselves spawn more branches.
- Signal, stream, and trace connection effects; independent flow speed and playback speed.
- Replay and scrub the growth sequence. Pause freezes the animation clock. Drag empty canvas to pan; zoom or fit with the canvas controls.
- Undo edits, remove a subtree, and reset a preset. The active diagram and appearance settings are saved in this browser's local storage; switching presets replaces the active graph (Undo can recover it during the current session).
- SVG export produces a complete static diagram, including nodes hidden by the current timeline position, with portable system fonts and the current palette. It does not export animation.
- Reduced-motion preferences show complete diagrams without travel effects. Native controls and SVG nodes are keyboard accessible.

## Structure

- `dist/model.js`: graph schema, presets, immutable editing operations, tree layout, and connector geometry. Nodes own a primary parent for layout; cross-links represent fan-in and feedback.
- `dist/renderer.js`: SVG scene, interpolated layout transitions, connection effects, pan/zoom, and static export.
- `dist/app.js`: controls, timeline clock, undo, persistence, and accessibility behavior.
- `dist/style.css`: extracted/adapted visual tokens and responsive application layout.

To add a concept, add a preset to `PRESETS`. To add a motion treatment, extend the renderer's connection modes. Node `born` times currently drive the reveal sequence; a future scene/event track can add collapse, reparent, and narrative states without replacing the graph model.

The canvas is capped at 40 nodes to keep it useful for explaining concepts. Automatic layout follows a left-to-right tree on desktop and a vertical tree on compact canvases; arbitrary cyclic graph layout and drag-to-reposition nodes are not implemented. Compact canvases start at a readable zoom; use pan to explore or Fit to see the entire diagram.

## Design provenance

Palette, type hierarchy, fine strokes, restrained emphasis, and small radii are adapted from [Cathryn Lavery's Diagram Design](https://github.com/cathrynlavery/diagram-design), inspected at commit `f2f4d49ea8d632f17cf196ba26599277a93f767b`. This playground warms the background slightly and increases interface typography for interaction. The graph renderer and motion system are new implementation, rather than the upstream skill's canonical controller.

The upstream MIT notice is retained in `dist/THIRD_PARTY_NOTICES.txt`. Fonts load from Google Fonts and fall back to installed system fonts when offline. No upstream icon bundle is included. The app has no backend, telemetry, or API integration.
