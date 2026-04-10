'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/auth-context';
import { createClient } from '@/lib/supabase/client';
import {
  getRiskTrendsByTeam,
  getCurrentRiskScore,
  findUserById
} from '@/lib/storage';
import { Team, RiskTrend, User, Milestone } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RiskLevelBadge } from '@/components/risk-level-badge';
import { RiskTrendChart } from '@/components/risk-trend-chart';
import { WeeklyProgressForm } from '@/components/weekly-progress-form';
import { calculateMetrics, PerformanceMetrics } from '@/lib/metrics';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const supabase = createClient();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [mentorName, setMentorName] = useState('Loading...');

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase.from('notifications') as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setNotifications(data);
  }, [user, supabase]);

  const clearNotifications = async () => {
    if (!user) return;
    await (supabase.from('notifications') as any).delete().eq('user_id', user.id);
    setNotifications([]);
  };

  const selectTeam = async (team: Team) => {
    setSelectedTeam(team);

    // Fetch Teacher Name from Supabase
    if (team.teacherId) {
      const { data: teacherData } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', team.teacherId)
        .single();
      if (teacherData) {
        const t = teacherData as any;
        setMentorName(t.name || 'Assigned Mentor');
      }
    }

    // Get members from the project's own metadata
    const { data: projData } = await supabase.from('projects').select('students').eq('id', team.id).single();
    if (projData) {
      const list = (projData as any).students as any[] || [];
      const members = list.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        role: 'student' as 'student',
        password: '',
        collegeIdVerified: true
      } as User));
      setTeamMembers(members);
    }
  };

  const loadTeamsData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // 1. Fetch Projects where user is the CREATOR (Team Lead)
      const { data: leadProjects, error: leadError } = await supabase
        .from('projects')
        .select('*')
        .eq('created_by', user.id);

      // 2. Fetch Projects where user is a MEMBER (via team_members table)
      const { data: memberRows, error: memberError } = await supabase
        .from('team_members')
        .select('project_id, projects (*)')
        .eq('student_id', user.id);

      if (leadError || memberError) throw leadError || memberError;

      const allFoundProjects: any[] = [...(leadProjects || [])];
      if (memberRows) {
        memberRows.forEach((row: any) => {
          if (!allFoundProjects.find(p => p.id === row.project_id)) {
            if (row.projects) allFoundProjects.push(row.projects);
          }
        });
      }

      if (allFoundProjects.length > 0) {
        const mappedTeams: Team[] = allFoundProjects.map((p: any) => ({
          id: p.id,
          name: p.name,
          leaderId: p.created_by,
          projectId: p.id,
          teacherId: p.teacher_id || '',
          memberIds: Array.isArray(p.students) ? p.students.map((s: any) => s.id) : [],
          currentWeek: p.week_current || 1,
          submission_active: p.submission_active || false,
          submission_day: p.submission_day || 'Friday',
          submission_window: p.submission_window || 1,
          milestoneDeadline: '',
          createdAt: p.created_at || ''
        }));
        setTeams(mappedTeams);

        // Auto-select first team
        if (mappedTeams.length > 0) {
          selectTeam(mappedTeams[0]);
        }
      } else {
        setTeams([]);
      }
    } catch (err: any) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (!selectedTeam) return;

    const fetchCurrentMilestones = async () => {
      const { data: msData } = await (supabase
        .from('milestones') as any)
        .select('*')
        .eq('project_id', selectedTeam.id);

      if (msData) {
        setMilestones(msData.map((m: any) => ({
          id: m.id,
          name: m.description, // Database maps to Milestone interface name
          deadline: m.deadline || '',
          description: '',
          completed: m.completed || false,
          completed_at: m.completed_at || undefined
        })));
      }
    };

    // Initial fetch
    fetchCurrentMilestones();

    const fetchWeeklyEntries = async () => {
      const { data } = await supabase
        .from('weekly_entries')
        .select('*')
        .eq('project_id', selectedTeam.id)
        .order('week_number', { ascending: false });
      if (data) setWeeklyEntries(data);
    };

    fetchWeeklyEntries();

    const channel = supabase
      .channel(`milestones-student-${selectedTeam.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'milestones',
        filter: `project_id=eq.${selectedTeam.id}`
      }, (payload) => {
        console.log("Realtime milestone update received:", payload);
        fetchCurrentMilestones();
      })
      .subscribe((status) => {
        console.log(`Realtime subscription status for team ${selectedTeam.id}:`, status);
      });

    // Sub to weekly_entries too
    const weeklyChannel = supabase
      .channel(`weekly-student-${selectedTeam.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'weekly_entries',
        filter: `project_id=eq.${selectedTeam.id}`
      }, () => {
        fetchWeeklyEntries();
      })
      .subscribe();

    const projectChannel = supabase
      .channel(`student-project-sync-${selectedTeam.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'projects',
        filter: `id=eq.${selectedTeam.id}`
      }, (payload) => {
        // Refresh project settings (submission active/day)
        loadTeamsData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(weeklyChannel);
      supabase.removeChannel(projectChannel);
    };
  }, [selectedTeam?.id, supabase, loadTeamsData]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    // Role protection
    if (user.role === 'teacher') {
      router.push('/teacher-dashboard');
      return;
    }

    loadTeamsData();
    loadNotifications();
  }, [authLoading, user, router, loadTeamsData, loadNotifications]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const metrics: PerformanceMetrics | null = useMemo(() => {
    if (!selectedTeam) return null;
    return calculateMetrics(milestones, weeklyEntries, selectedTeam.currentWeek, selectedTeam.id);
  }, [milestones, weeklyEntries, selectedTeam]);

  const currentRiskScore = metrics ? metrics.currentRiskScore : 0;
  const riskTrends = metrics ? metrics.riskTrend : [];

  const alreadySubmitted = useMemo(() => {
    if (!selectedTeam) return false;
    return weeklyEntries.some(e => e.week_number === selectedTeam.currentWeek);
  }, [weeklyEntries, selectedTeam]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (teams.length === 0) {
    return (
      <div className="min-h-screen p-8 text-center bg-background">
        <header className="mb-12 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </header>
        <Card className="p-12 max-w-md mx-auto">
          <p className="text-xl mb-4">No Team Assigned</p>
          <p className="text-muted-foreground mb-6">You aren't in a project team. Create one or ask your mentor to add you.</p>
          <Button onClick={() => router.push('/create-project')}>+ Create Project</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12 relative overflow-x-hidden">
      {/* Mobile Sidebar for Team Selection */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden absolute inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Team Selection Sidebar (Mobile) */}
      <aside className={`fixed lg:hidden inset-y-0 left-0 w-72 bg-card z-50 border-r border-border p-6 transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-black text-xl">My Projects</h2>
          <div className="flex items-center gap-2">
            <Link href="/create-project" className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold hover:bg-primary hover:text-white transition-all">+</Link>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2">✕</button>
          </div>
        </div>
        <div className="space-y-3">
          {teams.map(t => (
            <button
              key={t.id}
              onClick={() => { selectTeam(t); setIsMobileMenuOpen(false); }}
              className={`w-full text-left p-4 rounded-xl border transition-all ${selectedTeam?.id === t.id ? 'bg-primary/10 border-primary text-primary shadow-sm font-bold' : 'border-border text-muted-foreground'}`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </aside>

      <nav className="border-b bg-card/80 backdrop-blur-md py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-muted rounded-lg"
            >
              ☰
            </button>
            <h1 className="text-xl font-black flex items-center gap-2">🚀 <span className="hidden sm:inline">Student Arena</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/create-project" className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all italic">
              + New Project
            </Link>
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground hidden sm:block">{user?.name}</span>
            <button onClick={handleLogout} className="px-3 py-1.5 border border-border rounded-lg text-xs font-bold hover:bg-muted transition-all">Logout 👋</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6 lg:py-8 space-y-8">
        {/* Desktop Team Selection Row */}
        {teams.length > 1 && (
          <div className="hidden lg:flex gap-2 overflow-x-auto pb-2 scroll-smooth">
            {teams.map(t => (
              <Button
                key={t.id}
                variant={selectedTeam?.id === t.id ? 'default' : 'outline'}
                onClick={() => selectTeam(t)}
                className="font-bold whitespace-nowrap rounded-xl"
              >
                {t.name}
              </Button>
            ))}
          </div>
        )}

        {selectedTeam && (
          <>
            <Card className="p-6 relative overflow-hidden border-border/50 shadow-2xl bg-card/50 backdrop-blur-sm animate-in fade-in duration-700">
               <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                <div>
                  <h2 className="text-3xl lg:text-4xl font-black tracking-tight">{selectedTeam.name}</h2>
                  <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground opacity-60">Project ID: {selectedTeam.id}</p>
                </div>
                <RiskLevelBadge score={currentRiskScore} size="lg" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">MS Done</p>
                  <p className="text-xl font-black text-primary">{metrics?.milestonesCompleted}/{metrics?.milestonesTotal}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Days Work</p>
                  <p className="text-xl font-black text-primary">{metrics?.daysWorkedLatest}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Labs Done</p>
                  <p className="text-xl font-black text-primary">{metrics?.labsAttendedTotal}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="text-[10px] text-orange-600/70 uppercase font-bold tracking-wider">Lab Missed</p>
                  <p className="text-xl font-black text-orange-600">{metrics?.labsMissedTotal}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="text-[10px] text-red-600/70 uppercase font-bold tracking-wider">MS Missed</p>
                  <p className="text-xl font-black text-red-600">{metrics?.milestonesMissed}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Days Off</p>
                  <p className="text-xl font-black text-primary">{metrics?.daysNotWorkedLatest}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="p-4 bg-muted/20 border border-border/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Current Risk</p>
                  <p className="text-2xl font-bold">{currentRiskScore}/100</p>
                </div>
                <div className="p-4 bg-muted/20 border border-border/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Active Week</p>
                  <p className="text-2xl font-bold">Week {selectedTeam.currentWeek}</p>
                </div>
                <div className="p-4 bg-muted/20 border border-border/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Assigned Mentor</p>
                  <p className="text-lg font-bold truncate">{mentorName}</p>
                </div>
                <div className="p-4 bg-muted/20 border border-border/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Progress (Weeks)</p>
                  <p className="text-2xl font-bold truncate">
                    {Math.round((selectedTeam.currentWeek / 12) * 100)}%
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Risk Trends</h3>
                  <RiskTrendChart data={riskTrends} height={300} />
                </Card>
                <WeeklyProgressForm
                  teamId={selectedTeam.id}
                  currentWeek={selectedTeam.currentWeek}
                  submissionActive={(selectedTeam as any).submission_active}
                  submissionDay={(selectedTeam as any).submission_day || 'Friday'}
                  submissionWindow={(selectedTeam as any).submission_window || 1}
                  alreadySubmitted={alreadySubmitted}
                  onSubmit={() => {
                    loadTeamsData();
                  }}
                />

                <Card className="p-6">
                  <h3 className="font-semibold mb-6 flex justify-between items-center">
                    <span>📅 Progress History</span>
                    <span className="text-xs text-muted-foreground font-normal">{weeklyEntries.length} entries</span>
                  </h3>

                  <div className="space-y-6">
                    {weeklyEntries.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-muted rounded-xl">
                        <p className="text-sm text-muted-foreground italic">No progress logs submitted yet.</p>
                      </div>
                    ) : (
                      weeklyEntries.map((entry, idx) => (
                        <div key={entry.id} className="relative pl-6 border-l-2 border-primary/20 pb-6 last:pb-0">
                          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary ring-4 ring-background" />
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-sm">Week {entry.week_number}</h4>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                                  {new Date(entry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </p>
                              </div>
                              <div className="flex gap-1.5">
                                {entry.lab_attended && <span className="bg-blue-500/10 text-blue-600 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">🧪 Lab</span>}
                                {entry.demo_shown && <span className="bg-purple-500/10 text-purple-600 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">🖥️ Demo</span>}
                              </div>
                            </div>

                            <p className="text-sm text-foreground/80 bg-muted/30 p-3 rounded-lg border border-border/50 italic leading-relaxed">
                              "{entry.work_description}"
                            </p>

                            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">📅 <b>{entry.days_total}</b> days</span>
                              {entry.teacher_notes && (
                                <span className="text-orange-600 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                                  <b>Teacher:</b> {entry.teacher_notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>

              <div className="space-y-8">
                <Card className="p-6 border-border bg-card">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">🏁 Live Milestones from Mentor</h3>
                      <p className="text-xs text-muted-foreground mt-1">Real-time tasks specifically for your project team.</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-primary">
                        {milestones.filter(m => m.completed).length}/{milestones.length}
                      </span>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Completed</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {milestones.length === 0 ? (
                      <div className="py-8 text-center border-2 border-dashed border-muted rounded-xl">
                        <p className="text-sm text-muted-foreground italic">No milestones assigned yet by your mentor.</p>
                      </div>
                    ) : (
                      milestones.map((ms) => (
                        <div key={ms.id} className={`p-4 rounded-xl border transition-all ${ms.completed ? 'bg-green-500/5 border-green-500/20' : 'bg-muted/30 border-transparent hover:border-border'}`}>
                          <div className="flex items-start gap-4">
                            <div className="pt-1">
                              <input
                                type="checkbox"
                                checked={ms.completed || false}
                                disabled={ms.completed}
                                onChange={(e) => {
                                  const isDone = e.target.checked;
                                  setMilestones(prev => prev.map(m => m.id === ms.id ? { ...m, completed: isDone } : m));
                                }}
                                className={`w-5 h-5 rounded cursor-pointer accent-primary ${ms.completed ? 'opacity-50 cursor-not-allowed' : ''}`}
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <h4 className={`text-sm font-bold truncate ${ms.completed ? 'text-green-700' : 'text-foreground'}`}>
                                  {ms.description || 'Untitled Task'}
                                </h4>
                                {ms.deadline && (
                                  <span className="shrink-0 text-[9px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                    {new Date(ms.deadline).toLocaleDateString()}
                                  </span>
                                )}
                              </div>

                              <div className="mt-4 flex items-center justify-between">
                                <div className="text-[10px] uppercase font-black tracking-widest">
                                  {ms.completed ? (
                                    <span className="text-green-600 flex items-center gap-1">
                                      ✓ Finalized
                                    </span>
                                  ) : (
                                    <span className="text-orange-600">Pending</span>
                                  )}
                                </div>

                                {!ms.status || ms.status === 'pending' ? (
                                  <button
                                    onClick={async () => {
                                      const isChecked = ms.completed || false;
                                      const finalStatus = isChecked ? 'completed' : 'missed';

                                      const { error } = await (supabase
                                        .from('milestones') as any)
                                        .update({
                                          status: finalStatus,
                                          completed: isChecked,
                                          completed_at: isChecked ? new Date().toISOString() : null
                                        })
                                        .eq('id', ms.id);

                                      if (error) {
                                        alert("Finalization failed: " + error.message);
                                      } else {
                                        loadTeamsData(); // Refresh all projects/milestones
                                      }
                                    }}
                                    className={`px-3 py-1.5 text-primary-foreground rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm ${ms.completed ? 'bg-primary' : 'bg-red-500'}`}
                                  >
                                    {ms.completed ? 'Finalize Completion' : 'Finalize as Missed'}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
                <p className="text-[10px] text-muted-foreground mt-4 text-center px-4">
                  Completing a milestone will notify your teacher for progress review.
                </p>

                <Card className="p-6 mt-8">
                  <h3 className="font-semibold mb-4">Team Members</h3>
                  <div className="space-y-3">
                    {teamMembers.map(member => (
                      <div key={member.id} className="flex justify-between items-center text-sm">
                        <span>{member.name}</span>
                        {member.id === selectedTeam.leaderId && <span className="text-[10px] bg-primary/20 text-primary px-1.5 rounded font-bold uppercase tracking-wider">Lead</span>}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
