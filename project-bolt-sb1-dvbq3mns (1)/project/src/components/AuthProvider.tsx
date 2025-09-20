import { ClerkProvider } from '@clerk/clerk-react';
import { ReactNode, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './Layout';
import { LandingPage } from './LandingPage';
import { Dashboard } from './Dashboard';
import { VoiceInterview } from './VoiceInterview';
import { CodingChallenge } from './CodingChallenge';
import { TypingTest } from './TypingTest';
import { AptitudeTest } from './AptitudeTest';
import { JAMSession } from './JAMSession';
import { PPTSession } from './PPTSession';
import { MockInterview } from './MockInterview';
import { AICoach } from './AICoach';
import InterviewHistory from './InterviewHistory';
import { EnvironmentCheck } from './EnvironmentCheck';
import { initializeDatabase } from '../db';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

interface AuthProviderProps {
  children?: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isDatabaseInitialized, setIsDatabaseInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initDb = async () => {
      try {
        await initializeDatabase();
        setIsDatabaseInitialized(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initDb();
  }, []);

  // Show environment check if keys are missing
  if (!clerkPubKey) {
    return <EnvironmentCheck />;
  }

  // Show loading while database is initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Initializing for Windows 11 ASUS VivoBook 14...</p>
          <p className="text-slate-500 text-sm mt-2">Optimizing performance for ASUS VivoBook 14</p>
        </div>
      </div>
    );
  }

  // Show error if database failed to initialize
  if (!isDatabaseInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-800 mb-2">Database Initialization Failed</h1>
          <p className="text-red-600">Please refresh the page to try again.</p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider 
      publishableKey={clerkPubKey}
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#4f46e5',
          colorBackground: '#ffffff',
          colorInputBackground: '#ffffff',
          colorInputText: '#1f2937',
        },
        elements: {
          formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
          card: 'shadow-lg border border-slate-200',
          headerTitle: 'text-slate-900',
          headerSubtitle: 'text-slate-600',
        }
      }}
    >
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<><LandingPage /><Dashboard /></>} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/interview/voice" element={<VoiceInterview />} />
            <Route path="/coding" element={<CodingChallenge />} />
            <Route path="/coding/:challengeId" element={<CodingChallenge />} />
            <Route path="/typing" element={<TypingTest />} />
            <Route path="/aptitude" element={<AptitudeTest />} />
            <Route path="/aptitude/:category" element={<AptitudeTest />} />
            <Route path="/jam" element={<JAMSession />} />
            <Route path="/ppt" element={<PPTSession />} />
            <Route path="/mock-interview" element={<MockInterview />} />
            <Route path="/ai-coach" element={<AICoach />} />
            <Route path="/history" element={<InterviewHistory />} />
          </Routes>
        </Layout>
      </Router>
      {children}
    </ClerkProvider>
  );
};

export default AuthProvider;