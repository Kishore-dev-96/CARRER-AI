import React from 'react';
import AuthProvider from './components/AuthProvider';
import { ClerkErrorBoundary } from './components/ClerkErrorBoundary';

function App() {
  return (
    <ClerkErrorBoundary>
      <AuthProvider />
    </ClerkErrorBoundary>
  );
}

export default App;