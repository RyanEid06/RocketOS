# RocketOS Agent Instructions

These rules apply to any AI/code agent working in this repository.

## 1. Read before changing anything

Read, in order:

1. `README.md`
2. `docs/ROCKETOS_ARCHITECTURE.md`
3. `docs/ROCKETOS_FOUNDATION_MASTER_PLAN.md`
4. `docs/ROCKETOS_DESIGN_CONTRACT.md`
5. `docs/ROCKET_CORE_ARCHITECTURE.md` when touching core/provider code
6. `docs/ROCKET_CORE_PROTOCOL.md` when touching the core boundary

Do not invent a competing architecture.

## 2. Architecture is fixed unless the project owner explicitly changes it

RocketOS 0.x is Debian-based.

**Rocket owns the experience. Linux owns the machinery.**

Do not introduce or revive:

- a custom Rocket bare-metal kernel;
- direct Rocket hardware drivers as the default plan;
- Yocto/BitBake as the RocketOS 0.x base;
- a second C++ desktop implementation;
- an unapproved compositor, bootloader, image builder, browser host, or packaging stack.

Recommendations are allowed. Silent architecture changes are not.

## 3. Preserve the existing design

The current React/TypeScript desktop and app designs are the visual contract.

Do not "simplify," "modernize," replace, or restyle the RocketOS identity unless explicitly asked. Pay special attention to the carousel/centered dock concept, desktop composition, bottom taskbar, glass/dark styling, window behavior, and app layouts.

## 4. Be honest about what is real

Do not describe browser simulations as native Linux functionality.

When reporting a capability, classify it as one of:

- `REAL_LINUX`
- `REAL_ROCKET_NATIVE`
- `REAL_WEB`
- `SIMULATED`
- `PROTOTYPE`
- `UNAVAILABLE`

The current repository contains simulated hardware/system data. Preserve it when necessary for the UI preview, but never present it as a real kernel/device implementation.

## 5. Rocket language authority

The separate `RyanEid06/Rocket` repository is authoritative for Rocket syntax, compiler/runtime behavior, target support, and current versioning.

Do not use stale RocketOS documentation to infer the Rocket language version. Do not mass-edit `.rocket` files by search-and-replace and assume they compile. Validate them with the actual current Rocket compiler when a work packet asks for Rocket code migration.

The reviewed Rocket snapshot includes the released compiler 3.0.0 and later Rocket 3.5 graphics/assets/UI work; LLVM 22.1.6 and Raylib 6.0 are current toolchain components in that Rocket snapshot. Re-check the Rocket repository before pinning integration versions.

## 6. Transitional language ownership

For RocketOS 0.x:

- Debian/Linux provides low-level machinery and hardware support.
- React/TypeScript remains the existing high-fidelity UI implementation until native Rocket reaches parity.
- TypeScript core services may remain temporarily while domains migrate incrementally.
- Rocket should own native RocketOS-specific logic where the current compiler/runtime can support it reliably.
- C/C++ is limited to thin native bridges where necessary, especially for Linux APIs or callback patterns Rocket cannot safely represent yet.

Do not force a big-bang rewrite.

## 7. Do not bypass migration gates

For changes to existing TypeScript/React behavior, keep these green:

```bash
npm test
npm run lint
npm run build
```

At the reset baseline this means 77/77 tests, zero TypeScript errors, and a successful Vite production build.

When migrating a subsystem, old and new implementations should pass the same behavior/conformance tests before the old implementation is removed.

## 8. Storage guard

The intended RocketOS development environment is roughly 25–45 GB.

Before starting any single operation expected to consume more than 20 GB of additional disk space, stop and ask for approval. Do not introduce a 100+ GB source/build workflow without explicit approval.

## 9. Git discipline

Do not delete a functioning path merely because it is old until its replacement is proven, unless the work packet explicitly authorizes removal.

Keep generated artifacts out of Git. VM disk images and installer images belong in build/release outputs, not source history.

## 10. Decision authority

Implementation agents execute approved work packets. Architecture, product direction, dependency selection, and visual redesign decisions require explicit project-owner approval.
