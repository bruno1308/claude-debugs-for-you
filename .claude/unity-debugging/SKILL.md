---
name: unity-debugging-with-mcp
description: Critical workflow for debugging Unity code using MCP debug tools. Always verify source code before evaluating variables to prevent assumptions and errors.
---

# Unity Debugging Skill Guide

## ⚠️ CRITICAL RULE: NEVER ASSUME VARIABLE NAMES

**Before evaluating ANY expression, you MUST verify field names from source code.**

Making assumptions about field names (like assuming `health` instead of `currentHealth`) will cause evaluation failures and waste the user's time. Always check first, evaluate second.

## Mandatory Workflow

### Phase 1: Understand the Codebase (ALWAYS DO THIS FIRST)

1. **List relevant files**
   ```
   Use: debug:listFiles with appropriate patterns
   Purpose: Find the source files you need to inspect
   ```

2. **Read source code** 
   ```
   Use: debug:getFileContent on relevant files
   Purpose: Understand actual class structure, field names, and types
   Note: Read line numbers carefully for accurate breakpoint placement
   ```

3. **Document what you learned**
   - Note exact field names (including capitalization)
   - Note public vs private fields
   - Identify key methods for potential breakpoints

### Phase 2: Set Up Debugging

1. **Choose strategic breakpoints**
   - Method entry points (see logic flow start)
   - Decision points (if/else, switch statements)
   - Loop boundaries (to catch iterations)
   - Before/after critical operations

2. **Set breakpoints**
   ```
   Use: debug:debug with type: "setBreakpoint"
   Provide: exact file path and line number from getFileContent
   ```

3. **Launch debugger**
   ```
   Use: debug:debug with type: "launch"
   Note: This brings execution to first breakpoint
   Do NOT use "continue" to reach first breakpoint
   ```

### Phase 3: Inspect State at Breakpoint

1. **Verify you're still looking at correct source**
   - If inspecting a new class/object, read its source first
   - Don't rely on memory or assumptions

2. **Evaluate variables using verified names**
   ```
   Use: debug:debug with type: "evaluate"
   Use EXACT field names from source code
   ```

3. **Build understanding progressively**
   - Start with simple values (primitives, counts)
   - Then inspect object properties
   - Then look at collections/complex structures

### Phase 4: Continue Execution

1. **Use "continue" to proceed**
   ```
   Use: debug:debug with type: "continue"
   Only use when ready to advance to next breakpoint
   ```

2. **Repeat inspection at each breakpoint**

## Common Patterns & Examples

### ✅ CORRECT: Verify then Evaluate

```
Step 1: debug:listFiles to find MonsterInstance.cs
Step 2: debug:getFileContent on MonsterInstance.cs
Step 3: Note that fields are: currentHealth, maxHealth, attack, defense
Step 4: debug:debug evaluate "monster.currentHealth"
```

### ❌ WRONG: Assume and Fail

```
Step 1: debug:debug evaluate "monster.health"  // FAILS - assumed wrong name
```

### ✅ CORRECT: Inspect Object Structure

```
// Want to know about a monster's state
1. listFiles pattern: "**/MonsterInstance.cs"
2. getFileContent to see: currentHealth, maxHealth, isAlive, team, etc.
3. Evaluate: monster.currentHealth, monster.team, monster.isAlive
```

### ✅ CORRECT: Inspect Collection Elements

```
// Want to inspect first element of a list
1. First check list exists: evaluate "myList.Count"
2. Find the element's class file with listFiles
3. Read the class definition with getFileContent
4. Evaluate specific fields: "myList[0].verifiedFieldName"
```

## Debugging Strategy Tips

### Understanding Execution Flow
- Set breakpoints at method entry to understand call order
- Set breakpoints at loop starts to track iterations
- Set breakpoints before and after state changes

### Investigating Bugs
1. Identify the failing operation from error messages
2. Find the relevant source file
3. Read the code to understand expected behavior
4. Set breakpoints at decision points
5. Evaluate variables to find where expectations diverge from reality

### Performance Investigation
- Set breakpoints in frequently-called methods
- Evaluate collection sizes to identify growth issues
- Check iteration counts in loops

## Field Naming Conventions to Watch For

Different codebases use different conventions. NEVER assume:

- ❌ `health` might be `currentHealth`, `hp`, `hitPoints`, `healthPoints`
- ❌ `name` might be `monsterName`, `archetypeName`, `displayName`
- ❌ `id` might be `instanceId`, `entityId`, `objectId`, `uniqueId`
- ❌ `isActive` might be `isAlive`, `active`, `enabled`, `isEnabled`

**Always verify from source code.**

## Error Recovery

If an evaluate operation fails:

1. **Don't guess alternative names** - read the source
2. Use `debug:getFileContent` on the object's class
3. Find the correct field name
4. Try evaluation again with verified name

## Multiple Object Types

When debugging code that works with multiple types:

```
// If evaluating: someCollection[0].field
1. Check what type someCollection holds (from context or earlier code)
2. Find that type's source file
3. Read the definition
4. Use exact field names
```

## Unity-Specific Debugging Notes

### Unity MCP Tools Available
- `debug:listFiles` - List all files in workspace
- `debug:getFileContent` - Get file content with line numbers
- `debug:debug` - Execute debug plan (set breakpoints, launch, continue, evaluate)
- `unityMCP:*` - Various Unity-specific operations

### Common Unity Patterns
- MonoBehaviour lifecycle methods (Start, Update, FixedUpdate)
- Coroutines and yield statements
- Unity API calls (GameObject.Find, GetComponent, etc.)

### Unity Debugging Tips
- Set breakpoints in Update loops carefully (they fire every frame)
- Use conditional breakpoints for specific frame conditions
- Inspect transform.position, gameObject.activeInHierarchy, etc.

## Checklist Before Every Evaluation

- [ ] Have I read the source file for this object's class?
- [ ] Do I know the exact field name (including case)?
- [ ] Am I using the field name from the source, not my assumption?
- [ ] If this is the first time touching this class, did I inspect it first?

## Remember

**Reading source code is not optional.** It's the first and most critical step. Taking 30 seconds to verify field names prevents evaluation failures and builds user trust in the debugging tool.

**When in doubt, read the source. When certain, still read the source.**