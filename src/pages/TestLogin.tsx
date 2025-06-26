import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const TestLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testCredentials = [
    { username: 'admin', password: 'password' },
    { username: 'star', password: 'star123' },
    { username: 'buddah', password: 'buddah123' },
    { username: 'freakyxxx', password: 'freaky123' },
    { username: 'freak', password: 'freak123' }
  ];

  const handleLogin = async (testUsername?: string, testPassword?: string) => {
    setLoading(true);
    setResult(null);
    
    const loginData = {
      username: testUsername || username,
      password: testPassword || password
    };

    console.log('Attempting login with:', loginData);

    try {
      const response = await fetch(
        'https://qkcuykpndrolrewwnkwb.supabase.co/functions/v1/c72dcc88-abde-4202-a24c-f8661ef00b2a',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(loginData)
        }
      );

      const data = await response.json();
      console.log('Response:', { status: response.status, data });
      
      setResult({
        status: response.status,
        success: response.ok,
        data: data,
        credentials: loginData
      });
    } catch (error) {
      console.error('Login error:', error);
      setResult({
        status: 'ERROR',
        success: false,
        error: error.message,
        credentials: loginData
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Login Test Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button 
              onClick={() => handleLogin()} 
              disabled={loading || !username || !password}
              className="w-full"
            >
              {loading ? 'Testing...' : 'Test Login'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Known Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testCredentials.map((cred, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => handleLogin(cred.username, cred.password)}
                  disabled={loading}
                  className="p-4 h-auto flex flex-col"
                >
                  <div className="font-semibold">{cred.username}</div>
                  <div className="text-sm text-gray-500">{cred.password}</div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Test Result</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className={result.success ? 'border-green-500' : 'border-red-500'}>
                <AlertDescription>
                  <div className="space-y-2">
                    <div><strong>Status:</strong> {result.status}</div>
                    <div><strong>Success:</strong> {result.success ? 'Yes' : 'No'}</div>
                    <div><strong>Credentials:</strong> {JSON.stringify(result.credentials)}</div>
                    <div><strong>Response:</strong></div>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(result.data || result.error, null, 2)}
                    </pre>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TestLogin;