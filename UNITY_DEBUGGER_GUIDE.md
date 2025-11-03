# Unity-Specialized MCP Debugger

## Overview

This MCP debugger has been enhanced with Unity-specific features to enable autonomous debugging of Unity projects. The key improvements solve the critical problem where the MCP client was "flying blind" - unable to know the debug execution state, leading to crashes.

## What's New

### 1. Unity Debug State Manager (`src/unity-debug-state.ts`)

A new state management system that tracks:
- **Execution state**: Whether the debugger is paused or running
- **Active thread**: Which thread is currently stopped (critical for Unity's multi-threaded environment)
- **Stop reason**: Why execution paused (breakpoint, exception, etc.)
- **Thread list**: All available threads with their IDs and names
- **Current location**: File and line information when paused

### 2. DAP Event Listeners

The state manager automatically listens to VS Code debug events:
- `onDidStartDebugSession`: Detects when Unity debugging starts
- `onDidTerminateDebugSession`: Cleans up when debugging ends
- `onDidChangeActiveStackItem`: Tracks when execution pauses at breakpoints

### 3. New MCP Command: `getState`

Claude can now query the current debug state:

```javascript
{
  "type": "getState",
  "file": ""  // Required by schema but not used for getState
}
```

**Response:**
```json
{
  "isPaused": true,
  "activeThreadId": 2022017712,
  "stopReason": "breakpoint",
  "canEvaluate": true,
  "threads": [
    {"id": 2022017712, "name": "Main Thread"},
    {"id": 701547712, "name": "Worker Thread"}
  ]
}
```

### 4. Enhanced Commands

#### `continue` - Auto-inject Thread ID
- Automatically uses the active thread if no threadId is specified
- Falls back to first available thread if needed
- Updates state to "running" after continue
- Better error handling

**Before:**
```javascript
// Had to manually specify threadId
{"type": "continue", "file": "", "threadId": 2022017712}
```

**Now:**
```javascript
// Auto-injects the active thread
{"type": "continue", "file": ""}
```

#### `evaluate` - State Validation
- Validates that debugger is paused before evaluating
- Auto-injects correct threadId for stack trace requests
- Prevents crashes from evaluating while running
- Clear error messages when in invalid state

**Error Prevention:**
```
Before: InvalidOperationException - crashes entire debug session
Now: "Cannot evaluate - debugger is not paused. Wait for a breakpoint..."
```

### 5. Thread ID Auto-Injection

All commands that need a threadId now automatically use the active thread:
- `continue`: Uses last stopped thread
- `evaluate`: Uses active thread for stack trace lookups

This prevents the crashes caused by using invalid thread IDs.

## Usage Examples

### Example 1: Basic Debugging Workflow

```javascript
// 1. Set a breakpoint
{
  "type": "setBreakpoint",
  "file": "C:\\Unity\\MyProject\\BattleSimulation.cs",
  "line": 109
}

// 2. Launch the debugger
{
  "type": "launch",
  "file": "C:\\Unity\\MyProject\\BattleSimulation.cs"
}

// 3. Check state (after breakpoint is hit)
{
  "type": "getState",
  "file": ""
}
// Returns: {"isPaused": true, "activeThreadId": 2022017712, ...}

// 4. Evaluate an expression (state manager validates we're paused)
{
  "type": "evaluate",
  "file": "",
  "expression": "playerArchetype.archetypeName"
}
// Returns: "Evaluated \"playerArchetype.archetypeName\": \"Support\""

// 5. Continue execution (auto-injects threadId)
{
  "type": "continue",
  "file": ""
}
```

### Example 2: Handling Errors Gracefully

```javascript
// Trying to evaluate while running (prevented crash)
{
  "type": "evaluate",
  "file": "",
  "expression": "currentTick"
}

// OLD behavior: InvalidOperationException - debug session crashes
// NEW behavior: Returns error message:
// "ERROR: Cannot evaluate - debugger is not paused. Wait for a breakpoint..."
```

### Example 3: Multi-threaded Debugging

```javascript
// Check available threads
{
  "type": "getState",
  "file": ""
}
// Returns: {"threads": [{"id": 123, "name": "Main"}, {"id": 456, "name": "Worker"}]}

// Evaluate on specific thread (if needed)
{
  "type": "evaluate",
  "file": "",
  "expression": "someVariable",
  "threadId": 456
}

// Or let it auto-inject the active thread
{
  "type": "evaluate",
  "file": "",
  "expression": "someVariable"
}
```

## Autonomous Debugging Flow

The enhanced debugger enables Claude to debug autonomously:

1. **Launch**: Start Unity debugging session
2. **Set Breakpoints**: Place breakpoints in relevant code
3. **Query State**: Check if execution has paused
4. **Evaluate**: Inspect variables when paused (validated automatically)
5. **Continue**: Resume execution (thread ID auto-injected)
6. **Repeat**: Loop through breakpoints

**No crashes, no manual intervention needed!**

## Technical Details

### State Manager Architecture

The `UnityDebugStateManager` class:
- Singleton per debug server instance
- Listens to VS Code debug events passively
- Maintains internal state machine
- Provides validation methods for operations
- Auto-updates on debug events

### Error Handling

All debug operations are wrapped in try-catch blocks:
- Evaluation errors don't crash the session
- Invalid state operations return clear error messages
- Thread validation prevents invalid operations
- Errors are logged to console for debugging

### Thread ID Resolution

Priority order for thread ID resolution:
1. Explicitly provided `threadId` parameter
2. Active thread from state manager (last stopped thread)
3. Fallback to first available thread (continue command only)

### VS Code Integration

The state manager integrates with VS Code's debug API:
- `vscode.debug.onDidStartDebugSession`: Session lifecycle
- `vscode.debug.onDidChangeActiveStackItem`: Pause detection
- `vscode.debug.activeDebugSession`: Current session reference

## Limitations & Future Enhancements

### Current Limitations
1. **No real-time event notifications**: MCP client must poll `getState` to detect breakpoint hits
2. **Single session**: Only tracks one Unity debug session at a time
3. **Basic stop reason**: Always reports "breakpoint" (could be refined)

### Potential Enhancements (Phase 3)
1. **`waitForBreakpoint` command**: Block until execution pauses
2. **Event queue**: Store recent debug events for polling
3. **Enhanced stop reasons**: Differentiate breakpoints, exceptions, step operations
4. **Multiple session support**: Track multiple Unity instances

## Comparison: Before vs After

| Feature | Before | After |
|---------|--------|-------|
| **State awareness** | ❌ Blind - no idea if paused | ✅ Can query state anytime |
| **Thread handling** | ❌ Hardcoded threadId: 1 | ✅ Auto-inject correct thread |
| **Evaluate safety** | ❌ Crashes if not paused | ✅ Validates before evaluating |
| **Error handling** | ❌ Crashes entire session | ✅ Returns error, continues |
| **Autonomous debugging** | ❌ Impossible | ✅ Fully possible |

## Files Modified

1. **`src/unity-debug-state.ts`** (NEW)
   - Unity state manager class
   - Event listeners and validation

2. **`src/debug-server.ts`**
   - Import state manager
   - Update `continue` command
   - Update `evaluate` command
   - Add `getState` command
   - Add try-catch error handling

3. **`mcp/src/index.ts`**
   - Add `getState` to command enum
   - Add `threadId` parameter to schema

## Testing Recommendations

### Manual Testing
1. Launch Unity debugger with VSTUC
2. Set breakpoint in Unity C# code
3. Use MCP client to:
   - Query state before/after breakpoint
   - Evaluate expressions at breakpoint
   - Continue execution
4. Verify no crashes occur

### Test Cases
- ✅ Evaluate while paused (should work)
- ✅ Evaluate while running (should return error, not crash)
- ✅ Continue without threadId (should auto-inject)
- ✅ GetState at any time (should return current state)
- ✅ Multiple continue/evaluate cycles (should remain stable)

## Troubleshooting

### "Cannot evaluate - debugger is not paused"
**Cause**: Trying to evaluate while Unity is running
**Solution**: Use `getState` to check `isPaused`, wait for breakpoint to hit

### "No active thread available"
**Cause**: Debug session not properly attached or no threads running
**Solution**: Check that Unity is in Play mode and debugger is attached

### "Thread X is not valid"
**Cause**: Specified threadId doesn't exist
**Solution**: Use `getState` to see available threads, or omit threadId to auto-inject

### State seems incorrect
**Cause**: State manager hasn't received events yet
**Solution**: Wait a moment after launch for events to propagate, or trigger a breakpoint

## Conclusion

The Unity-specialized MCP debugger transforms the debugging experience from crash-prone and manual to stable and autonomous. Claude can now:

✅ Know when execution is paused
✅ Evaluate expressions safely
✅ Handle multiple threads correctly
✅ Recover from errors gracefully
✅ Debug Unity projects end-to-end without human intervention

This enables true autonomous debugging workflows for Unity development!
