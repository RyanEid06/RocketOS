# RocketOS Core Architecture

**Status:** Transitional architecture for RocketOS 0.x
**Updated:** 2026-10-20

## 1. Reality first

The current repository does **not** have a native Rocket core that is authoritative in production.

Today:

- the React UI primarily uses TypeScript domain services;
- some UI paths bypass `ICoreProvider` and call TypeScript services directly;
- `BrowserFallbackCoreProvider` exposes the working browser-backed services;
- `RocketCoreClient` talks to `rocket/core-host/server.ts`;
- `rocket/core-host/server.ts` is a TypeScript/Node simulation, not a compiled Rocket daemon;
- `rocket/**/*.rocket` is migration/prototype source and is not part of the Vite production runtime.

Documentation must not describe this as already-completed native Rocket execution.

## 2. Transitional target

```text
React UI / future Rocket UI
            |
            v
       ICoreProvider
            |
   +--------+---------+
   |                  |
   v                  v
Preview provider   Installed-OS provider
(browser/TS)       (Linux-backed)
                       |
              +--------+--------+
              |                 |
              v                 v
        Rocket domains     TS domains still
        proven native      awaiting migration
              \                 /
               v               v
                 Linux adapters
                       |
                       v
                  Debian/Linux
```

The boundary is more important than forcing one language immediately.

## 3. Migration principles

### One provider contract

UI code should progressively depend on `ICoreProvider`/well-defined domain APIs rather than directly reaching into browser-only singleton services.

### Preview is allowed

Browser preview is valuable for AI Studio and rapid design iteration. `BrowserFallbackCoreProvider` may remain indefinitely as a development/preview implementation.

It is not the installed-OS backend.

### Native does not automatically mean Rocket

A real Linux-backed provider may initially combine:

- TypeScript/Node components;
- native Rocket components;
- thin C/C++ adapters;
- calls to Debian/Linux services.

That is acceptable during migration.

### Rocket migration is evidence-driven

Before declaring a Rocket module canonical:

1. compile it with the actual current Rocket compiler;
2. exercise it with tests/conformance fixtures;
3. compare it to the existing behavior;
4. wire it through the provider boundary;
5. only then retire the previous implementation.

Do not mass-convert stale pseudo-Rocket syntax and call the migration complete.

## 4. Domain ownership direction

Good candidates for progressive Rocket ownership include:

- settings/domain policy;
- search/index algorithms;
- app metadata/contracts;
- Rocket-specific command parsing;
- notifications/domain rules;
- package metadata/policy;
- filesystem/path policy that is genuinely RocketOS-specific;
- process/service policy above Linux primitives.

Real low-level process/filesystem/network/device mechanics remain Linux responsibility.

## 5. Linux adapter direction

The installed RocketOS provider should eventually source real data/actions from Linux:

- files/storage -> Linux filesystem APIs;
- processes -> Linux process APIs;
- services -> systemd;
- network/Wi-Fi -> NetworkManager/Linux networking;
- Bluetooth -> BlueZ;
- audio -> PipeWire/ALSA;
- hardware/system telemetry -> supported `/proc`, `/sys`, D-Bus, and system APIs;
- packages -> Debian package tooling;
- permissions/elevation -> Linux privilege/policy mechanisms.

Use a narrow C/C++ bridge only where Rocket or the chosen host runtime cannot safely access the required API/event model.

## 6. Source-of-truth rule

During migration, there may temporarily be more than one implementation of a domain. There must still be one declared active source of truth per runtime mode.

Every migration work packet must state:

- active implementation before the change;
- candidate replacement;
- shared tests/conformance checks;
- cutover point;
- deletion point for the old implementation.

## 7. Current dangerous areas

Do not casually delete or rewrite these during architecture cleanup:

- `src/core/filesystem/RocketFS.ts` and `FileSystemService.ts`;
- `src/core/apps/AppRegistry.ts`;
- `src/core-api/**` conformance/integration fixtures;
- `rocket/core-host/server.ts` while tests still depend on it;
- the React desktop/app components that define the protected design.

They are migration inputs even when they are not final architecture.
