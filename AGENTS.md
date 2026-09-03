# Rocket Programming Language (rocketc) Reference

Authoritative reference for writing code in the **Rocket programming language** (`.rocket`), directly based on the compiler and standard library specification from [RyanEid06/Rocket](https://github.com/RyanEid06/Rocket).

---

## 1. Toolchain & Language Overview

- **Language Name**: Rocket (Current Specification: 2.1 / Frozen 2.0 ABI v1)
- **Repository**: [RyanEid06/Rocket](https://github.com/RyanEid06/Rocket)
- **Compiler**: `rocketc` (self-hosted compiler in Rocket, with LLVM 22.1.6 backend and stage0 C++ bootstrap)
- **Runtime**: ABI v1 (deterministic, thread-confined ARC + atomic graph promotion, safe collections, owned UTF-8 strings)
- **File Extension**: `.rocket`
- **Entry Point**: `fn main() -> Int:` returning `0` as the process exit status.

---

## 2. Grammar & Lexical Rules

### Blocks, Indentation & Comments
- **Indentation**: Strict **4 spaces**. Tabs are forbidden (`"tabs are not allowed; use spaces"` diagnostic).
- **Block Delimiter**: Blocks begin after a colon `:` followed by an indented line.
- **Comments**: Single-line comments start with `#` (e.g. `# this is a comment`).
- **Top-Level Declarations**: Only `import`, `struct`, `enum`, `trait`, `impl`, `const`, `fn`, `pub`, and `unsafe:` declarations are valid at top level.

### Variables & Mutability
- **Immutable binding**: `let name = value` or `let name: Type = value`
- **Mutable binding**: `var name = value` or `var name: Type = value`
- **No `null`**: Absence is represented using `Option[T]`.
- **No exceptions**: Errors are represented using `Result[T, E]`.

### Built-in Types
- **Primitives**:
  - `Int`: Signed 64-bit integer. Arithmetic overflow and divide-by-zero produce runtime diagnostics instead of wrapping.
  - `Float`: IEEE 754 64-bit floating point (`binary64`). No implicit conversions between `Int` and `Float`.
  - `Bool`: `true` or `false`.
  - `Char`: Single byte character enclosed in single quotes `'a'`, supporting escapes `\n`, `\r`, `\t`, `\\`, `\'`.
  - `String`: Owned, immutable sequence of valid UTF-8 bytes with explicit length tracking (embedded `\0` allowed). Double quotes `"..."` with escapes `\n`, `\r`, `\t`, `\\`, `\"`.
  - `Unit`: Void-like unit type for functions without return values (`return` or falling off the end).
- **Compound & Collections**:
  - `Array[T]`: e.g. `[1, 2, 3]`. Copy-on-write value semantics. Mutable `var` bindings support indexed assignment `scores[1] = 99`.
  - `Slice[T]`: Retained view into an array range, e.g. `values[1..3]`.
  - `Option[T]`: `Some(value)` or `None()`.
  - `Result[T, E]`: `Ok(value)` or `Err(error)`.
  - `Weak[T]`: Non-owning weak reference via `std.ownership`.
  - `UniqueBuffer[T]`: Move-only buffer via `std.buffer`.
  - `Task[T]`: Concurrency task handle via `async fn` and `std.task`.

### Operators & Precedence
- **Logical**: `and`, `or`, `not` (require `Bool` operands; `and` and `or` short-circuit).
- **Comparison**: `==`, `!=`, `<`, `<=`, `>`, `>=`.
- **Arithmetic**: `+`, `-`, `*`, `/`.
- **Range**: `0..10` (half-open, excludes upper bound).
- **Error Propagation**: Postfix `?` operator unpacks `Ok(val)` or returns early on `Err(err)` (or `Some`/`None`).

---

## 3. Declarations & Syntax Patterns

### Functions & Visibility
```rocket
pub fn add(left: Int, right: Int) -> Int:
    return left + right

fn parse_and_increment(text: String) -> Result[Int, String]:
    let value = string.parse_int(text)?
    return Ok(value + 1)

fn main() -> Int:
    let result = add(20, 22)
    print(result)
    return 0
```

### Structs & Generics
```rocket
struct Point:
    x: Int
    y: Int

struct Pair[T]:
    first: T
    second: T

# Instantiation:
let p = Point(10, 20)
let pair = Pair("key", 100)
```

### Enums & Pattern Matching
```rocket
enum Message:
    Number(Int)
    Text(String)
    Empty

fn handle_message(msg: Message) -> Unit:
    match msg:
        case Number(n):
            print(n)
        case Text(s):
            print(s)
        case Empty:
            print("empty")
```

### Control Flow
```rocket
# If / Else If / Else
if score >= 90:
    print("A")
else if score >= 80:
    print("B")
else:
    print("C")

# While loop
while count < 10:
    count = count + 1

# For range loop
for index in 0..10:
    if index == 5:
        continue
    if index == 8:
        break
    print(index)

# For collection loop
for item in items:
    print(item)
```

### Traits & Implementations
```rocket
trait Summary:
    fn summarize(self) -> String

impl Summary for Point:
    fn summarize(self) -> String:
        return "Point(" + string.from_int(self.x) + ", " + string.from_int(self.y) + ")"
```

### Async & Concurrency
```rocket
import std.task
import std.sync

async fn fetch_count(source: String) -> Result[Int, String]:
    return Ok(42)

fn run_worker() -> Int:
    let pending = fetch_count("db")
    match task.join(pending):
        case Ok(count):
            print(count)
        case Err(err):
            print(err)
            return 1
    return 0
```

### Unsafe & Native FFI
```rocket
unsafe:
    extern fn puts(str: String) -> Int
    export fn native_callback(code: Int) -> Unit
```

---

## 4. Standard Library Reference (`std.*`)

1. **`std.string`**:
   - `string.from_int(value: Int) -> String`
   - `string.parse_int(value: String) -> Result[Int, String]`
   - `string.byte_length(value: String) -> Int`
   - `string.concat(left: String, right: String) -> String`
   - `string.contains(value: String, needle: String) -> Bool`
   - `string.starts_with(value: String, prefix: String) -> Bool`
   - `string.ends_with(value: String, suffix: String) -> Bool`
   - `string.trim(value: String) -> String`
   - `string.split(value: String, delimiter: String) -> Array[String]`
   - `string.slice(value: String, start: Int, end: Int) -> String`
   - `string.builder() -> Builder`, `string.builder_append(b, str)`, `string.builder_finish(b) -> String`

2. **`std.collections`**:
   - `collections.length[T](values: Array[T]) -> Int`
   - `collections.slice_length[T](values: Slice[T]) -> Int`
   - `collections.append[T](values: Array[T], value: T) -> Array[T]`
   - `collections.pop[T](values: Array[T]) -> Option[Pop[T]]`
   - `collections.reverse[T](values: Array[T]) -> Array[T]`
   - `collections.concat[T](left: Array[T], right: Array[T]) -> Array[T]`
   - `collections.join(values: Array[String], sep: String) -> String`
   - `collections.map_from_arrays[K, V](keys, values) -> Map[K, V]`
   - `collections.map_get[K, V](map, key) -> Option[V]`
   - `collections.set_from_array[T](values) -> Set[T]`
   - `collections.set_contains[T](set, val) -> Bool`
   - *Dot notation supported on Array / Map / Set* (e.g. `arr.length()`, `arr.append(val)`, `map.get(key)`).

3. **`std.binary`**:
   - `ByteBuffer` wrapper around arbitrary bytes.
   - `from_string`, `to_string`, `length`, `slice`, `read_u8`, `read_u16_le`, `read_u32_le`, `write_u8`, `write_u16_le`, `write_u32_le`.

4. **`std.file` & `std.path`**:
   - File reading, writing, status, existence checks, directory traversal, canonicalization.

5. **`std.json` & `std.csv`**:
   - Structured parsing and serialization.

6. **`std.math`**:
   - `sqrt`, `abs`, `min`, `max`, `round`, `sin`, `cos`, `tan`.

7. **`std.time`**:
   - `now_iso()`, `timestamp_ms()`, `monotonic_seconds()`.

8. **`std.task` & `std.sync`**:
   - Asynchronous task coordination, `task.join`, `once_empty`, `once_set`, `once_get`, channels, mutexes.

9. **`std.testing`**:
   - `assert(Bool, String) -> Result[Bool, String]`
   - `equal_int(expected: Int, actual: Int, message: String) -> Result[Bool, String]`
   - `equal_string(expected: String, actual: String, message: String) -> Result[Bool, String]`

10. **`rocket.motion` & `rocket.raylib`**:
    - Smooth UI easing curves (`ease_in_cubic`, `ease_out_cubic`, `ease_in_out_cubic`).
    - Safe 2D graphics primitive wrappers (`draw_rectangle`, `draw_circle`, `draw_line`, `draw_bezier`).
