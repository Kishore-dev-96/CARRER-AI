import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react';
import { Brain, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useUser();
  const location = useLocation();

  const navigation = [
    { name: 'Mock Interview', href: '/mock-interview' },
    { name: 'Voice Interview', href: '/interview/voice' },
    { name: 'Typing Test', href: '/typing' },
    { name: 'Coding Round', href: '/coding' },
    { name: 'AI Coach', href: '/ai-coach' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Brain className="h-8 w-8 text-indigo-600" />
                <span className="text-xl font-bold text-slate-900">AI Career Prep</span>
              </Link>
            </div>

            <SignedIn>
              <div className="hidden lg:flex items-center space-x-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      location.pathname === item.href
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
                <div className="flex items-center space-x-4 ml-6 pl-6 border-l border-slate-200">
                  <span className="text-sm text-slate-600 font-medium">
                    {user?.firstName || 'User'}
                  </span>
                  <UserButton afterSignOutUrl="/" />
                </div>
              </div>

              <div className="lg:hidden flex items-center">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            </SignedIn>

            <SignedOut>
              <div className="flex items-center">
                <SignInButton mode="modal">
                  <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                    Sign In
                  </button>
                </SignInButton>
              </div>
            </SignedOut>
          </div>

          {/* Mobile menu */}
          <SignedIn>
            {isMenuOpen && (
              <div className="lg:hidden py-4 border-t border-slate-200">
                <div className="space-y-2">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                        location.pathname === item.href
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                  <div className="flex items-center justify-between px-4 py-3 mt-4 pt-4 border-t border-slate-200">
                    <span className="text-sm text-slate-600 font-medium">
                      {user?.firstName || 'User'}
                    </span>
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </div>
              </div>
            )}
          </SignedIn>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};