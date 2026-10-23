export interface AdminEnvConfig {
  apiBaseUrl: string;
  appEnv: 'development' | 'production' | 'test';
}

export const adminEnv: AdminEnvConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  appEnv: (import.meta.env.MODE as 'development' | 'production' | 'test') || 'development'
};
