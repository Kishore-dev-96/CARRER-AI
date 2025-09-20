import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ClerkErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Clerk Authentication Error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Authentication Error
            </h2>
            
            <p className="text-slate-600 mb-6">
              {this.state.error?.message || 'There was an issue with authentication. Please check your configuration.'}
            </p>

            <div className="space-y-4">
              <button
                onClick={this.handleRetry}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Retry</span>
              </button>

              <div className="text-left bg-slate-50 rounded-lg p-4">
                <h3 className="font-medium text-slate-900 mb-2">Troubleshooting:</h3>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Check if VITE_CLERK_PUBLISHABLE_KEY is set in .env.local</li>
                  <li>• Verify the key starts with 'pk_test_' or 'pk_live_'</li>
                  <li>• Restart the development server after adding env vars</li>
                  <li>• Ensure .env.local is in the project root</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}