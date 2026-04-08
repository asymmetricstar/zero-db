export declare class BackupManager {
    private dbRootPath;
    private backupDir;
    private isMaintenanceMode;
    constructor(dbRootPath: string, backupDir?: string);
    setMaintenanceMode(enabled: boolean): void;
    get maintenanceMode(): boolean;
    createFullBackup(fileName: string): Promise<string>;
    restoreFullBackup(fileName: string): Promise<void>;
}
//# sourceMappingURL=backup-manager.d.ts.map