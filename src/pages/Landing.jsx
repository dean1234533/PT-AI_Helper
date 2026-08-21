import { Link } from 'react-router-dom';
import { Dumbbell, Zap, Brain, TrendingUp, ChevronRight, CheckCircle } from 'lucide-react';

const features = [
  { icon: Brain,      title: 'AI Body Analysis',     desc: 'Upload a photo and Gemini Vision identifies your body type with personalised recommendations.' },
  { icon: Dumbbell,   title: 'Custom Workout Plans', desc: 'Weekly plans tailored to your body type, goals, equipment and available time.' },
  { icon: TrendingUp, title: 'Smart Check-ins',      desc: 'Log weekly progress. AI compares and adjusts your plan automatically each week.' },
  { icon: Zap,        title: 'AI Coach On-Demand',   desc: 'Chat with your AI coach any time about nutrition, exercises, or motivation.' },
];

const steps = [
  { num: '01', title: 'Choose Your Access',   desc: 'Pick Personal for your own programme or PT Pro to manage your clients.' },
  { num: '02', title: 'Build Your Profile',   desc: 'Tell us about yourself — goals, diet, equipment, and upload a body photo.' },
  { num: '03', title: 'Get Your Plan',        desc: 'AI generates a complete weekly workout and nutrition plan tailored to you.' },
  { num: '04', title: 'Track & Improve',      desc: 'Log weekly check-ins and watch your AI coach refine your plan over time.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-dark-800 text-white overflow-x-hidden">
      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-dark-800/80 backdrop-blur-xl border-b border-white/6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
              <img src="/logo.png" alt="" className="w-9 h-9 object-contain" />
            </div>
            <span className="font-bold text-lg tracking-tight">DB's Workouts</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/pricing" className="hidden sm:inline text-white/60 hover:text-white text-sm font-medium transition-colors">
              Pricing
            </Link>
            <Link to="/login" className="text-white/60 hover:text-white text-sm font-medium transition-colors">
              Sign in
            </Link>
            <Link
              to="/register"
              className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-glow-violet hover:shadow-lg"
            >
              Get Started
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
            <span className="text-brand-300 text-xs font-semibold tracking-wide uppercase">Built by a real personal trainer</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-none mb-6 animate-fade-in-up stagger">
            <span className="gradient-text">Your Personal</span>
            <br />
            <span className="text-white">AI Fitness Coach</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/55 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            Personalised workouts, complete nutrition planning, exercise demonstrations and
            weekly progress support—delivered through one focused coaching app.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all shadow-glow-violet hover:shadow-lg hover:-translate-y-0.5"
            >
              View Memberships <ChevronRight className="w-5 h-5" />
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
            {['Personal and PT Pro access', 'Secure Stripe payment', 'Built by DB’s Workouts'].map((t) => (
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
          <p className="text-white/50 mb-8">Choose your membership and start building a programme around your real goals and routine.</p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold px-10 py-4 rounded-2xl text-base transition-all shadow-glow-violet hover:shadow-lg"
          >
            View Memberships <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-white/25 text-xs px-4">
        <p>DB's Workouts — professional training and nutrition coaching in one app.</p>
        <p className="mt-3">
          <a
            href="https://wa.me/447752300937?text=Hi%2C%20I%20need%20help%20with%20the%20DB%27s%20Workouts%20app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[#25D366]/60 hover:text-[#25D366] transition-colors font-medium"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Need help? Message us on WhatsApp
          </a>
        </p>
      </footer>
    </div>
  );
}
