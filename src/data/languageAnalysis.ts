import { LanguageWeakness, Rocket3Packet } from '../types';

export const REPO_METADATA = {
  name: 'Rocket',
  repoUrl: 'https://github.com/RyanEid06/Rocket',
  owner: 'RyanEid06',
  tagline: 'Best and Fastest Coding language',
  latestRelease: 'Rocket 2.1 / Rocket 3.0 (Provisional)',
  backend: 'LLVM 22.1.6 + C++20 Stage0 Fallback',
  abi: 'ABI v1 (Deterministic)',
  memoryModel: 'Thread-Confined ARC + Atomic Graph Promotion + UniqueBuffer[T]',
  supportedTargets: [
    { alias: 'windows-x64', triple: 'x86_64-pc-windows-msvc', status: 'Production Tier 1' },
    { alias: 'linux-x64', triple: 'x86_64-unknown-linux-gnu', status: 'Production Tier 1' },
    { alias: 'linux-arm64', triple: 'aarch64-unknown-linux-gnu', status: 'Production Tier 1' },
    { alias: 'macos-arm64', triple: 'aarch64-apple-darwin', status: 'Production Tier 1' },
  ],
  experimentalTargets: [
    { alias: 'windows-arm64', triple: 'aarch64-pc-windows-msvc', status: 'Under Evaluation' },
    { alias: 'wasm32', triple: 'wasm32-unknown-unknown', status: 'Not Yet Supported' },
  ],
};

export const ROCKET_3_PACKETS: Rocket3Packet[] = [
  {
    id: 'WP10',
    name: 'Named Arguments',
    feature: 'F01',
    status: 'COMPLETE',
    description: 'Added labeled parameters and named argument invocation for functions and methods.'
  },
  {
    id: 'WP11',
    name: 'Default Arguments',
    feature: 'F02',
    status: 'COMPLETE',
    description: 'Default parameters type-checked in declaration context; preserves left-to-right evaluation.'
  },
  {
    id: 'WP11A',
    name: 'Complete Named-Callable Parity',
    feature: 'F03',
    status: 'COMPLETE',
    description: 'Named calls for closures, intrinsics, print, and labeled enum payloads like Value(amount: Int).'
  },
  {
    id: 'WP12',
    name: 'Complete Standard Math Module',
    feature: 'F04',
    status: 'COMPLETE',
    description: 'Added std.math covering constants, trigonometry, interpolation, smoothing, and bounded motion.'
  },
  {
    id: 'WP13',
    name: 'Easing and Complete Motion',
    feature: 'F05',
    status: 'COMPLETE',
    description: 'Added rocket.motion module with easing families, Float/Vec2/Color tweens, timelines.'
  },
  {
    id: 'WP14',
    name: 'Safe Raylib Geometry',
    feature: 'F06/F07',
    status: 'COMPLETE',
    description: 'Expanded raylib adapter for rectangles, circles, rings, lines, triangles, polygons, Bezier curves.'
  },
  {
    id: 'WP15',
    name: 'Advanced Textures and Filtering',
    feature: 'F08',
    status: 'NEXT',
    description: 'Advanced texture drawing (source rect, dest rect, pivot, rotation, tint, point/bilinear/trilinear/anisotropic filters).'
  },
  {
    id: 'WP16',
    name: 'Render Targets & Textures',
    feature: 'F09',
    status: 'RED',
    description: 'Offscreen render targets, framebuffer captures, and custom camera projections.'
  },
];

export const LANGUAGE_WEAKNESSES: LanguageWeakness[] = [
  {
    id: 'target-portability-wasm-jit',
    title: 'Platform Boundaries: No WebAssembly (Wasm) or JIT Support',
    severity: 'High',
    category: 'Target & Platform',
    summary:
      'Rocket 2.1 is locked to four tier-1 native OS targets; WebAssembly and runtime JIT execution are not supported.',
    issueDescription:
      'As documented in docs/PHASE_19_AUDIT.md (T01 & T24), Rocket targets Windows x64, Linux x64, Linux ARM64, and macOS ARM64. Windows ARM64 remains an evaluation target, while WebAssembly (wasm32) and JIT/eval modes are not currently implemented. Consequently, Rocket applications cannot yet run natively in browser runtimes or dynamic plugin sandboxes.',
    solutionInRocket:
      'Plan Phase 21/22 target expansion for LLVM WebAssembly lowering (wasm32-unknown-unknown or WASI) and explore an embeddable interpreter/JIT layer for interactive scripting.',
    repoReference: 'docs/PHASE_19_AUDIT.md / docs/TARGETS.md',
    codeExampleBad: `# Target check fails on unsupported platforms
rocketc target --target wasm32-unknown-unknown
# Diagnostic R6001: Unsupported target architecture wasm32`,
    codeExampleGood: `# Supported production targets in Phase 19:
rocketc target --target x86_64-pc-windows-msvc
rocketc target --target x86_64-unknown-linux-gnu
rocketc target --target aarch64-unknown-linux-gnu
rocketc target --target aarch64-apple-darwin`
  },
  {
    id: 'ffi-no-runtime-dlopen',
    title: 'Manifest-Only Native FFI: No Arbitrary Runtime Dynamic Loading (dlopen)',
    severity: 'Medium',
    category: 'FFI & Foreign ABIs',
    summary:
      'By design, Rocket forbids arbitrary runtime foreign library loading (dlopen/LoadLibrary) to protect memory safety.',
    issueDescription:
      'As audited in docs/PHASE_19_AUDIT.md and docs/FFI_GUIDE.md, Rocket does not expose arbitrary safe-language runtime foreign-library loading. Native dependencies must be declared ahead of time in `rocket.toml` under `[native.<target>]` and bound using `rocketc bind`. This intentional restriction prevents unchecked symbol lookups and preserves the Phase 13 safety boundary, but prevents loading arbitrary third-party plugins at runtime without recompilation.',
    solutionInRocket:
      'Use manifest-declared native bindings in `rocket.toml` with statically generated Rocket binding files (`rocketc bind .\\native\\vendor.h --output .\\bindings.rocket`).',
    repoReference: 'docs/PHASE_19_AUDIT.md (Section: Limitation classification)',
    codeExampleBad: `// FORBIDDEN in Rocket: No runtime dynamic library handle lookup
let handle = dlopen("plugin.so") // Compile Error: no arbitrary dynamic loading
let fn_ptr = dlsym(handle, "calculate")`,
    codeExampleGood: `# IN ROCKET: Statically declare in rocket.toml
[package]
name = "my_app"
version = "1.0.0"

[native.windows-x64]
libraries = ["vendor.lib"]
headers = ["native/vendor.h"]

# Bindings generated via: rocketc bind native/vendor.h --output src/vendor.rocket`
  },
  {
    id: 'calling-conventions-limited',
    title: 'Foreign Calling Conventions Restricted to Standard Platform C ABI',
    severity: 'Medium',
    category: 'FFI & Foreign ABIs',
    summary:
      'The FFI layer strictly supports ordinary platform C ABI; non-standard calling conventions (stdcall, vectorcall, C++ classes) are excluded.',
    issueDescription:
      'Rocket 2.0 / 2.1 standardizes on the platform C ABI across its 4 targets. Broader foreign calling conventions (`stdcall`, `vectorcall`, C++ name mangling/vtables, or vendor-specific ABIs) are intentionally excluded from the binding generator and must not be guessed. Integrating older Windows 32-bit Win32 APIs or complex C++ class hierarchies requires custom extern "C" adapter shims.',
    solutionInRocket:
      'Wrap non-standard C++ libraries or legacy calling conventions in a thin C adapter header that exports standard `extern "C"` cdecl functions.',
    repoReference: 'docs/FFI_GUIDE.md & docs/PHASE_19_AUDIT.md',
    codeExampleBad: `// Unsupported: Direct C++ class binding or stdcall
extern "stdcall" fn Win32LegacyCall() -> Int: // Unsupported convention
class CppObject: // Unsupported: no C++ OOP vtable layout`,
    codeExampleGood: `// Correct: Platform C ABI adapter
unsafe:
    extern fn rocket_c_adapter_call(arg: Int) -> Int

fn safe_wrapper(val: Int) -> Int:
    unsafe:
        return rocket_c_adapter_call(val)`
  },
  {
    id: 'arc-concurrency-promotion',
    title: 'Dual-ARC Concurrency & Graph Promotion Overhead (R4101-R4106)',
    severity: 'High',
    category: 'Memory & Concurrency',
    summary:
      'Thread-confined values use cheap non-atomic ARC, but crossing thread boundaries requires promoting the entire managed graph to atomic ARC.',
    issueDescription:
      'Rocket freezes ABI v1 with an innovative memory model: thread-confined values retain cheap plain ARC (no atomic instruction overhead). However, when publishing or transferring data to another task or thread, the compiler validates structural `Send`/`Share` rules. Crossing boundaries promotes the complete graph to atomic ARC. Violations (such as move reuse, scoped-handle escape, or invalid suspension) fail at compile-time with diagnostics `R4101`-`R4106`.',
    solutionInRocket:
      'Use `UniqueBuffer[T]` for zero-copy move-only transfers, `Weak[T]` for cycle breaking, and `std.sync` channels / mutexes for coordinated access.',
    repoReference: 'docs/CONCURRENCY.md & docs/DIAGNOSTICS.md',
    codeExampleBad: `// Diagnostic R4102: Attempting to share thread-confined mutable graph across tasks
import std.task

fn leak_confined() -> Int:
    var shared = [1, 2, 3]
    let handle = task.spawn(fn():
        print(shared[0]) // Error R4102: non-atomic ARC capture cannot escape thread
    )
    return 0`,
    codeExampleGood: `// Correct: Promote graph to atomic ARC or transfer ownership cleanly
import std.sync
import std.task

fn safe_concurrent() -> Int:
    let initialized = sync.once_empty(0)
    match sync.once_set(initialized, 42):
        case Ok(val):
            print(val)
        case Err(msg):
            print(msg)
    return 0`
  },
  {
    id: 'build-resource-consumption',
    title: 'Compiler Resource Footprint & 4-Stage Bootstrap Overhead',
    severity: 'Medium',
    category: 'Build & Tooling',
    summary:
      'LLVM 22 backend and 4-stage self-hosting bootstrap require strict 4 GiB memory and 20 GiB disk guards to prevent build crashes.',
    issueDescription:
      'Because Rocket’s production compiler is written in Rocket and self-hosts through stage0 (C++ transpiler) -> stage1 -> stage2 -> stage3 (canonical IR match verification), a full clean build and CTest validation matrix compiles hundreds of thousands of lines of LLVM IR. The build scripts require a 4 GiB per-process memory guard and a 20 GiB disk operation guard, making full matrix verification slow on lower-spec machines.',
    solutionInRocket:
      'Use `rocketc check` for sub-second iterative development (type-checking without LLVM code generation) and rely on stage0 for fast incremental debugging when LLVM is disabled.',
    repoReference: 'AGENTS.md & docs/PROJECT_CONTEXT.md',
    codeExampleBad: `# Full bootstrap build takes ~10-15 minutes and requires >5GB temp disk space:
powershell.exe -File .\\scripts\\bootstrap.ps1 -Configuration Release
# Generates stage1, stage2, stage3 LLVM IR and runs 228+ CTest cases`,
    codeExampleGood: `# Fast everyday developer workflow:
rocketc check src/main.rocket       # Instant semantic validation
rocketc run src/main.rocket         # Single-file incremental build & run`
  },
  {
    id: 'raylib-primitive-subset',
    title: 'Raylib Graphics Surface Limited to Curated 2D Primitive Adapter',
    severity: 'Medium',
    category: 'Graphics & Raylib',
    summary:
      'The raylib wrapper in Rocket is a carefully verified 2D subset; full 3D models, shaders, and audio streams are not yet exposed.',
    issueDescription:
      'As specified in WP14 and WP15 of the Rocket 3.0 graphics plan, Rocket wraps raylib via safe tokens and value types (e.g. rectangles, circles, lines, 2D textures, and bezier curves). Rocket intentionally does not expose raw native C pointers, raw raylib structs, or raw OpenGL shader handles. Complex 3D rendering pipelines or custom fragment shaders remain RED until later work packets (WP17-WP20).',
    solutionInRocket:
      'Use Rocket 3.0 safe geometry (`raylib.draw_rectangle`, `draw_circle`, `draw_bezier`) and `rocket.motion` for smooth UI animations while WP15+ texture and shader packets are being developed.',
    repoReference: 'docs/ROCKET_3_0_GRAPHICS_UI_IMPLEMENTATION_PLAN.md',
    codeExampleBad: `// Raylib C raw pointers and unchecked structs are FORBIDDEN in Rocket:
let raw_mesh: *mut RaylibMesh = LoadModel("car.obj") // Not allowed in safe layer`,
    codeExampleGood: `// Safe Rocket 3.0 Raylib Geometry API (WP14):
import rocket.motion
import std.math

fn render_frame(t: Float) -> Unit:
    let eased = motion.ease_in_out_cubic(t)
    // Synchronous point tokens, safe bounds checked coordinates
    print(math.round(eased * 100.0))`
  },
  {
    id: 'syntax-indentation-strictness',
    title: 'Strict 4-Space Indentation & Top-Level Declaration Constraints',
    severity: 'Design Consideration',
    category: 'Grammar & Syntax',
    summary:
      'Rocket requires Python-style colons and 4-space indentation; top-level statements outside fn/struct/enum are disallowed.',
    issueDescription:
      'Rocket uses an indentation-aware frontend. All blocks require a colon `:` followed by an indent. Mixing tabs and spaces is a fatal syntax error. Unlike Python or JavaScript, top-level procedural statements (like `print("hi")` outside a function) are illegal; only `import`, `fn`, `struct`, and `enum` can reside at the top level. Additionally, module imports do not support custom renaming aliases (e.g., `import src.math as m` is not valid; it always binds to `math`).',
    solutionInRocket:
      'Always structure programs around explicit `fn main() -> Int:` entry points, and use canonical 4-space formatting with `rocketc fmt`.',
    repoReference: 'docs/ROCKET_1_0_SYNTAX_DICTIONARY.md',
    codeExampleBad: `// Syntax Error: Tab indentation or top-level procedural statements
print("Starting up...") // Error: top-level statement outside function

import src.math as my_math // Error: custom 'as' alias syntax not supported

fn calculate():
  return 10 // Error: 2 spaces instead of canonical 4 spaces`,
    codeExampleGood: `// Canonical Rocket syntax:
import src.math

fn calculate() -> Int:
    return math.doubled(21)

fn main() -> Int:
    let answer = calculate()
    print(answer)
    return 0`
  }
];

export const OS_ARCHITECTURE_STEPS = [
  {
    step: 1,
    title: 'Frontend Parser & Indentation AST',
    description:
      'Lexes Rocket source, handles colon block scoping, tracks token positions, builds indentation-aware syntax tree.',
    languageBreakdown: 'Rocket-written self-hosted compiler (compiler/frontend/) & C++20 stage0 fallback',
  },
  {
    step: 2,
    title: 'HIR (High-Level Intermediate Representation) & Type Checker',
    description:
      'Performs import resolution, generic specialization, trait constraint checking, struct/enum layouts, and error diagnostics.',
    languageBreakdown: 'Rocket-written self-hosted compiler (compiler/hir/)',
  },
  {
    step: 3,
    title: 'MIR (Mid-Level IR) & Concurrency/ARC Verification',
    description:
      'Verifies control flow, checks Send/Share bounds, enforces thread-confinement rules, promotes atomic ARC, emits R4101-R4106 diagnostics.',
    languageBreakdown: 'Rocket-written self-hosted compiler (compiler/mir/)',
  },
  {
    step: 4,
    title: 'LLVM 22 Native Backend & Code Generator',
    description:
      'Lowers MIR into verified LLVM 22 IR, applies O2 optimization pipeline, emits native object files (.obj / .o) and machine assembly (.s).',
    languageBreakdown: 'LLVM 22.1.6 C++ API & native linker (LLD)',
  },
  {
    step: 5,
    title: 'ABI-v1 Runtime & Raylib Graphics',
    description:
      'Deterministic runtime ABI v1 providing ARC reference counting, UTF-8 owned strings, checked math, raylib 6.0 safe 2D geometry and motion.',
    languageBreakdown: 'Native Runtime + Safe Rocket wrapper (stdlib/ & rocket.motion)',
  }
];
