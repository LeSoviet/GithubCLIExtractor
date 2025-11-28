declare global {
  interface Window {
    electronAPI: {
      getRepositories: () => Promise<Array<{ owner: string; name: string; fullName: string }>>;
      getContributors: (repoOwner: string, repoName: string) => Promise<string[]>;
      exportData: (options: {
        repository: { owner: string; name: string };
        exportTypes: string[];
        format: string;
        dateFilter?: {
          type: 'last-week' | 'last-month' | 'custom';
          from?: string;
          to?: string;
        };
        userFilter?: string;
        outputPath: string;
        generateAnalytics?: boolean;
      }) => Promise<any>;
      selectFolder: () => Promise<string | null>;
      openFolder: (path: string) => Promise<void>;
      onExportProgress: (callback: (data: any) => void) => void;
      onExportComplete: (callback: (data: any) => void) => void;
      onExportError: (callback: (error: string) => void) => void;
      send: (channel: string, ...args: any[]) => void;
    };
  }
}

export {};
