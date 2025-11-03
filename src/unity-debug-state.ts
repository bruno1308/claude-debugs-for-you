import * as vscode from 'vscode';

/**
 * Represents the current state of a Unity debug session
 */
export interface UnityDebugState {
    isPaused: boolean;
    activeThreadId: number | null;
    stopReason: string | null;
    canEvaluate: boolean;
    threads: Array<{ id: number; name: string }>;
    currentFile?: string;
    currentLine?: number;
}

/**
 * Thread information from Unity
 */
interface ThreadInfo {
    id: number;
    name: string;
}

/**
 * Manages state for Unity debug sessions
 * Tracks execution state, active threads, and provides validation for operations
 */
export class UnityDebugStateManager {
    private isPaused: boolean = false;
    private activeThreadId: number | null = null;
    private lastStopReason: string | null = null;
    private threads: Map<number, string> = new Map();
    private currentFile: string | null = null;
    private currentLine: number | null = null;
    private session: vscode.DebugSession | null = null;

    constructor() {
        this.setupEventListeners();
    }

    /**
     * Setup listeners for VS Code debug events
     */
    private setupEventListeners(): void {
        // Listen for debug session start
        vscode.debug.onDidStartDebugSession((session) => {
            if (session.type === 'vstuc') {
                console.log(`[Unity Debug] Session started: ${session.name}`);
                this.session = session;
                this.reset();
            }
        });

        // Listen for debug session termination
        vscode.debug.onDidTerminateDebugSession((session) => {
            if (session.type === 'vstuc') {
                console.log(`[Unity Debug] Session terminated: ${session.name}`);
                this.reset();
                this.session = null;
            }
        });

        // Listen for active stack frame changes (indicates stopped state)
        vscode.debug.onDidChangeActiveStackItem((stackItem) => {
            if (this.session && stackItem instanceof vscode.DebugStackFrame) {
                this.handleStopped(stackItem);
            }
        });
    }

    /**
     * Handle the debugger stopped event
     */
    private async handleStopped(stackFrame: vscode.DebugStackFrame): Promise<void> {
        this.isPaused = true;
        this.activeThreadId = stackFrame.threadId;
        this.lastStopReason = 'breakpoint'; // We can refine this later

        console.log(`[Unity Debug] Paused: thread=${this.activeThreadId}`);

        // Refresh thread list
        await this.refreshThreads();
    }

    /**
     * Handle the debugger continued event
     * Called manually after continue operation
     */
    public handleContinued(): void {
        this.isPaused = false;
        this.activeThreadId = null;
        this.lastStopReason = null;
        this.currentFile = null;
        this.currentLine = null;
        console.log(`[Unity Debug] Resumed`);
    }

    /**
     * Refresh the list of threads from the debug session
     */
    private async refreshThreads(): Promise<void> {
        if (!this.session) {
            return;
        }

        try {
            const response = await this.session.customRequest('threads');
            if (response && response.threads) {
                this.threads.clear();
                for (const thread of response.threads) {
                    this.threads.set(thread.id, thread.name);
                }
                console.log(`[Unity Debug] Refreshed ${this.threads.size} threads`);
            }
        } catch (err) {
            console.error('[Unity Debug] Failed to refresh threads:', err);
        }
    }

    /**
     * Reset all state
     */
    private reset(): void {
        this.isPaused = false;
        this.activeThreadId = null;
        this.lastStopReason = null;
        this.threads.clear();
        this.currentFile = null;
        this.currentLine = null;
    }

    /**
     * Get the current debug state
     */
    public getState(): UnityDebugState {
        return {
            isPaused: this.isPaused,
            activeThreadId: this.activeThreadId,
            stopReason: this.lastStopReason,
            canEvaluate: this.isPaused,
            threads: Array.from(this.threads.entries()).map(([id, name]) => ({ id, name })),
            currentFile: this.currentFile || undefined,
            currentLine: this.currentLine || undefined,
        };
    }

    /**
     * Get the active thread ID, or null if not paused
     */
    public getActiveThreadId(): number | null {
        return this.activeThreadId;
    }

    /**
     * Check if the debugger is currently paused
     */
    public getIsPaused(): boolean {
        return this.isPaused;
    }

    /**
     * Validate that we can perform an evaluation
     * @throws Error if not in a valid state for evaluation
     */
    public validateCanEvaluate(): void {
        if (!this.isPaused) {
            throw new Error(
                'Cannot evaluate - debugger is not paused. ' +
                'Wait for a breakpoint to be hit or use the continue command to reach one.'
            );
        }

        if (!this.activeThreadId) {
            throw new Error(
                'No active thread available. Debugger may not be properly attached.'
            );
        }
    }

    /**
     * Validate that a thread ID is valid
     * @param threadId The thread ID to validate
     * @throws Error if the thread is not valid
     */
    public validateThread(threadId: number): void {
        if (!this.threads.has(threadId)) {
            const validThreadIds = Array.from(this.threads.keys()).join(', ');
            throw new Error(
                `Thread ${threadId} is not valid. ` +
                `Valid thread IDs: ${validThreadIds || 'none available'}`
            );
        }
    }

    /**
     * Get a thread ID for an operation
     * - If threadId is provided, validate and return it
     * - If not provided, return the active thread ID
     * @param threadId Optional thread ID
     * @returns A valid thread ID
     * @throws Error if no valid thread ID is available
     */
    public getThreadIdForOperation(threadId?: number): number {
        if (threadId !== undefined) {
            this.validateThread(threadId);
            return threadId;
        }

        if (!this.activeThreadId) {
            throw new Error(
                'No thread ID specified and no active thread available. ' +
                'Please specify a thread ID explicitly.'
            );
        }

        return this.activeThreadId;
    }

    /**
     * Update the paused state manually (for continue operations)
     */
    public setPaused(paused: boolean): void {
        this.isPaused = paused;
        if (!paused) {
            this.handleContinued();
        }
    }

    /**
     * Check if there's an active debug session
     */
    public hasActiveSession(): boolean {
        return this.session !== null && vscode.debug.activeDebugSession !== undefined;
    }

    /**
     * Get the current debug session
     */
    public getSession(): vscode.DebugSession | null {
        return this.session;
    }
}
