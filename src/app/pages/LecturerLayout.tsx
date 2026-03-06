import { Link, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { BookOpen, Users, FileText, MessageSquare, BarChart, LogOut, GraduationCap } from 'lucide-react';

export function LecturerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
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
              <Button variant="outline" size="sm" onClick={handleLogout}>
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
            <Link to="/lecturer/dashboard">
              <Button variant="ghost" className="rounded-none border-b-2 border-transparent hover:border-primary">
                <BarChart className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link to="/lecturer/subjects">
              <Button variant="ghost" className="rounded-none border-b-2 border-transparent hover:border-primary">
                <BookOpen className="h-4 w-4 mr-2" />
                Subjects
              </Button>
            </Link>
            <Link to="/lecturer/messages">
              <Button variant="ghost" className="rounded-none border-b-2 border-transparent hover:border-primary">
                <MessageSquare className="h-4 w-4 mr-2" />
                Messages
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}