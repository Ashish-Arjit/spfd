'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/auth-context';
import { getUsers, createTeam, getRiskTrends, saveRiskTrends, saveUsers } from '@/lib/storage';
import { User, RiskTrend } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { FieldGroup, FieldLabel } from '@/components/ui/field';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  isLead: boolean;
}

export default function CreateProjectPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [teachers, setTeachers] = useState<{ id: string, name: string }[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'student') {
      router.push('/dashboard');
      return;
    }

    // Fetch Teachers from Supabase
    const fetchTeachers = async () => {
      setLoading(true);
      try {
        // 1. Get all users with the mentor role
        const { data: profileList, error: pError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('role', 'teacher');
          
        if (pError) throw pError;

        // 2. Also get names from teacher_signup_profiles if they were entered there
        const { data: signupList, error: sError } = await supabase
          .from('teacher_signup_profiles')
          .select('user_id, name');
          
        const signups = signupList as any[] | null;

        if (profileList) {
          const namesMap = new Map();
          if (signups) signups.forEach(s => namesMap.set(s.user_id, s.name));

          const formatted = profileList.map((p: any) => ({
            id: p.id,
            name: p.name || namesMap.get(p.id) || p.email.split('@')[0] || 'Mentor'
          }));
          
          setTeachers(formatted);
        }
      } catch (err: any) {
        console.warn("Mentor fetch failed:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTeachers();

    // Initialize team members with the current user as lead
    setTeamMembers([
      {
        id: user.id,
        name: user.name,
        email: user.email,
        isLead: true,
      },
    ]);
  }, [user, router, supabase]);

  const handleAddMember = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }

    setError('');

    if (!memberName.trim() || !memberEmail.trim()) {
      setError('Please enter both name and email');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(memberEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if email already exists in the team (including lead)
    if (teamMembers.some(m => m.email.toLowerCase() === memberEmail.toLowerCase())) {
      setError('This email is already in the team');
      return;
    }

    // Add new member
    const newMember: TeamMember = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      name: memberName.trim(),
      email: memberEmail.trim(),
      isLead: false,
    };

    setTeamMembers(prev => [...prev, newMember]);
    setMemberName('');
    setMemberEmail('');
  };

  const handleRemoveMember = (memberId: string) => {
    // Cannot remove the lead
    if (teamMembers.find(m => m.id === memberId)?.isLead) {
      setError('Cannot remove the team lead');
      return;
    }

    setTeamMembers(teamMembers.filter(m => m.id !== memberId));
    setError('');
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    if (teamMembers.length === 0) {
      setError('At least one team member is required');
      return;
    }

    setLoading(true);

    try {
      const projId = crypto.randomUUID(); // Use a real UUID for Supabase compatibility
      
      if (!selectedTeacherId) {
        setError('Please select an assigned teacher for this project');
        setLoading(false);
        return;
      }

      // 1. Store Project in Supabase
      const { error: projError } = await supabase.from('projects').insert({
        id: projId,
        name: projectName,
        team_size: teamMembers.length,
        created_by: user!.id,
        teacher_id: selectedTeacherId === 'teacher_001' ? null : selectedTeacherId,
        students: teamMembers, 
        week_current: 1
      } as any);

      if (projError) throw projError;

      // 2. Store team lead in team_members table
      const { error: membersError } = await supabase.from('team_members').insert({
        project_id: projId,
        student_id: user!.id,
      } as any);

      if (membersError) console.warn("Team member mapping failed, but project was created.", membersError.message);

      // --- Maintain Legacy Mock Logic for Dashboard Consistency ---
      const allUsers = getUsers();
      const memberUserIds: string[] = [];

      for (const member of teamMembers) {
        const existingUser = allUsers.find(u => u.email === member.email);
        if (existingUser) {
          memberUserIds.push(existingUser.id);
        } else {
          const newUser: User = {
            id: member.id,
            name: member.name,
            email: member.email,
            password: 'temp_password',
            role: 'student',
            collegeIdVerified: false,
            createdAt: new Date().toISOString(),
          } as any;
          allUsers.push(newUser);
          memberUserIds.push(newUser.id);
        }
      }
      saveUsers(allUsers);

      const assignedTeacherId = selectedTeacherId || 'teacher_001'; 
      const newTeam = createTeam({
        name: teamName,
        leaderId: user!.id,
        memberIds: memberUserIds,
        projectId: projId,
        teacherId: assignedTeacherId,
        currentWeek: 1,
        milestoneDeadline: new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });

      const trends = getRiskTrends();
      const newTrends: RiskTrend[] = Array.from({ length: 12 }, (_, i) => ({
        teamId: newTeam.id,
        week: i + 1,
        score: 20 + Math.random() * 10,
        date: new Date(Date.now() + (i) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }));
      saveRiskTrends([...trends, ...newTrends]);

      setCreatedTeamId(newTeam.id);
      setTimeout(() => router.push('/dashboard'), 3000);
    } catch (err: any) {
      console.error("Project creation error:", err);
      setError(`Failed to save project to Supabase: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (createdTeamId) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="p-8 border-border bg-card max-w-md w-full text-center">
          <div className="mb-6">
            <div className="inline-block p-3 bg-primary/20 rounded-full mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Project Created!</h1>
          </div>

          <div className="bg-muted p-6 rounded-lg mb-6">
            <p className="text-sm text-muted-foreground mb-2">Your Team ID</p>
            <p className="text-2xl font-mono font-bold text-foreground break-all">{createdTeamId}</p>
            <p className="text-xs text-muted-foreground mt-3">Save this ID for reference</p>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Redirecting to your dashboard in a moment...
          </p>

          <Button onClick={() => router.push('/dashboard')} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-8"
        >
          ← Back
        </Button>

        <Card className="p-6 md:p-8 border-border bg-card">
          <h1 className="text-3xl font-bold text-foreground mb-2">Create New Project</h1>
          <p className="text-muted-foreground mb-8">Set up a new team project and begin tracking progress</p>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleCreateProject} className="space-y-8">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">Project & Mentor Assignment</h2>

              <FieldGroup>
                <FieldLabel>Assigned Teacher/Mentor</FieldLabel>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-input bg-background text-foreground rounded-md text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">Select a teacher...</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                  {teachers.length === 0 && <option value="teacher_001">Teacher 001 (Default)</option>}
                </select>
                <p className="text-xs text-muted-foreground">The assigned teacher will oversee your progress and milestones.</p>
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Project Name</FieldLabel>
                <Input
                  type="text"
                  placeholder="e.g., AI Research Initiative"
                  value={projectName}
                  onChange={(e: any) => setProjectName(e.target.value)}
                  required
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Team Name</FieldLabel>
                <Input
                  type="text"
                  placeholder="e.g., AI Research Team"
                  value={teamName}
                  onChange={(e: any) => setTeamName(e.target.value)}
                  required
                />
              </FieldGroup>
            </div>

            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
              <p className="text-sm text-muted-foreground">
                You are automatically set as the team lead. Add team members by entering their name and email address.
              </p>

              <div className="p-4 bg-primary/10 border border-primary rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{user?.name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Team Lead</span>
                </div>
              </div>

              <div className="space-y-4 p-4 bg-muted/50 border border-border rounded-lg">
                <h3 className="font-medium text-foreground">Add Team Member</h3>
                
                <FieldGroup>
                  <FieldLabel className="text-sm">Member Name</FieldLabel>
                  <Input
                    type="text"
                    placeholder="e.g., John Doe"
                    value={memberName}
                    onChange={(e: any) => setMemberName(e.target.value)}
                  />
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel className="text-sm">Member Email</FieldLabel>
                  <Input
                    type="email"
                    placeholder="e.g., john@college.edu"
                    value={memberEmail}
                    onChange={(e: any) => setMemberEmail(e.target.value)}
                  />
                </FieldGroup>

                <Button
                  type="button"
                  onClick={(e) => handleAddMember(e)}
                  variant="outline"
                  className="w-full"
                >
                  + Add Member
                </Button>
              </div>

              {teamMembers.length > 1 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-foreground text-sm">Team Members ({teamMembers.length})</h3>
                  {teamMembers.map(member => (
                    !member.isLead && (
                      <div key={member.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground text-sm truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleRemoveMember(member.id)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive/80"
                        >
                          Remove
                        </Button>
                      </div>
                    )
                  ))}
                </div>
              )}

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium text-foreground">
                  Total Members: {teamMembers.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {teamMembers.length === 1 ? 'Solo project' : `${teamMembers.length} team members`}
                </p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3"
            >
              {loading ? 'Creating Project...' : 'Create Project & Start'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
