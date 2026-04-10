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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[20000ms] scale-110"
        style={{ backgroundImage: 'url("/bg-auth.jpg")' }}
      />
      <div className="absolute inset-0 z-1 bg-slate-950/70 backdrop-blur-[1px]" />

      <Card className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border-slate-700/50 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="p-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 border border-primary/20">
              <span className="text-3xl">🛡️</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Welcome Back</h1>
            <p className="text-sm text-slate-400 mt-2 font-medium">Log in to manage your student project risk</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-in slide-in-from-top-2">
              <p className="text-red-400 text-xs font-bold text-center flex items-center justify-center gap-2">
                <span>⚠️</span> {error}
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <FieldGroup>
              <FieldLabel className="text-slate-200">Email Address</FieldLabel>
              <Input
                type="email"
                placeholder="name@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-800/50 border-slate-700/50 text-white focus:ring-primary h-12"
              />
            </FieldGroup>

            <FieldGroup>
              <div className="flex items-center justify-between">
                <FieldLabel className="text-slate-200">Password</FieldLabel>
                <Link 
                  href="/forgot-password" 
                  className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
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
                className="bg-slate-800/50 border-slate-700/50 text-white focus:ring-primary h-12"
              />
            </FieldGroup>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary text-white font-black uppercase tracking-widest hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            >
              {loading ? 'Authenticating...' : 'Sign In Now'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
            <p className="text-sm text-slate-400 mb-4">
              Don't have an account?
            </p>
            <Link href="/register">
              <Button variant="outline" className="w-full border-slate-700 text-slate-200 hover:bg-slate-800">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
