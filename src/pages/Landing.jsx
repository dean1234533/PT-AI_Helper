import { Link } from 'react-router-dom';
import {
  Dumbbell, Brain, Camera, Mail, ClipboardList, CheckCircle,
  ArrowRight, Star, Zap, Shield, Clock, ChevronDown,
} from 'lucide-react';
import SEO from '../components/SEO';

// ── Reusable section wrapper ──────────────────────────────────────────────────
function Section({ children, className = '' }) {
  return <section className={`px-4 sm:px-6 lg:px-8 ${className}`}>{children}</section>;
}

// ── Pricing card ─────────────────────────────────────────────────────────────
function PricingCard({ plan, price, period, features, cta, ctaHref, highlight, badge }) {
  return (
    <div className={`relative flex flex-col rounded-2xl p-8 ${highlight ? 'bg-gradient-to-b from-brand-600 to-brand-700 text-white shadow-2xl shadow-brand-500/30 scale-105' : 'bg-white border border-gray-200 shadow-sm'}`}>
      {badge && (
        <span className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1.5 rounded-full ${highlight ? 'bg-yellow-400 text-yellow-900' : 'bg-brand-100 text-brand-700'}`}>
          {badge}
        </span>
      )}
      <div className="mb-6">
        <p className={`text-sm font-semibold uppercase tracking-wide mb-2 ${highlight ? 'text-white/70' : 'text-gray-500'}`}>{plan}</p>
        <div className="flex items-end gap-1">
          <span className={`text-5xl font-black ${highlight ? 'text-white' : 'text-gray-900'}`}>{price}</span>
          {period && <span className={`text-sm mb-2 ${highlight ? 'text-white/60' : 'text-gray-400'}`}>{period}</span>}
        </div>
      </div>
      <ul className="space-y-3 flex-1 mb-8">
        {features.map((f) => (
          <li key={f.text} className="flex items-start gap-2.5">
            <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${f.muted ? (highlight ? 'text-white/30' : 'text-gray-300') : (highlight ? 'text-white' : 'text-brand-500')}`} />
            <span className={`text-sm ${f.muted ? (highlight ? 'text-white/40 line-through' : 'text-gray-300 line-through') : (highlight ? 'text-white/90' : 'text-gray-700')}`}>{f.text}</span>
          </li>
        ))}
      </ul>
      <Link
        to={ctaHref}
        className={`block text-center py-3.5 rounded-xl font-semibold text-sm transition-all ${highlight ? 'bg-white text-brand-700 hover:bg-gray-50 shadow-lg' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
      >
        {cta}
      </Link>
    </div>
  );
}

// ── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    pink: 'bg-pink-50 text-pink-600',
    indigo: 'bg-brand-50 text-brand-600',
  };
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

// ── Step card ─────────────────────────────────────────────────────────────────
function StepCard({ num, title, desc }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-md shadow-brand-200">
        {num}
      </div>
      <div>
        <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <>
      <SEO
        canonical={import.meta.env.VITE_APP_URL}
        description="Generate fully personalised AI nutrition and workout plans for your personal training clients in seconds. Powered by Claude AI with real USDA food data and verified exercise databases."
      />

      <div className="min-h-screen bg-white">

        {/* ── Nav ──────────────────────────────────────────────────────────── */}
        <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-lg">PT AI Helper</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
              <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
              <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Sign in</Link>
              <Link to="/register" className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                Start free
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <Section className="pt-20 pb-24 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-sm font-semibold px-4 py-2 rounded-full mb-8 border border-brand-100">
            <Zap className="w-3.5 h-3.5" />
            Powered by Claude AI + Real USDA & Exercise Data
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 leading-tight tracking-tight mb-6">
            AI plans your clients<br />
            <span className="bg-gradient-to-r from-brand-600 to-purple-600 bg-clip-text text-transparent">will actually follow</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Generate fully personalised nutrition and workout plans in under a minute.
            Built for personal trainers who want to deliver more — without the hours of prep work.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all hover:shadow-xl hover:shadow-brand-200 flex items-center justify-center gap-2"
            >
              Start for free <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold px-8 py-4 rounded-2xl text-lg transition-colors flex items-center justify-center gap-2">
              See how it works <ChevronDown className="w-5 h-5" />
            </a>
          </div>
          <p className="text-sm text-gray-400 mt-5">Free forever · No credit card needed · 3 plans/month on free tier</p>
        </Section>

        {/* ── Hero visual ──────────────────────────────────────────────────── */}
        <Section className="max-w-6xl mx-auto mb-24">
          <div className="bg-gradient-to-br from-[#1e1b4b] via-brand-700 to-purple-800 rounded-3xl p-1 shadow-2xl shadow-brand-500/20">
            <div className="bg-gradient-to-br from-[#1e1b4b] to-[#312e81] rounded-[22px] p-8">
              <div className="grid grid-cols-3 gap-4 text-white">
                {/* Mock dashboard preview */}
                <div className="col-span-1 bg-white/10 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wide">Clients</p>
                  {['Sarah J.', 'Mike T.', 'Emma R.', 'James L.'].map((n) => (
                    <div key={n} className="flex items-center gap-2.5 bg-white/5 rounded-xl px-3 py-2">
                      <div className="w-7 h-7 rounded-full bg-brand-400/40 text-white text-xs flex items-center justify-center font-bold shrink-0">{n[0]}</div>
                      <span className="text-sm text-white/80">{n}</span>
                    </div>
                  ))}
                </div>
                <div className="col-span-2 space-y-3">
                  <div className="bg-white/10 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-3">Sarah's Nutrition Plan</p>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[['2,100', 'Calories'], ['165g', 'Protein'], ['210g', 'Carbs']].map(([val, label]) => (
                        <div key={label} className="bg-white/10 rounded-xl p-2.5 text-center">
                          <p className="text-lg font-black text-white">{val}</p>
                          <p className="text-xs text-white/50">{label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      {[['Protein', '165g', 32, 'bg-brand-400'], ['Carbs', '210g', 40, 'bg-accent-400'], ['Fats', '73g', 28, 'bg-yellow-400']].map(([l, v, w, c]) => (
                        <div key={l} className="flex items-center gap-2">
                          <span className="text-xs text-white/50 w-12">{l}</span>
                          <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full rounded-full ${c}`} style={{ width: `${w}%` }} />
                          </div>
                          <span className="text-xs text-white/60 w-8">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">Monday Workout</p>
                    <div className="space-y-1.5">
                      {[['Bench Press', '4×8', '90s'], ['Incline DB Press', '3×12', '60s'], ['Cable Fly', '3×15', '45s']].map(([ex, sets, rest]) => (
                        <div key={ex} className="flex items-center justify-between text-sm">
                          <span className="text-white/80">{ex}</span>
                          <div className="flex gap-3">
                            <span className="text-brand-300 text-xs font-mono">{sets}</span>
                            <span className="text-white/30 text-xs">{rest}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Social proof strip ───────────────────────────────────────────── */}
        <Section className="max-w-5xl mx-auto mb-24">
          <div className="bg-gray-50 rounded-2xl px-8 py-6 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-center sm:text-left">
            {[['100+', 'Plans generated'], ['< 60s', 'Average generation time'], ['Real', 'USDA & exercise data'], ['£0', 'To get started']].map(([val, label]) => (
              <div key={label}>
                <p className="text-2xl font-black text-gray-900">{val}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <Section className="max-w-6xl mx-auto mb-24" id="features">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Everything a trainer needs</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">One tool from assessment to delivery — no stitching together spreadsheets and guesswork.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard icon={Brain} color="indigo" title="AI-Generated Plans" desc="Claude AI analyses every detail of the client questionnaire to generate truly personalised plans — not templates." />
            <FeatureCard icon={Camera} color="purple" title="Photo Analysis" desc="Upload a client photo for visual body composition assessment. The AI adjusts calorie targets and body fat estimates accordingly." />
            <FeatureCard icon={ClipboardList} color="green" title="Full Nutrition Plans" desc="Daily calorie and macro targets backed by real USDA food data. 7-day meal plans, shopping lists, hydration targets, and supplements." />
            <FeatureCard icon={Dumbbell} color="orange" title="Workout Programming" desc="Exercise plans built from the wger database, filtered to the client's exact equipment. Sets, reps, rest, warm-up, cool-down, and progression." />
            <FeatureCard icon={Mail} color="pink" title="Email to Client" desc="Send a beautifully formatted plan directly to the client's inbox. Professional HTML email with the full plan included." />
            <FeatureCard icon={Star} color="blue" title="Trainer Review & Edit" desc="Review every plan before it's sent. Add personal notes, request AI revisions with extra context, and approve with confidence." />
          </div>
        </Section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <Section className="max-w-4xl mx-auto mb-24" id="how-it-works">
          <div className="bg-gradient-to-br from-gray-50 to-brand-50/40 rounded-3xl p-10 border border-gray-100">
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">From zero to plan in 5 steps</h2>
              <p className="text-gray-500">No technical knowledge required.</p>
            </div>
            <div className="space-y-8">
              <StepCard num="1" title="Add your client" desc="Enter the client's name and email, or pick from your existing client list." />
              <StepCard num="2" title="Fill in the questionnaire" desc="6 focused steps covering goals, health history, lifestyle, diet, and fitness background. Takes 3–5 minutes." />
              <StepCard num="3" title="Optionally upload a photo" desc="Add a body composition photo for visual analysis. The AI uses it to refine calorie targets and assessment." />
              <StepCard num="4" title="Generate the plan" desc="AI pulls real food data from USDA and exercises from the wger database, then Claude builds a complete, personalised plan in under 60 seconds." />
              <StepCard num="5" title="Review, edit, and send" desc="Look over every section. Add your own notes. Request a revision if needed. Send to your client with one click." />
            </div>
          </div>
        </Section>

        {/* ── Pricing ──────────────────────────────────────────────────────── */}
        <Section className="max-w-4xl mx-auto mb-24" id="pricing">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Simple, honest pricing</h2>
            <p className="text-gray-500 text-lg">Start free. Upgrade when you're ready to scale.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center max-w-2xl mx-auto">
            <PricingCard
              plan="Free"
              price="£0"
              period="/month"
              cta="Get started free"
              ctaHref="/register"
              features={[
                { text: '3 AI plans per month' },
                { text: 'Full nutrition plans' },
                { text: 'Full workout plans' },
                { text: 'Photo analysis' },
                { text: 'Email delivery to clients' },
                { text: 'Trainer notes & revisions' },
              ]}
            />
            <PricingCard
              plan="Pro"
              price="£19"
              period="/month"
              cta="Upgrade to Pro"
              ctaHref="/register"
              highlight
              badge="Most popular"
              features={[
                { text: 'Unlimited AI plans' },
                { text: 'Full nutrition plans' },
                { text: 'Full workout plans' },
                { text: 'Photo analysis' },
                { text: 'Email delivery to clients' },
                { text: 'Trainer notes & revisions' },
                { text: 'Priority support' },
              ]}
            />
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">Cancel anytime · No lock-in · Secure payments via Stripe</p>
        </Section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <Section className="max-w-3xl mx-auto mb-24 text-center">
          <div className="bg-gradient-to-br from-brand-600 to-purple-700 rounded-3xl p-12 text-white shadow-2xl shadow-brand-500/20">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-6">
              <Dumbbell className="w-7 h-7" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black mb-4">Ready to upgrade your service?</h2>
            <p className="text-white/70 text-lg mb-8 max-w-lg mx-auto">
              Join trainers already using PT AI Helper to deliver better plans, faster — and impress every client.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-8 py-4 rounded-2xl text-lg hover:bg-gray-50 transition-colors shadow-xl"
            >
              Start free today <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </Section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer className="border-t border-gray-100 py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
                <Dumbbell className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-gray-700">PT AI Helper</span>
            </div>
            <p className="text-sm text-gray-400">© {new Date().getFullYear()} PT AI Helper. Built for personal trainers.</p>
            <div className="flex items-center gap-5 text-sm text-gray-400">
              <Link to="/login" className="hover:text-gray-600 transition-colors">Sign in</Link>
              <Link to="/register" className="hover:text-gray-600 transition-colors">Register</Link>
              <a href="#pricing" className="hover:text-gray-600 transition-colors">Pricing</a>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
