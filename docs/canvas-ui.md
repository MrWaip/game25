# Canvas UI

`src/render/ui` is a reusable screen-space UI module, independent of the ECS,
world camera, assets and game definitions. Coordinates and font sizes are logical
CSS pixels, with the origin at the top left.

```ts
import { CanvasUiHost, createWidgets } from "@/render/ui";
import { theme } from "@/ui/theme";

const ui = createWidgets({ ...theme.ui, headingFamily: "Georgia, serif" });
const screen = new CanvasUiHost(container, {
	focus: theme.ui.focus,
	tooltipBackground: theme.ui.raised,
	tooltipText: theme.ui.text,
});

screen.show(
	ui.column(
		[
			ui.heading("Выбери награду"),
			ui.card({
				id: "frost",
				label: "Ледяные осколки",
				icon: "❄",
				caption: "ДЖОКЕР",
				description: "Взрывы по замедленным врагам создают осколки.",
				onPress: () => chooseReward("shatter"),
			}),
			ui.button({ id: "back", label: "Назад", onPress: closeMenu }),
		],
		{ padding: 20, background: theme.ui.background },
	),
);

// Integrate these calls with the game's existing lifecycle:
// update(dtSeconds) -> screen.advance(dtSeconds)
// pause/resume     -> screen.enabled = false/true
// teardown         -> screen.destroy()
```

`container` is a dedicated, positioned element with a real width, no padding or
border; it may scroll vertically. The host observes width changes, lays out the
scene again and updates the pixel buffer for DPR. `show` replaces the scene and
starts a short fade; call it when content changes, not every frame. `advance`
uses the caller's clock and creates no RAF, timer or extra engine.

`createWidgets` supplies typed `text`, `heading`, `column`, `row`, `button` and
`card` factories. Theme and widget defaults are chosen once; individual screens
supply content and actions. Composites return ordinary `UiNode` values, so custom
menus can reuse the same layout and input without subclassing. Buttons need
unique stable IDs. Do not nest interactive buttons inside other buttons.

Columns stack content; rows divide remaining width among flexible children.
A numeric `width` fixes a child's width. Panels support padding, gap, minHeight,
explicit height, fill, border and corner radius. Text wraps using canvas font
metrics, preserves newlines, breaks long words and optionally truncates using
`maxLines`. Explicit box heights clip children and their pointer targets.

Pointer-up activates only the pressed target; dragging, cancellation and disabled
screens cannot activate actions. Hover or a long press reveals `tooltip` after
0.6 seconds; releasing a long press does not also choose the item. Text is already
visible in cards, so tooltips should contain optional detail. Native keyboard
focus, Enter/Space and screen-reader actions share the same activation path.

All visible UI is Canvas. A transparent, positioned semantic mirror exposes
buttons and descriptions to assistive technology; it does not calculate layout
or paint UI. Direct canvas input works without this mirror. Keep the host enabled
state as the single control for availability rather than disabling its DOM
buttons from the game. The game owns modality by making the underlying board and
controls inert while the menu is visible.

`CanvasUi` is also available without the browser host when an existing game owns
its canvas, input and DPR transform. It lays out, paints, handles logical pointer
coordinates and exposes button bounds. `Tween` provides deterministic cubic-out
interpolation for custom effects; the built-in screen fade respects
`prefers-reduced-motion`. Sprite animations still use the existing world renderer.

Defense uses Canvas for its HUD, tower tray, actions and rewards. Native HTML
remains for entering a seed and for the launcher. Transparent semantic buttons
support keyboard and screen readers; both tower cards and the board also handle
direct pointer input without these buttons.

For game screens, use the small components in `games/defense/canvasUi.ts`:

```ts
// One row of tower cards; appearance is defined once in towerCard.
ui.row(
	choices.map((choice) => towerCard(choice, selectTower)),
	{ gap: 6 },
);

// An action already contains its label, availability and tone.
actionButton(action, controllerAction);
```

Change card appearance in `towerCard`, panel arrangement in `controls.ts`, and
available actions in `interaction/presentation.ts`. Canvas sizing, touch handling
and accessibility stay in `CanvasUiHost`; screens do not reproduce that logic.
Use `host.show(scene, false)` for HUD and control updates so a selection does
not fade out the whole panel. Tower cards are 60 × 64 logical pixels; bonuses
use compact icon chips, with their names retained for accessibility. The four
tower cards use code-drawn portraits from `towerPortrait.ts` and stay visible
while inspecting buildings, placing world effects and
fighting a wave; unavailable cards are disabled rather than removed.

Validation: `src/render/ui/canvasUi.test.ts` exercises Canvas layout, clipping,
text, actions, tooltips and time. `e2e/arcade.spec.ts` checks portrait widths,
pause/resume, keyboard, direct touch, building/replacement and teardown.

Construction screens consume `DefenseController.present()`: ready-to-display
choices, prices, actions, hints, cell availability and a `BoardPreview` containing
selection, range, snow and portal previews. Dispatch `selectCell`, `selectTower`
or `act(action.id)`; the controller checks the current presentation again before
executing commands. Its internal discriminated selection state and projection
live in `games/defense/interaction`. Renderers do not interpret interaction modes.
The Run screen caches the board preview between UI changes, rather than rebuilding
menus during animation frames. Scenarios are tested through the controller with
real sessions in `controller.test.ts`.

`RunScreen` owns this coordination inside defense: construction and reward
adapters receive action callbacks, and the screen applies the action, saves,
then refreshes the presentation. Reward rendering receives a snapshot from the
screen instead of reading the session. The screen also owns pause presentation,
overlay modality, phase-change focus and periodic/final saves; `browser.ts`
connects it to the shared browser lifecycle. Animation frames reuse the board
preview and construction menu until a player action or phase change requires a
refresh. Screen scenarios use real DOM and sessions in `runScreen.test.ts`.

Text painting centers visible glyph bounds within each line using Canvas font
metrics. A `drawing` node embeds a small code-drawn illustration without
introducing HTML or an external image-loading lifecycle.

The battlefield, tray host and action panel share the same width. Portrait
layouts leave 4 CSS pixels at each side; board width is not constrained by
viewport height. The four cards keep their fixed width rather than stretching
to fill the tray.

Reward cards use `upgradePortrait.ts` for effect-specific art, accent colors and
short effect summaries. Portal rendering uses circular rings: inward arrows for
the entrance, outward arrows for the exit, and a recharge arc in place of text.

`BoardInput` owns tap/drag recognition and the floating Canvas tower preview.
A valid drop invokes the existing relocation command; intermediate movement
never edits the session. Pause, pointer cancellation and teardown clear the
preview and release pointer capture.
