// Environment variable validation utility
export const validateEnvironmentVariables = () => {
  const requiredVars = {
    VITE_CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    VITE_GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY,
  };

  const missingVars: string[] = [];
  const invalidVars: string[] = [];

  Object.entries(requiredVars).forEach(([key, value]) => {
    if (!value) {
      missingVars.push(key);
    } else if (key === 'VITE_CLERK_PUBLISHABLE_KEY' && !value.startsWith('pk_')) {
      invalidVars.push(`${key} should start with 'pk_test_' or 'pk_live_'`);
    } else if (key === 'VITE_GEMINI_API_KEY' && !value.startsWith('AIza')) {
      invalidVars.push(`${key} should start with 'AIza'`);
    }
  });

  if (missingVars.length > 0 || invalidVars.length > 0) {
    const errorMessage = [
      'Environment Variable Configuration Error:',
      '',
      ...(missingVars.length > 0 ? [
        'Missing variables:',
        ...missingVars.map(v => `  - ${v}`),
        ''
      ] : []),
      ...(invalidVars.length > 0 ? [
        'Invalid variables:',
        ...invalidVars.map(v => `  - ${v}`),
        ''
      ] : []),
      'Please check your .env.local file and restart the development server.'
    ].join('\n');

    throw new Error(errorMessage);
  }

  return true;
};

// Validate on module load
if (import.meta.env.MODE === 'development') {
  try {
    validateEnvironmentVariables();
    console.log('✅ Environment variables validated successfully for Windows 11');
  } catch (error) {
    console.error('❌ Environment validation failed on Windows 11:', error);
  }
}