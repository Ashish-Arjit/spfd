'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { FieldGroup, FieldLabel } from '@/components/ui/field';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        // We push to dashboard first, the dashboard's useEffect will handle the role-based split
        // but we can be more proactive here if we want.
        // For now, moving to /dashboard is fine as the Student Dashboard now handles the redirect.
        router.push('/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-lg">
        <div className="p-6 md:p-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Login</h1>
          <p className="text-muted-foreground mb-8">Welcome back to the Student Failure Detection System</p>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <FieldGroup>
              <FieldLabel>Email Address</FieldLabel>
              <Input
                type="email"
                placeholder="your@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-2">Demo: alice@college.edu or james.miller@college.edu</p>
            </FieldGroup>

            <FieldGroup>
              <div className="flex items-center justify-between">
                <FieldLabel>Password</FieldLabel>
                <Link 
                  href="/forgot-password" 
                  className="text-xs text-primary hover:underline hover:text-primary/80 transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-2">Demo password: password123</p>
            </FieldGroup>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Don&apos;t have an account?
            </p>
            <Link href="/register">
              <Button variant="outline" className="w-full">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
