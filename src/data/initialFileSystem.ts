import { FSItem } from '../types';

export const INITIAL_FILE_SYSTEM: FSItem[] = [
  {
    id: 'root',
    name: 'RocketFS Root (/)',
    type: 'folder',
    path: '/',
    updatedAt: '2026-09-03',
    children: [
      {
        id: 'desktop',
        name: 'Desktop',
        type: 'folder',
        path: '/Desktop',
        updatedAt: '2026-09-03',
        children: [
          {
            id: 'hello-rocket',
            name: 'hello.rocket',
            type: 'file',
            path: '/Desktop/hello.rocket',
            size: '90 B',
            updatedAt: '2026-09-03',
            content: `fn main() -> Int:
    let greeting = "Hello from Rocket"
    print(greeting)
    return 0
`
          },
          {
            id: 'language-tour-rocket',
            name: 'language_tour.rocket',
            type: 'file',
            path: '/Desktop/language_tour.rocket',
            size: '755 B',
            updatedAt: '2026-09-03',
            content: `import std.collections
import std.string

struct Pair[T]:
    first: T
    second: T

enum Message:
    Number(Int)
    Text(String)

fn parse_and_increment(text: String) -> Result[Int, String]:
    let value = string.parse_int(text)?
    return Ok(value + 1)

fn main() -> Int:
    let pair = Pair(10, 20)
    let values = [pair.first, pair.second, 30]
    let middle = values[1..3]
    print(collections.slice_length(middle))

    let result = parse_and_increment("41")
    match result:
        case Ok(value):
            print(value)
        case Err(error):
            print(error)

    let message = Text("done")
    match message:
        case Number(value):
            print(value)
        case Text(text):
            print(text)

    return 0
`
          },
          {
            id: 'concurrency-rocket',
            name: 'ownership_concurrency.rocket',
            type: 'file',
            path: '/Desktop/ownership_concurrency.rocket',
            size: '1.1 KB',
            updatedAt: '2026-09-03',
            content: `import std.buffer
import std.ownership
import std.sync
import std.task

struct Record:
    value: Int

async fn increment(value: Int) -> Result[Int, String]:
    return Ok(value + 1)

fn main() -> Int:
    let record = Record(41)
    let observer = ownership.downgrade(record)
    match ownership.upgrade(observer):
        case Some(live):
            print(live.value)
        case None:
            return 1

    let mutable = buffer.thaw([1, 2])
    let grown = buffer.append(mutable, 3)
    let frozen = buffer.freeze(grown)
    print(frozen[2])

    let pending = increment(record.value)
    match task.join(pending):
        case Ok(value):
            print(value)
        case Err(message):
            print(message)
            return 2

    let initialized = sync.once_empty(0)
    match sync.once_set(initialized, 7):
        case Ok(won):
            print(won)
        case Err(message):
            print(message)
            return 3

    match sync.once_get(initialized):
        case Some(value):
            print(value)
        case None:
            return 4

    return 0
`
          },
          {
            id: 'fibonacci-rocket',
            name: 'fibonacci.rocket',
            type: 'file',
            path: '/Desktop/fibonacci.rocket',
            size: '154 B',
            updatedAt: '2026-09-03',
            content: `fn fib(n: Int) -> Int:
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

fn main() -> Int:
    let result = fib(10)
    print(result)
    return 0
`
          },
          {
            id: 'rocket-toml',
            name: 'rocket.toml',
            type: 'file',
            path: '/Desktop/rocket.toml',
            size: '180 B',
            updatedAt: '2026-09-03',
            content: `[package]
name = "rocket_app"
version = "2.1.0"
entry = "src/main.rocket"

[target.windows-x64]
features = ["llvm", "raylib"]

[target.linux-x64]
features = ["llvm", "raylib"]

[test]
directory = "tests"
`
          },
          {
            id: 'rocket-readme',
            name: 'README.md',
            type: 'file',
            path: '/Desktop/README.md',
            size: '2.8 KB',
            updatedAt: '2026-09-03',
            content: `# Rocket Programming Language
Repository: https://github.com/RyanEid06/Rocket
Author: RyanEid06

"Best and Fastest Coding language"

Rocket is a high-performance, statically-typed, indentation-aware programming language with:
- Genuine LLVM 22 backend for optimized native executables
- Linked ABI-v1 runtime with deterministic ARC (thread-confined cheap ARC, promoted atomic ARC for shared values)
- Indentation-aware syntax (colons + 4-space indent)
- C++20 stage0 reproducible bootstrap fallback to self-hosted stage3
- 4 accepted production targets: Windows x64, Linux x64, Linux ARM64, macOS ARM64
- Rocket 3.0 Graphics & UI: raylib 6.0 adapter, rocket.motion easing, safe 2D geometry (WP14 complete, WP15 next)
`
          },
          {
            id: 'rocket3-status',
            name: 'ROCKET_3_0_STATUS.txt',
            type: 'file',
            path: '/Desktop/ROCKET_3_0_STATUS.txt',
            size: '1.4 KB',
            updatedAt: '2026-09-03',
            content: `[ROCKET 3.0 GRAPHICS & UI WORK PACKET STATUS]
Source: docs/ROCKET_3_0_GRAPHICS_UI_IMPLEMENTATION_PLAN.md

[x] WP10: Named Arguments (Complete)
[x] WP11: Default Arguments (Complete)
[x] WP11A: Complete Named-Callable Parity (Complete)
[x] WP12: Complete Standard Math Module std.math (Complete)
[x] WP13: Easing and Complete Motion rocket.motion (Complete)
[x] WP14: Safe Raylib Geometry (Complete)
[>] WP15: Advanced Textures and Filtering (CURRENT / NEXT)
[ ] WP16: Render Targets & Textures (Pending)
[ ] WP17: Scissor & Blend Modes (Pending)
`
          }
        ]
      },
      {
        id: 'src-folder',
        name: 'src',
        type: 'folder',
        path: '/src',
        updatedAt: '2026-09-03',
        children: [
          {
            id: 'main-rocket',
            name: 'main.rocket',
            type: 'file',
            path: '/src/main.rocket',
            size: '420 B',
            updatedAt: '2026-09-03',
            content: `import std.string
import std.math
import rocket.motion

fn compute_bounce(time: Float) -> Float:
    let factor = math.sin(time * 3.14159)
    return motion.ease_out_bounce(factor)

fn main() -> Int:
    print("Rocket Application Engine Online")
    let position = compute_bounce(0.75)
    print(string.from_int(math.round(position * 100.0)))
    return 0
`
          },
          {
            id: 'math-module-rocket',
            name: 'math_demo.rocket',
            type: 'file',
            path: '/src/math_demo.rocket',
            size: '380 B',
            updatedAt: '2026-09-03',
            content: `import std.math

fn calculate_hypotenuse(a: Float, b: Float) -> Float:
    let sum_squares = math.pow(a, 2.0) + math.pow(b, 2.0)
    return math.sqrt(sum_squares)

fn main() -> Int:
    let c = calculate_hypotenuse(3.0, 4.0)
    print(c)
    return 0
`
          }
        ]
      },
      {
        id: 'downloads',
        name: 'Downloads',
        type: 'folder',
        path: '/Downloads',
        updatedAt: '2026-09-03',
        children: [
          {
            id: 'rocketc-bin',
            name: 'rocketc-windows-x64-v2.1.0.zip',
            type: 'file',
            path: '/Downloads/rocketc-windows-x64-v2.1.0.zip',
            size: '48.2 MB',
            updatedAt: '2026-09-02',
            content: `[BINARY ARCHIVE]
Rocket 2.1 Release Package (SHA-256: ccc8a1a7ba33bbd6f0dd0ecfadfa341d589204aee182476e9f08cb25b34fedcc)
Contents:
- rocketc.exe (Stage3 Native Compiler)
- rocket-lsp.exe (LSP Protocol 1.0 Server)
- runtime/ (ABI v1 static and dynamic libraries)
- include/ (LLVM 22.1.6 headers)
`
          },
          {
            id: 'vs-extension',
            name: 'Rocket.Language.VisualStudio.vsix',
            type: 'file',
            path: '/Downloads/Rocket.Language.VisualStudio.vsix',
            size: '1.4 MB',
            updatedAt: '2026-09-01',
            content: `[VISUAL STUDIO EXTENSION]
Rocket Language Extension for Visual Studio Community 2026 v2.0.3
Features:
- GUI Build, Run, Test, Stop, and Debug
- Nearest-package and standalone-file discovery
- Native CodeView/PDB debugging
- Integrated LSP error lists
`
          }
        ]
      },
      {
        id: 'documents',
        name: 'Documents',
        type: 'folder',
        path: '/Documents',
        updatedAt: '2026-09-03',
        children: [
          {
            id: 'phase19-audit',
            name: 'PHASE_19_AUDIT_SUMMARY.md',
            type: 'file',
            path: '/Documents/PHASE_19_AUDIT_SUMMARY.md',
            size: '2.4 KB',
            updatedAt: '2026-09-03',
            content: `# Rocket Phase 19 Portability Acceptance Audit
Status: CLOSED & ACCEPTED (2026-08-29)

Accepted Production Targets (24/24 Requirements Met):
1. Windows x64 (x86_64-pc-windows-msvc) - 222/222 CTest passed
2. Linux x64 (x86_64-unknown-linux-gnu) - CI Run 33194302234 passed
3. Linux ARM64 (aarch64-unknown-linux-gnu) - CI Run 33194302234 passed
4. macOS ARM64 (aarch64-apple-darwin) - CI Run 33194302234 passed

Key Architectural Boundaries:
- Dynamic loading: No arbitrary dlopen/LoadLibrary; native dependencies declared in rocket.toml
- Foreign ABIs: Platform C ABI only; non-standard calling conventions excluded
- Stage0 fallback: Reproducible C++20 transpiler preserved when LLVM is disabled
`
          }
        ]
      },
      {
        id: 'drivers-subsystem',
        name: 'drivers',
        type: 'folder',
        path: '/drivers',
        updatedAt: '2026-09-03',
        children: [
          {
            id: 'driver-nvme',
            name: 'nvme_vfs.sys',
            type: 'file',
            path: '/drivers/nvme_vfs.sys',
            size: '4.2 KB',
            updatedAt: '2026-09-03',
            content: `[RocketOS Driver Subsystem]
Device: Virtual NVMe Block Controller
Provider: IndexedDB Storage Adapter v1.0
PCI ID: 0x1B36:0x0010
Status: ACTIVE / MOUNTED
Base IO: 0x3F8, IRQ: 14
Sector Size: 4096 bytes
`
          },
          {
            id: 'driver-audio',
            name: 'hdaudio_synth.sys',
            type: 'file',
            path: '/drivers/hdaudio_synth.sys',
            size: '2.8 KB',
            updatedAt: '2026-09-03',
            content: `[RocketOS Driver Subsystem]
Device: Web Audio Procedural Synthesizer
Sampling Rate: 48000 Hz / Stereo
Channels: 2 (PCM Waveform Oscillators)
Status: ACTIVE
`
          },
          {
            id: 'driver-gpu',
            name: 'liquid_gpu.sys',
            type: 'file',
            path: '/drivers/liquid_gpu.sys',
            size: '5.1 KB',
            updatedAt: '2026-09-03',
            content: `[RocketOS Driver Subsystem]
Device: Liquid Glass Compositor Pipeline
Acceleration: WebGL / CSS GPU Layers
Target Refresh: 60Hz
Status: ACCELERATED
`
          }
        ]
      },
      {
        id: 'kernel-subsystem',
        name: 'kernel',
        type: 'folder',
        path: '/kernel',
        updatedAt: '2026-09-03',
        children: [
          {
            id: 'boot-rocket',
            name: 'boot_handoff.rocket',
            type: 'file',
            path: '/kernel/boot_handoff.rocket',
            size: '890 B',
            updatedAt: '2026-09-03',
            content: `// Rocket Kernel Boot Handoff
// Native x86_64 Long Mode entry

struct MultibootInfo:
    flags: Int
    mem_lower: Int
    mem_upper: Int
    boot_device: Int
    cmdline: String

fn kmain(info_ptr: Int) -> Int:
    print("Rocket Kernel Handoff Activated")
    print("Initializing ABI-v1 Runtime on CPU Core 0...")
    return 0
`
          }
        ]
      }
    ]
  }
];
