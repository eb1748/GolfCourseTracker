import { useState } from 'react';
import { useAuth, useStoredDataStatus } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthForms } from './AuthForms';
import { useToast } from '@/hooks/use-toast';
import { User, LogOut, RefreshCw, Database, Info } from 'lucide-react';

export function AuthNav() {
  const { user, isAuthenticated, logout, syncLocalStorageData } = useAuth();
  const { hasStoredData, storedStats } = useStoredDataStatus();
  const { toast } = useToast();
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSync = async () => {
    if (!hasStoredData) return;
    
    try {
      setIsSyncing(true);
      await syncLocalStorageData();
      toast({
        title: "Data synced successfully!",
        description: `Synced your ${storedStats.trackedCount} course status updates to your account.`,
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync failed",
        description: "Failed to sync your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Unauthenticated state
  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-1 sm:gap-3">
        {/* Show guest data indicator if user has stored data */}
        {hasStoredData && (
          <div className="flex items-center gap-1 sm:gap-2">
            <Badge variant="secondary" className="text-xs px-2 py-1">
              <Database className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="hidden sm:inline">{storedStats.trackedCount} courses tracked</span>
              <span className="sm:hidden">{storedStats.trackedCount}</span>
            </Badge>
          </div>
        )}
        
        <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-auth-signin" className="px-2 sm:px-3">
              <User className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline ml-0 sm:ml-0">Sign In</span>
              <span className="sm:hidden sr-only">Sign In</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] max-h-[90vh] sm:max-w-md overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Welcome to Golf Journey Map</DialogTitle>
            </DialogHeader>
            {hasStoredData && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  You have {storedStats.trackedCount} course status updates saved locally. 
                  Sign in or create an account to sync this data across devices.
                </AlertDescription>
              </Alert>
            )}
            <AuthForms onClose={() => setIsAuthDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Authenticated state
  return (
    <div className="flex items-center gap-1 sm:gap-3">
      {/* Show sync button if user has stored data to sync */}
      {hasStoredData && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
          data-testid="button-sync-data"
          className="text-xs"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1" />
              Sync {storedStats.trackedCount}
            </>
          )}
        </Button>
      )}

      {/* User dropdown menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
            <Avatar className="h-9 w-9">
              <AvatarImage src="" alt={user?.name || ''} />
              <AvatarFallback className="text-sm font-medium">
                {user ? getUserInitials(user.name) : 'U'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              <p className="font-medium" data-testid="text-user-name">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground" data-testid="text-user-email">
                {user?.email || ''}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}