export interface ConfigFile {
  defaultFormat?: 'markdown' | 'json';
  outputPath?: string;
  excludeLabels?: string[];
  excludeBranches?: string[];
  rateLimitThreshold?: number;
  parallelExports?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number; // in hours
  templates?: {
    pr?: string;
    commit?: string;
    issue?: string;
    release?: string;
  };
}

export interface CLIConfig extends ConfigFile {
  version: string;
  lastRun?: Date;
  tokens?: string[];
}
