import { NavLink, Outlet, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { BookOpen, FileText, MessageSquare, BarChart, LogOut, GraduationCap, Loader2 } from 'lucide-react';
import { getCurrentUser, logout } from '../services/student/authService';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';

export function StudentLayout() {
  const user = getCurrentUser();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setIsLogoutDialogOpen(false);
      navigate('/student/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              <h1 className="text-xl">SmartGrade</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.name}</span>
              <Button variant="outline" size="sm" onClick={() => setIsLogoutDialogOpen(true)}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            <NavLink to="/student/dashboard" end>
              {({ isActive }) => (
                <Button
                  variant="ghost"
                  className={`rounded-none border-b-2 hover:border-primary focus-visible:border-primary ${isActive ? 'border-primary text-primary bg-primary/5' : 'border-transparent'
                    }`}
                >
                  <BarChart className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              )}
            </NavLink>
            <NavLink to="/student/classes">
              {({ isActive }) => (
                <Button
                  variant="ghost"
                  className={`rounded-none border-b-2 hover:border-primary focus-visible:border-primary ${isActive ? 'border-primary text-primary bg-primary/5' : 'border-transparent'
                    }`}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  My Classes
                </Button>
              )}
            </NavLink>
            <NavLink to="/student/assignments">
              {({ isActive }) => (
                <Button
                  variant="ghost"
                  className={`rounded-none border-b-2 hover:border-primary focus-visible:border-primary ${isActive ? 'border-primary text-primary bg-primary/5' : 'border-transparent'
                    }`}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Assignments
                </Button>
              )}
            </NavLink>
            <NavLink to="/student/messages">
              {({ isActive }) => (
                <Button
                  variant="ghost"
                  className={`rounded-none border-b-2 hover:border-primary focus-visible:border-primary ${isActive ? 'border-primary text-primary bg-primary/5' : 'border-transparent'
                    }`}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                </Button>
              )}
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <Dialog
        open={isLogoutDialogOpen}
        onOpenChange={(open) => {
          if (!isLoggingOut) {
            setIsLogoutDialogOpen(open);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLogoutDialogOpen(false)} disabled={isLoggingOut}>
              No
            </Button>
            <Button onClick={handleConfirmLogout} disabled={isLoggingOut}>
              {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : null}
              {isLoggingOut ? 'Logging out...' : 'Yes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
