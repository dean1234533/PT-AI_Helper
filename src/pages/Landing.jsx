import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Dumbbell, Zap, Brain, TrendingUp, ChevronRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const features = [
  { icon: Brain,      title: 'AI Body Analysis',     desc: 'Upload a photo and Gemini Vision identifies your body type with personalised recommendations.' },
  { icon: Dumbbell,   title: 'Custom Workout Plans', desc: 'Weekly plans tailored to your body type, goals, equipment and available time.' },
  { icon: TrendingUp, title: 'Smart Check-ins',      desc: 'Log weekly progress. AI compares and adjusts your plan automatically each week.' },
  { icon: Zap,        title: 'AI Coach On-Demand',   desc: 'Chat with your AI coach any time about nutrition, exercises, or motivation.' },
];

const steps = [
  { num: '01', title: 'Sign Up Free',         desc: 'Create your account and add your free Gemini API key from Google AI Studio.' },
  { num: '02', title: 'Build Your Profile',   desc: 'Tell us about yourself — goals, diet, equipment, and upload a body photo.' },
  { num: '03', title: 'Get Your Plan',        desc: 'AI generates a complete weekly workout and nutrition plan tailored to you.' },
  { num: '04', title: 'Track & Improve',      desc: 'Log weekly check-ins and watch your AI coach refine your plan over time.' },
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user]);

  return (
    <div className="min-h-screen bg-dark-800 text-white overflow-x-hidden">
      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-dark-800/80 backdrop-blur-xl border-b border-white/6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-violet">
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">FitAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-white/60 hover:text-white text-sm font-medium transition-colors">
              Sign in
            </Link>
            <Link
              to="/register"
              className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-glow-violet hover:shadow-lg"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl blob animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-500/15 rounded-full blur-3xl blob animate-pulse-slow" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-900/30 rounded-full blur-3xl" />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '60px 60px' }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/25 rounded-full px-4 py-1.5 mb-8 animate-fade-in">
            <Zap className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-brand-300 text-xs font-semibold tracking-wide uppercase">Powered by Gemini AI</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-none mb-6 animate-fade-in-up stagger">
            <span className="gradient-text">Your Personal</span>
            <br />
            <span className="text-white">AI Fitness Coach</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/55 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            Upload your photo, get a body type analysis, and receive a fully personalised
            workout and nutrition plan — all powered by Gemini AI. Free with your own API key.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all shadow-glow-violet hover:shadow-lg hover:-translate-y-0.5"
            >
              Start For Free <ChevronRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/12 text-white font-semibold px-8 py-4 rounded-2xl text-base transition-all"
            >
              Sign In
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 animate-fade-in" style={{ animationDelay: '350ms' }}>
            {['No subscription required', 'Your data stays private', 'Powered by Google Gemini'].map((t) => (
              <div key={t} className="flex items-center gap-2 text-white/40 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-accent-500" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-4 sm:px-6 bg-dark-700/60 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-3">What you get</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Everything you need to transform</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="animate-fade-in-up group relative bg-dark-600/50 border border-white/6 hover:border-brand-500/30 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1">
                <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center mb-4 group-hover:bg-brand-500/25 transition-colors">
                  <Icon className="w-5 h-5 text-brand-400" />
                </div>
                <h3 className="font-bold text-white mb-2 text-sm">{title}</h3>
                <p className="text-white/45 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-accent-400 text-sm font-semibold uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Up and running in minutes</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger">
            {steps.map(({ num, title, desc }) => (
              <div key={num} className="animate-fade-in-up relative">
                <div className="text-5xl font-black text-brand-500/20 mb-4 leading-none">{num}</div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to transform?</h2>
          <p className="text-white/50 mb-8">Get a fully personalised AI fitness plan — free, private, and no subscription required.</p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold px-10 py-4 rounded-2xl text-base transition-all shadow-glow-violet hover:shadow-lg"
          >
            Get Started Free <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-white/25 text-xs px-4">
        FitAI — Personal AI Fitness Coach. Your data is stored locally on your device only.
      </footer>
    </div>
  );
}
