import React from 'react';
import { AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import { ClerkSetupGuide } from './ClerkSetupGuide';

export const EnvironmentCheck = () => {
  const envVars = {
    'VITE_CLERK_PUBLISHABLE_KEY': import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    'VITE_GEMINI_API_KEY': import.meta.env.VITE_GEMINI_API_KEY,
  };

  const [showSetupGuide, setShowSetupGuide] = React.useState(false);

  const allConfigured = Object.values(envVars).every(Boolean);
  const clerkConfigured = Boolean(envVars.VITE_CLERK_PUBLISHABLE_KEY);

  if (allConfigured) {
    return null; // Don't show if everything is configured
  }

  if (showSetupGuide) {
    return <ClerkSetupGuide />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome to AI Interview Platform
          </h1>
          <p className="text-slate-600">
            Let's get your authentication set up so you can start practicing interviews!
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {Object.entries(envVars).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {value ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
                <div>
                  <span className="font-mono text-sm font-medium">{key}</span>
                  <p className="text-xs text-slate-500">
                    {key.includes('CLERK') ? 'Authentication service' : 'AI question generation'}
                  </p>
                </div>
              </div>
              <span className={`text-sm px-2 py-1 rounded ${
                value 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {value ? 'Configured' : 'Missing'}
              </span>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={() => setShowSetupGuide(true)}
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 transition-colors text-lg font-medium"
          >
            Start Setup Guide
          </button>
          
          <p className="text-sm text-slate-500 mt-4">
            This will walk you through setting up Clerk authentication and Google AI
          </p>
        </div>

        {!clerkConfigured && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">
              🔐 About Authentication
            </h3>
            <p className="text-sm text-blue-800">
              This app uses Clerk for secure authentication, which provides Google sign-in, 
              user management, and session handling. It's free for development and small projects.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};