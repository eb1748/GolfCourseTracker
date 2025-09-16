import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { LocalStorageService } from '@/lib/localStorage';
import type { User, InsertUserForm } from '@shared/schema';

// Auth user type without password for client-side use
export interface AuthUser extends Omit<User, 'password'> {}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: InsertUserForm) => Promise<void>;
  logout: () => Promise<void>;
  syncLocalStorageData: () => Promise<void>;
  refetchUser: () => Promise<void>;
  clearError: () => void;
}

export interface UseAuthImprovedReturn extends AuthState, AuthActions {}

/**
 * Improved authentication hook with better error handling, performance optimizations,
 * and cleaner separation of concerns
 */
export function useAuthImproved(): UseAuthImprovedReturn {
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();

  // Clear error helper
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Query to check if user is already authenticated
  const {
    data: currentUser,
    isLoading,
    error: queryError,
    refetch: refetchUser
  } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (!res.ok) {
          return { user: null }; // Return null user instead of throwing
        }

        const data = await res.json();
        return data;
      } catch (err) {
        console.error('Auth check failed:', err);
        return { user: null };
      }
    },
    retry: (failureCount, error) => {
      // Only retry for network errors, not auth failures
      return failureCount < 2 && !error?.message?.includes('401');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Set initialized state after first query
  useEffect(() => {
    if (!isLoading && !isInitialized) {
      setIsInitialized(true);
    }
  }, [isLoading, isInitialized]);

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      console.error('Auth query error:', queryError);
      setError('Failed to check authentication status');
    }
  }, [queryError]);

  // Sync localStorage data helper
  const syncLocalStorageDataInternal = useCallback(async () => {
    if (LocalStorageService.hasStoredData()) {
      try {
        const localData = LocalStorageService.getCourseStatusesForSync();

        if (localData.length === 0) {
          return { syncedCount: 0, synced: [] };
        }

        const response = await apiRequest('POST', '/api/auth/sync', { courseStatuses: localData });
        const result = await response.json();

        // Clear localStorage data after successful sync
        LocalStorageService.clearAllData();

        console.log(`Synced ${result.syncedCount} course statuses to your account`);

        // Invalidate queries to refetch updated data
        queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
        queryClient.invalidateQueries({ queryKey: ['/api/users/me/stats'] });

        return result;
      } catch (error) {
        console.error('Failed to sync localStorage data:', error);
        throw error;
      }
    }
    return { syncedCount: 0, synced: [] };
  }, [queryClient]);

  // Login mutation with improved error handling
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      setError(null);
      const response = await apiRequest('POST', '/api/auth/signin', { email, password });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      return await response.json();
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(['/api/auth/me'], data);

      try {
        // Sync localStorage data after successful login
        await syncLocalStorageDataInternal();
      } catch (syncError) {
        console.warn('Failed to sync data after login:', syncError);
        // Don't fail the login for sync errors
      }

      // Invalidate all user-specific queries
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/stats'] });
    },
    onError: (error: Error) => {
      console.error('Login failed:', error);
      setError(error.message || 'Login failed. Please check your credentials.');
    },
  });

  // Signup mutation with improved error handling
  const signupMutation = useMutation({
    mutationFn: async (userData: InsertUserForm) => {
      setError(null);
      const response = await apiRequest('POST', '/api/auth/signup', userData);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Signup failed');
      }

      return await response.json();
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(['/api/auth/me'], data);

      try {
        // Sync localStorage data after successful signup
        await syncLocalStorageDataInternal();
      } catch (syncError) {
        console.warn('Failed to sync data after signup:', syncError);
        // Don't fail the signup for sync errors
      }

      // Invalidate all user-specific queries
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/stats'] });
    },
    onError: (error: Error) => {
      console.error('Signup failed:', error);
      setError(error.message || 'Signup failed. Please try again.');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const response = await apiRequest('POST', '/api/auth/signout');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Logout failed');
      }

      return await response.json();
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      // Note: We don't clear localStorage here - user might want to continue as guest
    },
    onError: (error: Error) => {
      console.error('Logout failed:', error);
      setError(error.message || 'Logout failed. Please try again.');
    },
  });

  // Sync mutation for manual data sync
  const syncMutation = useMutation({
    mutationFn: syncLocalStorageDataInternal,
    onError: (error: Error) => {
      console.error('Sync failed:', error);
      setError(error.message || 'Failed to sync data. Please try again.');
    },
  });

  // Public API functions
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    await loginMutation.mutateAsync({ email, password });
  }, [loginMutation]);

  const signup = useCallback(async (userData: InsertUserForm): Promise<void> => {
    await signupMutation.mutateAsync(userData);
  }, [signupMutation]);

  const logout = useCallback(async (): Promise<void> => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const syncLocalStorageData = useCallback(async (): Promise<void> => {
    if (!currentUser?.user) {
      throw new Error('Must be authenticated to sync data');
    }
    await syncMutation.mutateAsync();
  }, [currentUser?.user, syncMutation]);

  const refetchUserData = useCallback(async (): Promise<void> => {
    await refetchUser();
  }, [refetchUser]);

  // Extract user from response data
  const user = currentUser && typeof currentUser === 'object' && 'user' in currentUser
    ? currentUser.user as AuthUser
    : null;

  const isAuthenticated = !!user;

  return {
    // State
    user,
    isAuthenticated,
    isLoading: isLoading || !isInitialized,
    isInitialized,
    error,

    // Actions
    login,
    signup,
    logout,
    syncLocalStorageData,
    refetchUser: refetchUserData,
    clearError,
  };
}

/**
 * Hook for checking authentication status with minimal overhead
 * Useful for components that only need to know if user is authenticated
 */
export function useAuthStatus() {
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const user = currentUser && typeof currentUser === 'object' && 'user' in currentUser
    ? currentUser.user as AuthUser
    : null;

  return {
    isAuthenticated: !!user,
    isLoading,
    user,
  };
}

/**
 * Hook for managing authentication loading states across the app
 * Useful for showing loading spinners during auth operations
 */
export function useAuthLoading() {
  const queryClient = useQueryClient();

  // Check if any auth mutations are in progress
  const isMutating = queryClient.isMutating({
    mutationKey: ['auth'],
  }) > 0;

  const { isLoading: isCheckingAuth } = useQuery({
    queryKey: ['/api/auth/me'],
  });

  return {
    isAuthenticating: isMutating,
    isCheckingAuth,
    isAnyAuthLoading: isMutating || isCheckingAuth,
  };
}