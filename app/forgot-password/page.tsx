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
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border bg-card shadow-lg p-8 text-center">
          <div className="relative w-32 h-44 mx-auto mb-8 bg-muted rounded-lg overflow-hidden border-2 border-primary/20 flex items-center justify-center">
            {/* ID Card Placeholder Icon */}
            <svg
              className="w-16 h-16 text-primary/40"
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
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/30 to-transparent h-1 w-full animate-scan" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Verifying Identity</h2>
          <p className="text-muted-foreground animate-pulse">
            Please wait while we verify your ID card for password recovery...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-lg">
        <div className="p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Forgot Password</h1>
            <p className="text-muted-foreground">Verify your ID card to recover your access</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            <FieldGroup>
              <FieldLabel>Email Address</FieldLabel>
              <Input
                type="email"
                name="email"
                placeholder="your@college.edu"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Enrollment Number</FieldLabel>
              <Input
                type="text"
                name="enrollment"
                placeholder="e.g. S22CSEU0221"
                value={formData.enrollment}
                onChange={handleInputChange}
                required
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Upload College ID Card</FieldLabel>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm"
                required
              />
              <p className="text-[10px] text-muted-foreground mt-2">
                Verification requires clear visibility of your photo and enrollment number.
              </p>
            </FieldGroup>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? 'Processing...' : 'Verify & Recover Access'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border">
            <Link href="/login" className="flex items-center justify-center text-sm text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Login
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
