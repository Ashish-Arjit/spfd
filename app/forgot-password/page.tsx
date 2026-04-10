'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { FieldGroup, FieldLabel } from '@/components/ui/field';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { verifyIdentity } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    enrollment: '',
  });
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdCardFile(file);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!idCardFile) {
      setError('Please upload your college ID card for verification');
      return;
    }

    setLoading(true);
    setIsVerifying(true);

    try {
      const result = await verifyIdentity(formData.email, formData.enrollment, idCardFile);
      
      if (result.success) {
        setIsSuccess(true);
        // Simulate "Retrieving Password" or "Resetting" message
        setTimeout(() => {
          alert('Verification Successful! A password reset link has been sent to your college email address.');
          router.push('/login');
        }, 1500);
      } else {
        if (result.error?.toLowerCase().includes('no account found')) {
          alert('No account was found for this email address.');
        }
        setError(result.error || 'Verification failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
      setIsVerifying(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: 'url("/bg-auth.jpg")' }}
        />
        <div className="absolute inset-0 z-1 bg-slate-950/80 backdrop-blur-md" />

        <Card className="w-full max-w-md bg-slate-900/40 backdrop-blur-2xl border-slate-700/50 shadow-2xl relative z-10 p-10 text-center animate-in fade-in zoom-in duration-500">
          <div className="relative w-40 h-56 mx-auto mb-10 bg-slate-800/50 rounded-2xl overflow-hidden border-2 border-primary/30 flex items-center justify-center shadow-inner">
            {/* ID Card Placeholder Icon */}
            <svg
              className="w-20 h-20 text-primary/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h2a2 2 0 012 2v1m-4 0h4m-6 7a3 3 0 116 0 3 3 0 01-6 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/30 to-transparent h-1.5 w-full animate-scan" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Verifying Identity</h2>
          <p className="text-slate-400 font-medium animate-pulse">
            Analyzing your academic credentials. Please wait.
          </p>
        </Card>
      </div>
    );
  }

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
              <span className="text-3xl">🔑</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Recover Access</h1>
            <p className="text-sm text-slate-400 mt-2 font-medium">Verify your ID card to retrieve your account</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-in slide-in-from-top-2">
              <p className="text-red-400 text-xs font-bold text-center">⚠️ {error}</p>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            <FieldGroup>
              <FieldLabel className="text-slate-200">Email Address</FieldLabel>
              <Input
                type="email"
                name="email"
                placeholder="name@university.edu"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="bg-slate-800/50 border-slate-700/50 text-white focus:ring-primary h-12"
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel className="text-slate-200">Enrollment Number</FieldLabel>
              <Input
                type="text"
                name="enrollment"
                placeholder="e.g. S22CSEU0221"
                value={formData.enrollment}
                onChange={handleInputChange}
                required
                className="bg-slate-800/50 border-slate-700/50 text-white focus:ring-primary h-12"
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel className="text-slate-200">College ID Card</FieldLabel>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-slate-700/50 rounded-lg bg-slate-800/50 text-slate-300 text-sm file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-primary/20 file:text-primary transition-all"
                required
              />
            </FieldGroup>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary text-white font-black uppercase tracking-widest hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            >
              {loading ? 'Processing...' : 'Verify & Recover'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-700/50">
            <Link href="/login" className="flex items-center justify-center text-sm font-bold text-slate-400 hover:text-white transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return to Login
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
