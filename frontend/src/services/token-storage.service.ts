/**
 * Secure token storage service
 * Access tokens are stored in memory (React state) for security
 * Refresh tokens are handled via httpOnly cookies on the server side
 */

interface TokenStorage {
  accessToken: string | null;
  refreshToken: string | null;
  user: {
    id: string;
    email: string;
    name: string;
  } | null;
}

class TokenStorageService {
  private storage: TokenStorage = {
    accessToken: null,
    refreshToken: null,
    user: null,
  };

  private readonly ACCESS_TOKEN_KEY = 'simple_todo_access_token';
  private readonly REFRESH_TOKEN_KEY = 'simple_todo_refresh_token';
  private readonly USER_KEY = 'simple_todo_user';

  /**
   * Set access token in memory
   */
  setAccessToken(token: string): void {
    this.storage.accessToken = token;
  }

  /**
   * Get access token from memory
   */
  getAccessToken(): string | null {
    return this.storage.accessToken;
  }

  /**
   * Set refresh token in memory
   */
  setRefreshToken(token: string): void {
    this.storage.refreshToken = token;
  }

  /**
   * Get refresh token from memory
   */
  getRefreshToken(): string | null {
    return this.storage.refreshToken;
  }

  /**
   * Set user data in memory
   */
  setUser(user: TokenStorage['user']): void {
    this.storage.user = user;
  }

  /**
   * Get user data from memory
   */
  getUser(): TokenStorage['user'] {
    return this.storage.user;
  }

  /**
   * Clear all stored data (logout)
   */
  clear(): void {
    this.storage.accessToken = null;
    this.storage.refreshToken = null;
    this.storage.user = null;
    // Also clear any potential localStorage items for safety
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Check if user is authenticated (has access token)
   */
  isAuthenticated(): boolean {
    return !!this.storage.accessToken;
  }

  /**
   * Get authorization header value
   */
  getAuthHeader(): string | null {
    const token = this.getAccessToken();
    return token ? `Bearer ${token}` : null;
  }

  /**
   * Initialize storage from localStorage on app start
   * Load tokens from localStorage to maintain login state across page refreshes
   */
  initializeFromLocalStorage(): void {
    try {
      const storedToken = localStorage.getItem(this.ACCESS_TOKEN_KEY);
      const storedRefreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
      const storedUser = localStorage.getItem(this.USER_KEY);
      
      if (storedToken && storedUser) {
        this.storage.accessToken = storedToken;
        this.storage.user = JSON.parse(storedUser);
        
        if (storedRefreshToken) {
          this.storage.refreshToken = storedRefreshToken;
        }
        
        console.log('✅ Auth state loaded from localStorage');
      }
    } catch (error) {
      console.warn('Failed to initialize from localStorage:', error);
      this.clear();
    }
  }

  /**
   * Persist to localStorage to keep user logged in
   */
  persistToLocalStorage(): void {
    try {
      if (this.storage.accessToken) {
        localStorage.setItem(this.ACCESS_TOKEN_KEY, this.storage.accessToken);
        console.log('✅ Access token persisted to localStorage');
      }
      if (this.storage.refreshToken) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, this.storage.refreshToken);
        console.log('✅ Refresh token persisted to localStorage');
      }
      if (this.storage.user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(this.storage.user));
        console.log('✅ User data persisted to localStorage');
      }
    } catch (error) {
      console.warn('Failed to persist to localStorage:', error);
    }
  }
}

// Export singleton instance
export const tokenStorage = new TokenStorageService();