'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { User, UserRole } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    name: string,
    email: string,
    password: string,
    role: UserRole,
    collegeIdFile: File,
    additionalData?: {
      phone?: string,
      university?: string,
      enrollment?: string
    }
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  verifyIdentity: (email: string, enrollment: string, idCardFile: File) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper type for the profiles table Row
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize the typed Supabase client
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchUserAndProfile = async (sessionUser: { id: string, email?: string }) => {
      try {
        setLoading(true);
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single();

        if (profile && !error) {
          const p = profile as any;
          setUser({
            id: p.id,
            name: p.name || p.email?.split('@')[0] || 'User',
            email: p.email,
            role: (p.role as UserRole) || 'student',
            password: '',
            collegeIdVerified: p.verified || false,
            collegeIdImage: p.id_card_image || undefined,
          });
        } else {
          // Fallback if profile doesn't exist yet
          setUser({
            id: sessionUser.id,
            name: sessionUser.email?.split('@')[0] || 'User',
            email: sessionUser.email || '',
            role: 'student',
            password: '',
            collegeIdVerified: false,
          });
        }
      } catch (err) {
        console.error("Error fetching auth profile:", err);
      } finally {
        setLoading(false);
      }
    };

    // 1. Check for initial session on refresh
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserAndProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          fetchUserAndProfile(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
    collegeIdFile: File,
    additionalData?: {
      phone?: string,
      university?: string,
      enrollment?: string
    }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // 0. Student ID Verification
      if (role === 'student') {
        // Pass false for isRecovery because this is a new registration
        const verifyResult = await verifyIdentity(email, additionalData?.enrollment || '', collegeIdFile, false);
        if (!verifyResult.success) {
          throw new Error(verifyResult.error);
        }
      }

      // 1. Sign up user in Supabase Auth
      console.log('Step 1: Auth Sign-up...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
            throw new Error('An account with this email already exists. Please login instead.');
        }
        throw authError;
      }
      if (!authData.user) throw new Error('User creation failed');

      const userId = authData.user.id;

      // 2. Upload ID card to Supabase Storage
      console.log('Step 2: Storage Upload...');
      const fileExt = collegeIdFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `id-cards/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('id-cards')
        .upload(filePath, collegeIdFile);

      if (uploadError) {
        console.warn("Storage upload failed, but continuing with profile creation:", uploadError.message);
      }

      // 3. Create entry in profiles table
      console.log('Step 3: Profiles Insert...');
      const { error: profileError } = await (supabase.from('profiles') as any).insert({
        id: userId,
        email: email,
        name: name,
        role: role as string,
        id_card_image: filePath,
        verified: false,
      });

      if (profileError) {
        console.error('Profile DB error:', profileError);
        throw profileError;
      }

      // 4. Create entry in specific signup tables
      console.log('Step 4: Role-specific Signup...');
      if (role === 'student') {
        const { error: studentError } = await (supabase.from('student_signup_profiles') as any).insert({
          user_id: userId,
          name: name,
          email: email,
          enrollment_number: additionalData?.enrollment || 'PENDING',
          id_card_url: filePath,
        });
        if (studentError) {
          console.error('Student signup table error:', JSON.stringify(studentError, null, 2));
          throw studentError;
        }
      } else {
        const { error: teacherError } = await (supabase.from('teacher_signup_profiles') as any).insert({
          user_id: userId,
          name: name,
          email: email,
          phone_number: additionalData?.phone || null,
          university: additionalData?.university || null,
          enrollment_number: additionalData?.enrollment || null,
          id_card_url: filePath,
        });
        if (teacherError) {
          console.error('Teacher signup table error:', JSON.stringify(teacherError, null, 2));
          throw teacherError;
        }
      }

      console.log('Registration successful!');
      return { success: true };
    } catch (err: any) {
      console.error('Registration full error object:', JSON.stringify(err, null, 2));
      const errorMessage = err?.message || err?.error_description || err?.details || (typeof err === 'string' ? err : 'Check console for full error object');
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const verifyIdentity = async (email: string, enrollment: string, idCardFile: File, isRecovery: boolean = true): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. If in Recovery mode, check if user exists
      if (isRecovery) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        if (profileError || !profile) {
          return { success: false, error: 'No account found with this email address.' };
        }
      }

      // 2. Call SPFD-1 Verification API
      const verifyFormData = new FormData();
      verifyFormData.append('roll', enrollment);
      verifyFormData.append('id_card', idCardFile);

      const verifyResponse = await fetch('http://127.0.0.1:5000/register', {
        method: 'POST',
        body: verifyFormData,
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        return { success: false, error: errorData.errors?.join(', ') || 'ID Verification System error' };
      }

      const verifyResult = await verifyResponse.json();
      if (verifyResult.status !== 'success') {
        return { success: false, error: `Verification Failed: ${verifyResult.errors?.join(', ') || 'Invalid ID'}` };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Verification process failed.' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, verifyIdentity: (em, en, fi) => verifyIdentity(em, en, fi, true) }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
