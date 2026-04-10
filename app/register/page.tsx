'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { FieldGroup, FieldLabel } from '@/components/ui/field';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student' as 'student' | 'teacher',
    phone: '',
    university: '',
    enrollment: '',
  });
  const [collegeIdFile, setCollegeIdFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCollegeIdFile(file);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!collegeIdFile) {
      setError('Please upload your college ID card image');
      return;
    }

    setLoading(true);
    if (formData.role === 'student') {
      setIsVerifying(true);
    }

    try {
      const result = await register(
        formData.name,
        formData.email,
        formData.password,
        formData.role,
        collegeIdFile,
        {
          phone: formData.role === 'teacher' ? formData.phone : undefined,
          university: formData.role === 'teacher' ? formData.university : undefined,
          enrollment: formData.enrollment, 
        }
      );

      if (result.success) {
        if (formData.role === 'student') {
          alert('You are successfully verified and registered as a student.');
        }
        
        if (formData.role === 'teacher') {
          router.push('/teacher-dashboard');
        } else {
          router.push('/dashboard');
        }
      } else {
        const isDuplicate = 
          result.error?.toLowerCase().includes('already registered') || 
          result.error?.toLowerCase().includes('already exists') ||
          result.error?.toLowerCase().includes('unique constraint') ||
          result.error?.toLowerCase().includes('enrollment_number_key');

        if (isDuplicate) {
          alert('This account or enrollment number is already registered. Please login instead.');
        } else {
          setError(result.error || 'Registration failed. Please try again.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred.');
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
            
            {/* Scanning Line Animation */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/30 to-transparent h-1 w-full animate-scan" />
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-4">Verifying Identity</h2>
          <p className="text-muted-foreground animate-pulse">
            Your ID is being verified. Please wait for a moment.
          </p>
          
          <div className="mt-8 flex justify-center">
            <div className="w-2 h-2 bg-primary rounded-full mx-1 animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 bg-primary rounded-full mx-1 animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 bg-primary rounded-full mx-1 animate-bounce" />
          </div>
        </Card>
        
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-lg">
        <div className="p-6 md:p-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Create Account</h1>
          <p className="text-muted-foreground mb-8">Join the Student Failure Detection System</p>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-6">
            <FieldGroup>
              <FieldLabel>Full Name</FieldLabel>
              <Input
                type="text"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Account Type</FieldLabel>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </FieldGroup>

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
              <FieldLabel>Password</FieldLabel>
              <Input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </FieldGroup>

            {formData.role === 'student' && (
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
            )}

            {formData.role === 'teacher' && (
              <>
                <FieldGroup>
                  <FieldLabel>Phone Number</FieldLabel>
                  <Input
                    type="tel"
                    name="phone"
                    placeholder="+91 9999999999"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </FieldGroup>
                
                <FieldGroup>
                  <FieldLabel>University</FieldLabel>
                  <Input
                    type="text"
                    name="university"
                    placeholder="Grand Central University"
                    value={formData.university}
                    onChange={handleInputChange}
                    required
                  />
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel>Employee ID / Enrollment</FieldLabel>
                  <Input
                    type="text"
                    name="enrollment"
                    placeholder="e.g. T22FAC001"
                    value={formData.enrollment}
                    onChange={handleInputChange}
                    required
                  />
                </FieldGroup>
              </>
            )}

            <FieldGroup>
              <FieldLabel>College ID Card Image</FieldLabel>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm"
                required
              />
              {collegeIdFile && (
                <p className="text-xs text-green-600 mt-2">✓ {collegeIdFile.name} uploaded</p>
              )}
            </FieldGroup>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Already have an account?
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
