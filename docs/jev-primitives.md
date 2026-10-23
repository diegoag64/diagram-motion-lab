# Building Jev flow diagrams

The lab is an explanatory editor, not a TypeSafe client. All answers are editable fixtures. Changing evidence or instructions does **not** run inference or recompute an answer. Change the answer values explicitly to illustrate another outcome. No API key is required or stored.

## Try the examples

Run `npm run dev`, then open one of these routes:

| Example | Local route | What it illustrates |
| --- | --- | --- |
| Choice | `/?preset=jev-choice` | A message, classification probabilities, confidence, and dispatch/review branches |
| Score | `/?preset=jev-score` | Ordered severity levels, their distribution, weighted score, and a priority threshold |
| Noul | `/?preset=jev-noul` | Probability of a condition, with yes/review/no code paths |
| Box | `/?preset=jev-box` | Image coordinates plus an independent presence check that gates their use |

Select a block to edit it in the inspector below the canvas. Probability weights normalize to 100%. Add/remove options, rename them, and move thresholds to watch the active routes change. Expand **Typed answer** to inspect the corresponding example response. Thresholds belong to the illustrated application policy, not the Jev answer.

## Compose a flow

1. Start from a template or Blank canvas. Select the block you want to build from.
2. Use **Build a flow** to add state, instructions, an answer, image evidence, or a code action. The new block is connected to the selected block.
3. Select a Choice, Score, or Noul answer and choose **Add code routes** to create conditional branches. Existing templates already include these routes.
4. Use **Connect the flow** to connect existing nodes and label the relationship. These additional connections are explanatory; they do not execute a data pipeline.
5. Edit evidence, questions, and answers to keep the example consistent. Option edits update generated route labels; manually renamed actions retain their names.
6. Replay growth, pause, pan, zoom, switch card styles, or export a static SVG. Undo restores prior graph edits. Switching templates replaces the active graph; undo can recover it within the current session.

The graph and appearance are saved in this browser. Images are local PNG/JPEG/WebP files up to 500 KB, embedded in the saved diagram and SVG export. Storage exhaustion is reported without deleting the in-memory graph. In the Box template, edit **Image · photo** to replace the image shared with the answer. Adding a Box directly from an image block links it similarly. A standalone Box can have its own image. Images currently stretch to the illustration frame; the normalized box edges use that same coordinate frame.

This is a small explanatory canvas: 40 nodes, 100 connections, and 2–6 distribution options. Layout is automatic or preset-authored, with compact vertical layouts, pan and zoom; there is no arbitrary drag-to-position editor. Cross-links may pass behind intervening nodes in compact layouts. Export is static and includes the full graph regardless of playback position.

## Semantics and sources

The [TypeSafe skill](https://github.com/typesafe-ai/skills/blob/main/skills/typesafe-ai/SKILL.md) informed the examples. Current official docs were checked on October 22, 2026:

- [Choice](https://docs.typesafe.ai/primitives/choice): one selection from competing categories, their probability distribution, and confidence. These are not independent probabilities that several labels apply. Use multiple independent Noul questions for that case.
- [Score](https://docs.typesafe.ai/primitives/score): an ordered set of criteria indexed from zero. The score is the expected index, `sum(p[i] * i)`. It is not the maximum probability or a Noul intensity slider.
- [Noul](https://docs.typesafe.ai/primitives/noul): probability of yes in `[0,1]`; there is no separate confidence field. A value near 0.5 means uncertainty, not a half-strength condition.
- [Box](https://docs.typesafe.ai/primitives/box): one region with `left`, `top`, `right`, `bottom` as normalized fractions from the top-left, plus confidence. Multiply horizontal edges by image width and vertical edges by image height. Box always returns coordinates, even when the target is absent. Ask a separate Noul for presence and let code ignore the coordinates when presence is low or uncertain.
- [Confidence](https://docs.typesafe.ai/confidence): Choice confidence is `(max(p) - 1/n) / (1 - 1/n)`. Score confidence uses dispersion around the modal index relative to the documented uniform-distribution baseline. These are distinct from the probability of a particular category.
- [Building with System One](https://docs.typesafe.ai/concepts/how-to-build-with-system-one): independent questions share the state and run in parallel; they do not read each other's answers. Your code owns routing and execution. These fixtures' thresholds are examples, not production recommendations.

Box is documented as **Dreamer-ready** in Jev 1.14. A real integration currently uses `jev-preview` or `jev-1.14.0` and the opt-in header `TypeSafe-Danger-Zone-Images: true`. This lab does not make those calls. Check the official docs again before implementing an integration.

## Reusable schema

A typed node extends the existing graph node with a `visual` object:

```js
{
  id: 'n2', label: 'Category probabilities', parent: 'n0', born: 1.1,
  subtitle: '', width: 320, height: 288,
  visual: {
    type: 'choice',
    options: [
      {label: 'Billing', weight: 76},
      {label: 'Delivery', weight: 14},
      {label: 'Other', weight: 10}
    ],
    threshold: 0.55
  }
}
```

Supported `visual.type` values and data:

| Type | Fields |
| --- | --- |
| `state`, `question`, `action` | `text` |
| `choice`, `score` | `options: [{label, weight}]`, `threshold` |
| `noul` | `value`, `low`, `high` |
| `image` | optional embedded `image` data URL |
| `box` | `box: {left, top, right, bottom}`, `confidence`, optional `image` or `imageFrom` node ID |

`dist/jev-primitives.js` owns constructors, validation, probability math, immutable editing, and route evaluation. `dist/primitive-renderer.js` draws the cards. `dist/primitive-editor.js` edits their data. These modules remain separate from the original reference composition used on `/docs/`.

A conditional edge has `when: {node, mode, option?}`. Choice uses `option` or `review`; Score uses `above` or `below`; Noul uses `yes`, `review`, `no`, or `not-yes`. `refreshRoutes` derives `active` from the referenced answer and its policy. The Box example's coordinates edge references the presence Noul so that a box alone cannot activate the draw action. Inactive routes remain visible and have no flowing particle.

Use `makeBlock`, `addBlock`, `addRoutes`, `connectBlocks`, and `updateVisual` to construct or edit graphs. Edits return new graphs for undo; `refreshRoutes` intentionally updates derived route state in place. `summarize` derives the typed result; `boxPixels` converts normalized coordinates. The graph's root/parent relationships control layout, while edges may also express fan-in and feedback.
