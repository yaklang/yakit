# Yak Virtual Machine

## Bytecode Instruction Set Specification

| Mnemonic | Operand Count | Operand 1 | Operand 2 | Description |
|----------|---------------|-----------|-----------|-------------|
| **Type Operations** |
| type-cast | 2 | - | - | Type conversion: pops two values from the stack (first is the target type, second is the value to convert), performs type conversion, and pushes the result |
| type | 2 | - | - | Constructs a data type from two type values popped from the stack |
| make | N | argument count | - | Creates a new value of specified type; pops N arguments from the stack according to operand count and pushes the constructed value |
| **Unary Operators** |
| bang | 1 | - | - | Logical NOT operator (`!`): pops one value, computes logical negation, pushes result |
| neg | 1 | - | - | Unary minus (`-`): pops one value, computes arithmetic negation, pushes result |
| plus | 1 | - | - | Unary plus (`+`): pops one value, computes identity operation, pushes result |
| chan-recv | 1 | - | - | Channel receive (`<-`): pops a channel, receives a value from it, pushes the received value |
| **Binary Operators** |
| shl | 2 | - | - | Bitwise left shift (`<<`): pops two values (right then left operand), computes shift, pushes result |
| shr | 2 | - | - | Bitwise right shift (`>>`): pops two values (right then left operand), computes shift, pushes result |
| and | 2 | - | - | Bitwise AND (`&`): pops two values, computes bitwise AND, pushes result |
| and-not | 2 | - | - | Bitwise AND-NOT (`&^`): pops two values, computes bitwise AND-NOT, pushes result |
| or | 2 | - | - | Bitwise OR (`|`): pops two values, computes bitwise OR, pushes result |
| xor | 2 | - | - | Bitwise XOR (`^`): pops two values, computes bitwise XOR, pushes result |
| add | 2 | - | - | Addition (`+`): pops two values (right then left operand), computes sum, pushes result |
| sub | 2 | - | - | Subtraction (`-`): pops two values (right then left operand), computes difference, pushes result |
| mul | 2 | - | - | Multiplication (`*`): pops two values, computes product, pushes result |
| div | 2 | - | - | Division (`/`): pops two values, computes quotient, pushes result |
| mod | 2 | - | - | Modulo (`%`): pops two values, computes remainder, pushes result |
| gt | 2 | - | - | Greater than (`>`): pops two values, computes comparison, pushes boolean result |
| lt | 2 | - | - | Less than (`<`): pops two values, computes comparison, pushes boolean result |
| gt-eq | 2 | - | - | Greater than or equal (`>=`): pops two values, computes comparison, pushes boolean result |
| lt-eq | 2 | - | - | Less than or equal (`<=`): pops two values, computes comparison, pushes boolean result |
| eq | 2 | - | - | Equality (`==`): pops two values, computes equality check, pushes boolean result |
| neq | 2 | - | - | Inequality (`!=`): pops two values, computes inequality check, pushes boolean result |
| in | 2 | - | - | Membership test (`in`): pops two values (container then element), checks membership, pushes boolean result |
| chan-send | 2 | - | - | Channel send: pops two values (channel then value), sends value to channel |
| **Assignment Operators** |
| self-add-one | 1 | - | - | Pre-increment (`++`): pops a value, increments it, pushes the result |
| self-minus-one | 1 | - | - | Pre-decrement (`--`): pops a value, decrements it, pushes the result |
| self-plus-eq | 2 | - | - | Addition assignment (`+=`): pops two values (right then left operand), adds them, stores result in left operand |
| self-minus-eq | 2 | - | - | Subtraction assignment (`-=`): pops two values (right then left operand), subtracts right from left, stores result in left operand |
| self-mul-eq | 2 | - | - | Multiplication assignment (`*=`): pops two values, multiplies them, stores result in left operand |
| self-div-eq | 2 | - | - | Division assignment (`/=`): pops two values, divides left by right, stores result in left operand |
| self-mod-eq | 2 | - | - | Modulo assignment (`%=`): pops two values, computes modulo, stores result in left operand |
| self-and-eq | 2 | - | - | Bitwise AND assignment (`&=`): pops two values, computes bitwise AND, stores result in left operand |
| self-or-eq | 2 | - | - | Bitwise OR assignment (`|=`): pops two values, computes bitwise OR, stores result in left operand |
| self-xor-eq | 2 | - | - | Bitwise XOR assignment (`^=`): pops two values, computes bitwise XOR, stores result in left operand |
| self-shl-eq | 2 | - | - | Left shift assignment (`<<=`): pops two values, computes left shift, stores result in left operand |
| self-shr-eq | 2 | - | - | Right shift assignment (`>>=`): pops two values, computes right shift, stores result in left operand |
| self-and-not-eq | 2 | - | - | Bitwise AND-NOT assignment (`&^=`): pops two values, computes bitwise AND-NOT, stores result in left operand |
| **Stack Operations** |
| push | 1 | immediate value | - | Pushes an immediate value onto the stack |
| pushf | 1 | raw value | - | Pushes a fuzz-tagged value (as Slice) onto the stack |
| pushr | 1 | symbol name | - | Pushes the value bound to a symbol name onto the stack |
| pushleftr | 1 | symbol name | - | Pushes the lvalue reference of a symbol onto the stack |
| pushid | 1 | identifier name | - | Introduces an unsigned variable name into the program context (injectable from external sources) |
| pop | 0 | - | - | Pops and discards the top value from the stack |
| list | N | element count | - | Combines N values from the stack into a list/tuple structure |
| assign | 2 | - | - | Assignment operation: pops two values (right then left operand), assigns right to left |
| fast-assign | 2 | - | - | Fast assignment with result propagation: assigns right value to left lvalue and pushes the assigned value |
| **Control Flow** |
| jmp | 1 | target offset | - | Unconditional jump to specified bytecode offset |
| jmpt | 1 | target offset | - | Conditional jump (true): pops a boolean value, jumps if true |
| jmpf | 1 | target offset | - | Conditional jump (false): pops a boolean value, jumps if false |
| jmpt-or-pop | 1 | target offset | - | Peek-and-jump (true): examines top stack value without popping; jumps if true, otherwise pops the value |
| jmpf-or-pop | 1 | target offset | - | Peek-and-jump (false): examines top stack value without popping; jumps if false, otherwise pops the value |
| break | 1 | target offset | - | Terminates current loop and jumps to specified offset |
| continue | 1 | target offset | - | Skips to next iteration of current loop |
| **Loop Control** |
| range-next | 0 | - | - | Advances `for-range` loop iteration counter |
| in-next | 0 | - | - | Advances `for-in` loop iteration counter |
| enter-for-range | 1 | iteration count | - | Enters `for-range` loop context with specified iteration count |
| exit-for-range | 0 | - | - | Exits `for-range` loop context; decrements counter and continues if count > 0 |
| **Function Calls** |
| call | 1 | argument count | - | Function call: pops N arguments then the callable, invokes function, pushes return value(s) |
| callvar | 1 | argument count | - | Variadic function call: similar to `call` but handles variadic parameters |
| async-call | 0 | - | - | Asynchronous function call: non-blocking invocation of a callable |
| membercall | 0 | - | - | Member access/call: pops two values (object/struct/map then member name), accesses field or invokes method |
| iterablecall | 0 | - | - | Index-based access for iterable types (e.g., slice indexing) |
| return | 0 | - | - | Returns from current function context; pops return value(s) from stack |
| defer | 0 | - | - | Schedules bytecode sequence for execution upon current function scope exit |
| ellipsis | 0 | - | - | Variadic argument unpacking: expands a slice into individual arguments |
| **Data Structures** |
| newmap | 1 | entry count | - | Creates a map: pops 2×N values from stack (alternating key-value pairs), constructs and pushes map |
| newslice | 1 | element count | - | Creates a slice: pops N values, infers homogeneous type, constructs and pushes slice |
| typedslice | 2 | element count | type | Creates a type-constrained slice: pops N values then a type descriptor, constructs typed slice |
| **Scoping** |
| new-scope | 1 | symbol table ID | - | Enters a new lexical scope with specified symbol table identifier |
| end-scope | 0 | - | - | Exits current lexical scope, restoring previous symbol table |
| **Error Handling** |
| assert | 1 | error message | - | Assertion check: pops a boolean value; if false, panics with specified error message |
| panic | 0 | - | - | Triggers immediate runtime panic |
| recover | 0 | - | - | Recovers from panic state; pushes recovered panic value onto stack if in panic context |
| **Miscellaneous** |
| include | 0 | - | - | Includes and executes an external source file |