import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  runPermissionTestSuite, 
  checkFirebaseEnvironment,
  PermissionTestResult 
} from '../../utils/firebaseTestUtils';

interface FirebasePermissionTestProps {
  className?: string;
}

/**
 * Component to test Firebase permissions and display results
 * This is used for debugging permission issues
 */
const FirebasePermissionTest: React.FC<FirebasePermissionTestProps> = ({ 
  className = '' 
}) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PermissionTestResult[]>([]);
  const [envCheck, setEnvCheck] = useState<{valid: boolean; issues: string[]}>({ valid: true, issues: [] });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { currentUser } = useAuth();
  
  const runTests = async () => {
    if (!currentUser) {
      setErrorMessage('You must be logged in to run permission tests');
      return;
    }
    
    setLoading(true);
    setErrorMessage(null);
    
    try {
      // Check environment variables first
      const envStatus = checkFirebaseEnvironment();
      setEnvCheck(envStatus);
      
      if (!envStatus.valid) {
        setErrorMessage('Firebase environment configuration issues detected');
        setLoading(false);
        return;
      }
      
      // Run permission tests
      const { results: testResults } = await runPermissionTestSuite(currentUser);
      setResults(testResults);
    } catch (err) {
      const error = err as Error;
      setErrorMessage(`Error running tests: ${error.message}`);
      console.error('Test error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fixPermissionIssues = async () => {
    setLoading(true);
    setErrorMessage(null);
    
    try {
      // Check .env file format
      const envVarErrorFound = envCheck.issues.some(issue => 
        issue.includes('REACT_APP_') && !issue.includes('VITE_')
      );
      
      if (envVarErrorFound) {
        setErrorMessage(`
          Environment variable format mismatch detected. Your .env file may be using REACT_APP_ 
          prefix but the application is expecting VITE_ prefix. Check your .env file and the 
          firebase.ts configuration.
        `);
      }
      
      // You can add more automated fixes here if needed
      
    } catch (err) {
      const error = err as Error;
      setErrorMessage(`Error fixing issues: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">Firebase Permission Tests</h2>
        <div className="space-x-2">
          <button 
            onClick={runTests}
            disabled={loading || !currentUser}
            className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Running...' : 'Run Tests'}
          </button>
          {results.length > 0 && (
            <button 
              onClick={fixPermissionIssues}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Fix Issues
            </button>
          )}
        </div>
      </div>
      
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm">
          {errorMessage}
        </div>
      )}
      
      {/* Environment Check Results */}
      {!envCheck.valid && (
        <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400">
          <h3 className="text-sm font-medium text-yellow-800">Environment Issues:</h3>
          <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
            {envCheck.issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Test Results */}
      {results.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Test Results:</h3>
          <div className="border rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collection</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operation</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result, index) => (
                  <React.Fragment key={index}>
                    <tr>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {result.success ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{result.collection}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{result.operation}</td>
                    </tr>
                    {!result.success && result.errorMessage && (
                      <tr className="bg-red-50">
                        <td colSpan={3} className="px-3 py-2 text-xs text-red-700">
                          Error: {result.errorMessage}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p>{results.filter(r => r.success).length} passed, {results.filter(r => !r.success).length} failed</p>
          </div>
        </div>
      )}
      
      {loading && (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-sm text-gray-600">Running tests...</span>
        </div>
      )}
      
      {!currentUser && !errorMessage && (
        <div className="text-sm text-gray-600">
          You must be logged in to run permission tests.
        </div>
      )}
      
      {results.length === 0 && !loading && currentUser && !errorMessage && (
        <div className="text-sm text-gray-600">
          Click "Run Tests" to check Firebase permissions.
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>
          These tests check if your Firebase permissions are correctly set up for each collection.
          If tests fail, check your Firestore security rules and Firebase configuration.
        </p>
      </div>
    </div>
  );
};

export default FirebasePermissionTest; 