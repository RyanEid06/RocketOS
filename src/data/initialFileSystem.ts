import { FSItem } from '../types';

export const INITIAL_FILE_SYSTEM: FSItem[] = [
  {
    id: 'root',
    name: 'RocketFS Root (/)',
    type: 'folder',
    path: '/',
    updatedAt: '2026-09-04',
    children: [
      {
        id: 'desktop',
        name: 'Desktop',
        type: 'folder',
        path: '/Desktop',
        updatedAt: '2026-09-04',
        children: [
          {
            id: 'welcome-rocket',
            name: 'welcome.rocket',
            type: 'file',
            path: '/Desktop/welcome.rocket',
            size: '128 B',
            updatedAt: '2026-09-04',
            content: `# Welcome to RocketOS 2.1
# Statically-typed, deterministic ARC, indentation-aware system

fn main() -> Int:
    let message = "Welcome to RocketOS"
    print(message)
    return 0
`
          },
          {
            id: 'rocket-toml',
            name: 'rocket.toml',
            type: 'file',
            path: '/Desktop/rocket.toml',
            size: '150 B',
            updatedAt: '2026-09-04',
            content: `[package]
name = "workspace"
version = "2.1.0"
entry = "src/main.rocket"

[target.native]
features = ["llvm", "raylib"]
`
          }
        ]
      },
      {
        id: 'src-folder',
        name: 'src',
        type: 'folder',
        path: '/src',
        updatedAt: '2026-09-04',
        children: [
          {
            id: 'main-rocket',
            name: 'main.rocket',
            type: 'file',
            path: '/src/main.rocket',
            size: '260 B',
            updatedAt: '2026-09-04',
            content: `# Rocket Application Entry Point
import std.string
import std.math

fn calculate_hypotenuse(a: Float, b: Float) -> Float:
    return math.sqrt(a * a + b * b)

fn main() -> Int:
    let hypotenuse = calculate_hypotenuse(3.0, 4.0)
    print("Hypotenuse: " + string.from_float(hypotenuse))
    return 0
`
          },
          {
            id: 'math-demo-rocket',
            name: 'math_demo.rocket',
            type: 'file',
            path: '/src/math_demo.rocket',
            size: '220 B',
            updatedAt: '2026-09-04',
            content: `# Standard Math Library Demo
import std.math
import std.string

fn main() -> Int:
    let val = math.sin(1.57079)
    print("sin(pi/2) = " + string.from_float(val))
    return 0
`
          }
        ]
      },
      {
        id: 'demos-folder',
        name: 'demos',
        type: 'folder',
        path: '/demos',
        updatedAt: '2026-09-04',
        children: [
          {
            id: 'demo-hello',
            name: 'hello.rocket',
            type: 'file',
            path: '/demos/hello.rocket',
            size: '95 B',
            updatedAt: '2026-09-04',
            content: `# Hello World Demo
fn main() -> Int:
    print("Hello from Rocket 2.1!")
    return 0
`
          },
          {
            id: 'demo-fibonacci',
            name: 'fibonacci.rocket',
            type: 'file',
            path: '/demos/fibonacci.rocket',
            size: '210 B',
            updatedAt: '2026-09-04',
            content: `# Fibonacci Calculation Demo
import std.string

fn fib(n: Int) -> Int:
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

fn main() -> Int:
    let result = fib(10)
    print("fib(10) = " + string.from_int(result))
    return 0
`
          },
          {
            id: 'demo-system',
            name: 'system_info.rocket',
            type: 'file',
            path: '/demos/system_info.rocket',
            size: '240 B',
            updatedAt: '2026-09-04',
            content: `# RocketOS System Architecture
fn main() -> Int:
    print("Operating System: RocketOS 2.1 LTS")
    print("Architecture: x86_64 Long Mode")
    print("Compiler: rocketc (LLVM 22.1.6 Backend)")
    return 0
`
          }
        ]
      },
      {
        id: 'documents',
        name: 'Documents',
        type: 'folder',
        path: '/Documents',
        updatedAt: '2026-09-04',
        children: [
          {
            id: 'doc-budget',
            name: 'Quarterly_Budget.csv',
            type: 'file',
            path: '/Documents/Quarterly_Budget.csv',
            size: '340 B',
            updatedAt: '2026-09-04',
            content: `Category,Q1 Budget,Q1 Actual,Variance,Status
Kernel Dev,$45000,$42500,$2500,On Target
LLVM Backend,$38000,$37200,$800,On Target
GUI & Shell,$28000,$29100,-$1100,Review
VFS Engine,$22000,$19800,$2200,Under Budget
Cloud Hosting,$12000,$11400,$600,On Target
Total,$145000,$140000,$5000,Healthy`
          },
          {
            id: 'doc-spec',
            name: 'Rocket_2.1_Specification.pdf',
            type: 'file',
            path: '/Documents/Rocket_2.1_Specification.pdf',
            size: '12 KB',
            updatedAt: '2026-09-04',
            content: `Rocket 2.1 Language Specification & Runtime ABI v1
Author: RyanEid06 / Rocket Research
Compiler: rocketc (LLVM 22.1.6 Backend)
Architecture: Deterministic ARC + Atomic Graph Promotion`
          },
          {
            id: 'doc-notes',
            name: 'Sprint_Goals.md',
            type: 'file',
            path: '/Documents/Sprint_Goals.md',
            size: '420 B',
            updatedAt: '2026-09-04',
            content: `# RocketOS Sprint Goals & Work Plan

## Deliverables
- [x] Command Palette with spotlight launcher
- [x] Lightweight Office Spreadsheet & Docs
- [x] Spacebar Quick Look peek engine
- [x] Window Snapping & Workspace Tiling
- [x] Notification Center & Focus DND mode
- [x] Dual-Engine Programmer & Scientific Calculator
- [x] Snapshot Backup & Restore Center
- [x] Ambient Focus Audio Generator
`
          }
        ]
      },
      {
        id: 'downloads',
        name: 'Downloads',
        type: 'folder',
        path: '/Downloads',
        updatedAt: '2026-09-04',
        children: []
      },
      {
        id: 'pictures',
        name: 'Pictures',
        type: 'folder',
        path: '/Pictures',
        updatedAt: '2026-09-04',
        children: []
      }
    ]
  }
];
