// Temporary useAuth hook - will be replaced in Task 5
export const useAuth = () => {
  // For now, return mock data so the app can load
  // This will be properly implemented in the Authentication System task
  return {
    isAuthenticated: false, // Set to true for testing layout
    isLoading: false,
    user: null,
    login: async () => {},
    logout: () => {},
    register: async () => {},
  };
};