# RocketOS Design Contract

**Status:** Protected product-design reference
**Reference baseline:** 2026-10-20

## Purpose

The existing RocketOS UI represents substantial completed design work. Future implementation changes may replace React/TypeScript internally, but they must not casually replace the RocketOS identity.

**Change the engine, not the identity.**

## Canonical desktop concept

The October 20, 2026 reference desktop contains these defining elements:

- dark navy/blue gradient desktop background;
- large clock in the upper-right with the date directly below;
- compact `Widgets` control near the top-right edge;
- a centered curved/carousel-style row of desktop/application icons above the taskbar;
- icon scaling/positioning that gives the center row a dimensional carousel feel;
- a dark full-width bottom taskbar;
- launcher/workspace/search controls on the left;
- pinned/primary app icons toward the center;
- network, audio, time/date, and notifications on the right;
- glass/dark styling, rounded surfaces, restrained neon/accent color, and clean spacing.

## Protected interaction concepts

Preserve the concept and behavior of:

- centered carousel dock/icon motion;
- desktop icon launching;
- draggable/resizable windows;
- maximize/minimize/close behavior;
- snapping and workspace organization;
- Start/launcher and universal search;
- quick settings and notifications;
- Mission Control/workspace overview where present;
- existing first-party app layouts and their recognizable visual identity;
- theme/wallpaper/accent customization.

## Migration acceptance rule

A native Rocket implementation does **not** pass merely because it offers the same feature list.

It should preserve:

1. recognizable layout and hierarchy;
2. interaction concept;
3. motion/animation intent;
4. visual weight and spacing;
5. dark/glass identity;
6. app-specific design work already completed.

Temporary technical differences are acceptable during migration, but agents must not permanently simplify the design just because a lower-level implementation is harder.

## Reference screenshot

The repository should contain:

`docs/design/reference/rocketos-desktop-reference.png`

This image is the visual acceptance reference for the baseline desktop. If it is absent, add the approved October 20, 2026 screenshot before major UI migration work begins.

## Redesign authority

No implementation agent may redesign RocketOS on its own. A material visual or interaction redesign requires explicit project-owner approval.
