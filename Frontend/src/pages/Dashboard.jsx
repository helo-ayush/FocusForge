import React, { useState, useEffect } from 'react';
import { useUser, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import Navbar from '../components/Navbar';

const API_BASE = 'http://localhost:3000';

const FORGE_STEPS = [
  { icon: 'psychology', text: 'Analyzing your learning goal...', color: '#a78bfa' },
  { icon: 'auto_awesome', text: 'Designing your personalized curriculum...', color: '#22c55e' },
  { icon: 'travel_explore', text: 'Finding the best YouTube tutorials...', color: '#3b82f6' },
  { icon: 'video_library', text: 'Curating top-rated video lessons...', color: '#f59e0b' },
  { icon: 'checklist', text: 'Building your perfect learning planner...', color: '#ec4899' },
  { icon: 'rocket_launch', text: 'Almost there — launching your course!', color: '#22c55e' },
];

function ForgeProgressPanel() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev < FORGE_STEPS.length - 1 ? prev + 1 : prev));
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const progressPercent = ((activeStep + 1) / FORGE_STEPS.length) * 100;

  return (
    <div className="liquid-glass rounded-2xl p-8 relative overflow-hidden">
      {/* Animated background pulse */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        background: `radial-gradient(circle at 50% 50%, ${FORGE_STEPS[activeStep].color} 0%, transparent 70%)`,
        transition: 'background 0.8s ease'
      }}></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${FORGE_STEPS[activeStep].color}20` }}>
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: FORGE_STEPS[activeStep].color, borderTopColor: 'transparent' }}></div>
          </div>
          <span className="font-label text-xs uppercase tracking-widest" style={{ color: 'var(--theme-text-muted)' }}>Forging your path</span>
        </div>

        {/* Steps list */}
        <div className="space-y-3 mb-6">
          {FORGE_STEPS.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-3 transition-all duration-500"
              style={{
                opacity: i <= activeStep ? 1 : 0.2,
                transform: i <= activeStep ? 'translateX(0)' : 'translateX(8px)',
              }}
            >
              <span className="material-symbols-outlined text-lg transition-colors duration-500" style={{
                color: i < activeStep ? '#22c55e' : i === activeStep ? step.color : 'var(--theme-text-faint)'
              }}>
                {i < activeStep ? 'check_circle' : step.icon}
              </span>
              <span className="font-body text-sm transition-colors duration-500" style={{
                color: i === activeStep ? 'var(--theme-text-heading)' : i < activeStep ? 'var(--theme-text-body)' : 'var(--theme-text-faint)',
                fontWeight: i === activeStep ? 600 : 400
              }}>
                {step.text}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="progress-bar-track w-full h-1.5 rounded-full overflow-hidden">
          <div className="progress-bar-fill h-full rounded-full" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({ totalCourses: 0, completedSubtopics: 0, totalSubtopics: 0 });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');

  // Fetch user courses on mount
  useEffect(() => {
    if (!isLoaded || !user) return;
    fetchCourses();
  }, [isLoaded, user]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/course/user/${user.id}`);
      const data = await res.json();
      if (data.success) {
        setCourses(data.courses);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!query.trim() || creating) return;
    try {
      setCreating(true);

      // Step 1: Generate curriculum from Gemini via topic-generator
      const genRes = await fetch(`${API_BASE}/topic-generator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() })
      });
      const curriculum = await genRes.json();

      // Step 2: Save to MongoDB via our new route
      const saveRes = await fetch(`${API_BASE}/api/course/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkId: user.id,
          userName: user.firstName || user.fullName || 'Learner',
          llmCurriculum: {
            course_query: query.trim(),
            course_title: curriculum.course_title,
            modules: curriculum.modules.map(mod => ({
              module_id: mod.module_id,
              module_title: mod.module_title,
              subtopics: mod.subtopics.map(sub => ({
                subtopic_id: sub.subtopic_id,
                subtopic_title: sub.subtopic_title,
                Youtube_query: sub.youtube_search_query
              }))
            }))
          }
        })
      });
      const saveData = await saveRes.json();
      if (saveData.success) {
        setQuery('');
        await fetchCourses(); // Refresh the list
      }
    } catch (err) {
      console.error('Failed to create course:', err);
    } finally {
      setCreating(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}></div>
          <p className="font-body text-sm" style={{ color: 'var(--theme-text-body)' }}>Loading your forge...</p>
        </div>
      </div>
    );
  }

  // Skeleton loading cards
  const SkeletonCard = () => (
    <div className="dashboard-card rounded-2xl p-6">
      <div className="skeleton h-5 w-3/4 mb-4"></div>
      <div className="skeleton h-3 w-1/2 mb-6"></div>
      <div className="skeleton h-3 w-full mb-3"></div>
      <div className="skeleton h-9 w-full rounded-xl"></div>
    </div>
  );

  const completedCourses = courses.filter(c => c.progress === 100).length;
  const activeCourses = courses.filter(c => c.progress < 100).length;

  return (
    <>
      <Navbar />

      <SignedIn>
        <div className="fixed inset-0 z-0" style={{ background: 'var(--color-background)' }}></div>

        <main className="relative z-10 min-h-screen pt-28 pb-20 px-6 max-w-6xl mx-auto font-body">

          {/* ═══ Welcome Header ═══ */}
          <section className="mb-14 animate-blur-text" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              <span className="font-label text-xs uppercase tracking-widest" style={{ color: 'var(--theme-text-muted)' }}>Dashboard</span>
            </div>
            <h1 className="font-headline text-5xl md:text-6xl font-bold tracking-tight italic forge-gradient-text leading-tight">
              Welcome back, {user?.firstName || 'Learner'}
            </h1>
            <p className="mt-3 text-base max-w-lg" style={{ color: 'var(--theme-text-body)' }}>
              Your adaptive learning journey continues. Pick up where you left off or forge a new path.
            </p>
          </section>

          {/* ═══ Stats Row ═══ */}
          <section className="mb-12 grid grid-cols-1 sm:grid-cols-3 gap-5 animate-blur-text" style={{ animationDelay: '0.2s' }}>
            {[
              { icon: 'auto_stories', label: 'Active Courses', value: activeCourses, color: '#22c55e' },
              { icon: 'task_alt', label: 'Subtopics Cleared', value: stats.completedSubtopics, color: '#3b82f6' },
              { icon: 'emoji_events', label: 'Courses Completed', value: completedCourses, color: '#f59e0b' },
            ].map((stat, i) => (
              <div key={i} className="dashboard-card rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${stat.color}15` }}>
                  <span className="material-symbols-outlined text-2xl" style={{ color: stat.color }}>{stat.icon}</span>
                </div>
                <div>
                  <p className="text-2xl font-bold font-label" style={{ color: 'var(--theme-text-heading)' }}>{stat.value}</p>
                  <p className="text-xs font-label uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>{stat.label}</p>
                </div>
              </div>
            ))}
          </section>

          {/* ═══ Create Course ═══ */}
          <section className="mb-14 animate-blur-text" style={{ animationDelay: '0.3s' }}>
            {creating ? (
              <ForgeProgressPanel />
            ) : (
              <div className="liquid-glass rounded-2xl p-2 flex items-center">
                <input
                  className="bg-transparent border-none focus:ring-0 w-full px-6 py-3 font-body text-base outline-none transition-colors duration-400"
                  placeholder="What do you want to master today?"
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateCourse()}
                  style={{ color: 'var(--theme-text-heading)' }}
                />
                <button
                  onClick={handleCreateCourse}
                  disabled={!query.trim()}
                  className="forge-btn-primary text-on-primary px-8 py-3 rounded-full font-label text-sm font-black whitespace-nowrap active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-base">bolt</span>
                  Forge Path
                </button>
              </div>
            )}
          </section>

          {/* ═══ Courses Grid ═══ */}
          <section className="animate-blur-text" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-2xl font-bold italic" style={{ color: 'var(--theme-text-heading)' }}>Your Courses</h2>
              <span className="glass-pill px-3 py-1 rounded-full font-label text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                {courses.length} {courses.length === 1 ? 'course' : 'courses'}
              </span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : courses.length === 0 ? (
              /* Empty state */
              <div className="dashboard-card rounded-2xl p-12 text-center">
                <span className="material-symbols-outlined text-6xl mb-4 block" style={{ color: 'var(--theme-text-faint)' }}>school</span>
                <h3 className="font-headline text-xl italic mb-2" style={{ color: 'var(--theme-text-heading)' }}>No courses yet</h3>
                <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--theme-text-body)' }}>
                  Type a learning goal above and click <strong>Forge Path</strong> to generate your first AI-powered curriculum.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courses.map((course) => (
                  <div key={course._id} className="dashboard-card rounded-2xl p-6 flex flex-col justify-between">
                    {/* Card header */}
                    <div className="mb-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-headline text-lg font-bold italic leading-snug" style={{ color: 'var(--theme-text-heading)' }}>
                          {course.course_title}
                        </h3>
                        <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-label font-bold ${
                          course.progress === 100
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : course.progress > 0
                            ? 'bg-blue-500/15 text-blue-400'
                            : 'bg-gray-500/15 text-gray-400'
                        }`}>
                          {course.progress === 100 ? 'Completed' : course.progress > 0 ? 'In Progress' : 'New'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-label" style={{ color: 'var(--theme-text-muted)' }}>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">folder</span>
                          {course.totalModules} Modules
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">topic</span>
                          {course.totalSubtopics} Subtopics
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          {course.completedSubtopics} Done
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center text-xs font-label mb-2">
                        <span style={{ color: 'var(--theme-text-body)' }}>Progress</span>
                        <span className="font-bold" style={{ color: 'var(--theme-text-heading)' }}>{course.progress}%</span>
                      </div>
                      <div className="progress-bar-track w-full h-2 rounded-full overflow-hidden">
                        <div className="progress-bar-fill h-full rounded-full" style={{ width: `${course.progress}%` }}></div>
                      </div>
                    </div>

                    {/* Action */}
                    <button className="w-full py-2.5 rounded-xl text-sm font-bold font-label border cursor-pointer transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                      style={{
                        borderColor: 'var(--color-primary)',
                        color: 'var(--color-primary)',
                        background: 'transparent'
                      }}
                      onMouseEnter={e => { e.target.style.background = 'var(--color-primary)'; e.target.style.color = 'var(--color-on-primary)'; }}
                      onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--color-primary)'; }}
                    >
                      {course.progress === 100 ? 'Review Course' : course.progress > 0 ? 'Continue Learning' : 'Start Learning'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

        </main>
      </SignedIn>

      <SignedOut>
        <RedirectToSignIn redirectUrl="/" />
      </SignedOut>
    </>
  );
}
