import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { LocalStorageService } from '@/lib/localStorage';
import type { User, InsertUserForm } from '@shared/schema';

// Auth context types
interface AuthUser extends Omit<User, 'password'> {
  // User without password field for client-side use
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: InsertUserForm) => Promise<void>;
  logout: () => Promise<void>;
  syncLocalStorageData: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const queryClient = useQueryClient();

  // Query to check if user is already authenticated
  const { data: currentUser, isLoading, refetch: refetchUser } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (!res.ok) {
        return { user: null }; // Return null user instead of throwing
      }

      return await res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update user state when query data changes
  useEffect(() => {
    if (currentUser && typeof currentUser === 'object' && 'user' in currentUser) {
      setUser(currentUser.user as AuthUser);
    } else {
      setUser(null);
    }
  }, [currentUser]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await apiRequest('POST', '/api/auth/signin', { email, password });
      return await response.json();
    },
    onSuccess: async (data) => {
      setUser(data.user);
      queryClient.setQueryData(['/api/auth/me'], data);
      
      // Sync localStorage data after successful login
      await syncLocalStorageDataInternal();
      
      // Invalidate all user-specific queries
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/stats'] });
    },
  });

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: async (userData: InsertUserForm) => {
      const response = await apiRequest('POST', '/api/auth/signup', userData);
      return await response.json();
    },
    onSuccess: async (data) => {
      setUser(data.user);
      queryClient.setQueryData(['/api/auth/me'], data);
      
      // Sync localStorage data after successful signup
      await syncLocalStorageDataInternal();
      
      // Invalidate all user-specific queries
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/stats'] });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/signout');
      return await response.json();
    },
    onSuccess: () => {
      setUser(null);
      
      // Clear all cached data
      queryClient.clear();
      
      // Note: We don't clear localStorage here - user might want to continue as guest
      // localStorage data will be synced again on next login
    },
  });

  // Sync localStorage data with server
  const syncMutation = useMutation({
    mutationFn: async () => {
      const localData = LocalStorageService.getCourseStatusesForSync();
      
      if (localData.length === 0) {
        return { syncedCount: 0, synced: [] };
      }

      const response = await apiRequest('POST', '/api/auth/sync', { courseStatuses: localData });
      
      return await response.json();
    },
    onSuccess: (data) => {
      // Clear localStorage data after successful sync
      LocalStorageService.clearAllData();
      
      console.log(`Synced ${data.syncedCount} course statuses to your account`);
      
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/stats'] });
    },
  });

  // Internal function to sync localStorage data
  const syncLocalStorageDataInternal = async () => {
    if (LocalStorageService.hasStoredData()) {
      try {
        await syncMutation.mutateAsync();
      } catch (error) {
        console.error('Failed to sync localStorage data:', error);
        // Don't throw error - user is still logged in successfully
      }
    }
  };

  // Public API functions
  const login = async (email: string, password: string): Promise<void> => {
    await loginMutation.mutateAsync({ email, password });
  };

  const signup = async (userData: InsertUserForm): Promise<void> => {
    await signupMutation.mutateAsync(userData);
  };

  const logout = async (): Promise<void> => {
    await logoutMutation.mutateAsync();
  };

  const syncLocalStorageData = async (): Promise<void> => {
    if (!user) {
      throw new Error('Must be authenticated to sync data');
    }
    await syncMutation.mutateAsync();
  };

  const refetchUserData = async (): Promise<void> => {
    await refetchUser();
  };

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    syncLocalStorageData,
    refetchUser: refetchUserData,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hook to check if user has stored data to sync
export function useStoredDataStatus() {
  const [hasStoredData, setHasStoredData] = useState(LocalStorageService.hasStoredData());
  const [storedStats, setStoredStats] = useState(LocalStorageService.getStats());
  
  const refreshStoredData = () => {
    setHasStoredData(LocalStorageService.hasStoredData());
    setStoredStats(LocalStorageService.getStats());
  };

  useEffect(() => {
    // Check for stored data changes periodically or on focus
    const handleFocus = () => refreshStoredData();
    window.addEventListener('focus', handleFocus);
    
    // Check every 30 seconds while page is visible
    const interval = setInterval(refreshStoredData, 30000);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  return {
    hasStoredData,
    storedStats,
    refreshStoredData,
  };
}