import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onSubmit: (username: string, password: string, remember: boolean) => Promise<void>;
  error?: string;
  isLoading?: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, error = '', isLoading = false }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ username?: string; password?: string }>({});

  const validate = () => {
    const errors: { username?: string; password?: string } = {};
    if (!username.trim()) errors.username = 'Username is required';
    if (!password.trim()) errors.password = 'Password is required';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit(username, password, remember);
    } catch (err) {
      console.error('Login failed', err);
    }
  };

  const handleQuickLogin = async (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setValidationErrors({});
    try {
      await onSubmit(user, pass, false);
    } catch (err) {
      console.error('Quick login failed', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertDescription className="font-inter text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Button type="button" variant="outline" size="sm" onClick={() => handleQuickLogin('admin', 'password')} className="text-xs">
          Admin
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => handleQuickLogin('star', 'password')} className="text-xs">
          Star
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => handleQuickLogin('buddah', 'buddah123')} className="text-xs">
          Buddah
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="username" className="text-gray-700 font-inter font-medium">Username *</Label>
        <Input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={`h-12 font-inter transition-all duration-200 ${
            validationErrors.username
              ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
          }`}
          autoComplete="username"
          placeholder="Enter your username"
        />
        {validationErrors.username && <p className="text-sm text-red-500 font-inter">{validationErrors.username}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-gray-700 font-inter font-medium">Password *</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`h-12 pr-12 font-inter transition-all duration-200 ${
              validationErrors.password
                ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
            }`}
            autoComplete="current-password"
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {validationErrors.password && <p className="text-sm text-red-500 font-inter">{validationErrors.password}</p>}
      </div>

      <div className="flex items-center space-x-3">
        <Checkbox
          id="remember"
          checked={remember}
          onCheckedChange={(checked: boolean | 'indeterminate') => setRemember(checked === true)}
          className="border-gray-300"
        />
        <Label htmlFor="remember" className="text-sm text-gray-600 font-inter cursor-pointer">Remember me</Label>
      </div>

      <Button
        type="submit"
        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-inter font-semibold text-base transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Signing In...
          </>
        ) : (
          'Sign In'
        )}
      </Button>
    </form>
  );
};
