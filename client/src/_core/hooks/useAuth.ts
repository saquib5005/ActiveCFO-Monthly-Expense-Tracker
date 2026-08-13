type TemplateUser = { name?: string | null; email?: string | null };
type NoAuthState = {
  user: TemplateUser | null;
  loading: boolean;
  error: null;
  isAuthenticated: boolean;
  refresh: () => Promise<undefined>;
  logout: () => Promise<undefined>;
};

// ActiveCFO intentionally has no authentication or login flow.
// This compatibility hook is retained only because it is part of the full-stack template.
export function useAuth(): NoAuthState {
  const user = null as TemplateUser | null;
  return {
    user,
    loading: false,
    error: null,
    isAuthenticated: false,
    refresh: async () => undefined,
    logout: async () => undefined,
  };
}
