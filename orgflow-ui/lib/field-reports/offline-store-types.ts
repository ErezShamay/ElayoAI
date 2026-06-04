export type OfflinePrepBundle = {
  organization_id: string;
  offline_max_days: number;
  prepared_at: string;
  expires_at: string;
  catalog_version?: string | null;
  catalog: unknown;
  visit_types: unknown[];
  organization_profile: unknown;
  projects: unknown[];
  reports: unknown[];
};
