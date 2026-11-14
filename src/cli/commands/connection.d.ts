/**
 * Connection commands: open a root folder, switch database, sign in/out and
 * inspect the session.
 */
/** Open a database root folder chosen by path. */
export declare function connectCommand(argv: string[]): Promise<void>;
/** Select a database inside the open root. */
export declare function useCommand(argv: string[]): Promise<void>;
/** Sign in with a database user, or with --admin as the SystemAdmin. */
export declare function loginCommand(argv: string[]): Promise<void>;
export declare function logoutCommand(_argv: string[]): void;
/** Connection, session and cache details. */
export declare function statusCommand(argv: string[]): void;
//# sourceMappingURL=connection.d.ts.map