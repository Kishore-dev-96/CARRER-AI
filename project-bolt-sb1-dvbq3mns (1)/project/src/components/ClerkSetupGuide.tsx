import React, { useState } from 'react';
import { ExternalLink, Copy, CheckCircle, AlertCircle, ArrowRight, Globe } from 'lucide-react';

export const ClerkSetupGuide = () => {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyToClipboard = (text: string, step: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const steps = [
    {
      title: "Create Clerk Account",
      description: "Sign up for a free Clerk account",
      action: "Visit Clerk Dashboard",
      url: "https://dashboard.clerk.com/sign-up",
      code: null
    },
    {
      title: "Create New Application",
      description: "Click 'Add application' and choose your preferred sign-in methods",
      action: "Enable Google OAuth",
      url: null,
      code: null
    },
    {
      title: "Get Your Keys",
      description: "Copy your publishable key from the API Keys section",
      action: "Copy Publishable Key",
      url: "https://dashboard.clerk.com/",
      code: "VITE_CLERK_PUBLISHABLE_KEY=pk_test_..."
    },
    {
      title: "Configure Environment",
      description: "Add the key to your .env.local file",
      action: "Copy Environment Config",
      url: null,
      code: `# Add to .env.local
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_GEMINI_API_KEY=your_gemini_key_here`
    },
    {
      title: "Configure Allowed Domains (CRITICAL)",
      description: "In Clerk Dashboard → Settings → Domains, add your development URL to prevent network errors",
      action: "Open Domain Settings",
      url: "https://dashboard.clerk.com/",
      code: "http://localhost:5173",
      critical: true
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Clerk Authentication Setup
              </h2>
              <p className="text-slate-600">
                Follow these steps to configure authentication for your AI Interview Platform
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Critical Error Notice */}
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900">Network Error Detected</h4>
                <p className="text-sm text-red-800 mt-1">
                  If you're seeing "Failed to fetch" errors, make sure to complete <strong>Step 5</strong> below to add your localhost domain to Clerk's allowed origins.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={index} className={`flex space-x-4 ${step.critical ? 'p-4 bg-amber-50 border border-amber-200 rounded-lg' : ''}`}>
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 ${step.critical ? 'bg-amber-600' : 'bg-indigo-600'} text-white rounded-full flex items-center justify-center text-sm font-bold`}>
                    {step.critical ? <Globe className="h-4 w-4" /> : index + 1}
                  </div>
                </div>
                
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold ${step.critical ? 'text-amber-900' : 'text-slate-900'} mb-2`}>
                    {step.title}
                  </h3>
                  <p className={`${step.critical ? 'text-amber-800' : 'text-slate-600'} mb-3`}>
                    {step.description}
                  </p>
                  
                  {step.critical && (
                    <div className="mb-3 p-3 bg-amber-100 rounded-lg">
                      <p className="text-sm text-amber-900 font-medium">
                        📍 Detailed Instructions:
                      </p>
                      <ol className="text-sm text-amber-800 mt-2 space-y-1 list-decimal list-inside">
                        <li>Go to your Clerk Dashboard</li>
                        <li>Navigate to <strong>Settings</strong> → <strong>Domains</strong></li>
                        <li>Click <strong>"Add domain"</strong></li>
                        <li>Enter: <code className="bg-amber-200 px-1 rounded">http://localhost:5173</code></li>
                        <li>Click <strong>"Add domain"</strong> to save</li>
                      </ol>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-3">
                    {step.url && (
                      <a
                        href={step.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center space-x-2 ${step.critical ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white px-4 py-2 rounded-lg transition-colors`}
                      >
                        <span>{step.action}</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    
                    {step.code && (
                      <button
                        onClick={() => copyToClipboard(step.code!, index)}
                        className="inline-flex items-center space-x-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        {copiedStep === index ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            <span>Copy Code</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  
                  {step.code && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                      <pre className="text-sm text-slate-700 whitespace-pre-wrap">
                        {step.code}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900">Important Notes:</h4>
                <ul className="text-sm text-amber-800 mt-2 space-y-1">
                  <li>• Make sure to restart your development server after adding environment variables</li>
                  <li>• The publishable key should start with <code>pk_test_</code> for development</li>
                  <li>• Never commit your .env.local file to version control</li>
                  <li>• For production, use <code>pk_live_</code> keys and configure production domains</li>
                  <li>• <strong>Domain configuration is required to prevent network errors</strong></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <span>I've completed the setup</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};