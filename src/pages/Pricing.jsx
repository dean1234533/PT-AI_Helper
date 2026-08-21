import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BadgeCheck, Check, Dumbbell, ExternalLink,
  ShieldCheck, Sparkles, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const plans = [
  {
    id: 'personal',
    audience: 'For your own training',
    name: 'Personal',
    price: '7.99',
    icon: Dumbbell,
    description: 'A complete workout and nutrition programme that adapts around your body, goals and routine.',
    features: [
      'Personalised 7-day workout programme',
      'Full meal plan, calories and macros',
      'Exercise video demonstrations',
      'Weekly check-ins and plan adjustments',
      'Meal swaps and nutrition preferences',
      'Progress photos and body analysis',
    ],
  },
  {
    id: 'pt_pro',
    audience: 'For personal trainers',
    name: 'PT Pro',
    price: '24.99',
    icon: Users,
    featured: true,
    description: 'A branded coaching workspace to build, deliver and manage every client plan in one place.',
    features: [
      'Everything included in Personal',
      'Client dashboard and profile management',
      'Branded workout and nutrition delivery',
      'Full client meal plans and daily macros',
      'YouTube demos for every exercise',
      'Check-ins and progress tracking',
      'Priority support',
    ],
  },
];

export default function Pricing() {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(null);

  const startCheckout = async (plan) => {
    if (!user) {
      window.location.assign(`/register?plan=${plan}`);
      return;
    }
    setLoadingPlan(plan);
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          userId: user.uid,
          userEmail: user.email,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'Checkout could not be started.');
      window.location.assign(data.url);
    } catch (error) {
      toast.error(error.message || 'Checkout could not be started. Please try again.');
      setLoadingPlan(null);
    }
  };

  return (
    <div className="pricing-page min-h-screen text-white">
      <header className="pricing-nav">
        <Link to={user ? '/dashboard' : '/login'} className="pricing-brand" aria-label="DB's Workouts app home">
          <span><img src="/logo.png" alt="" /></span>
          <span><strong>DB's Workouts</strong><small>Coaching app</small></span>
        </Link>
        <div className="pricing-nav-actions">
          <a href="https://dbworkouts.co.uk" className="pricing-site-link">
            Main website <ExternalLink />
          </a>
          <Link to={user ? '/dashboard' : '/login'} className="pricing-back-link">
            <ArrowLeft /> {user ? 'Dashboard' : 'Log in'}
          </Link>
        </div>
      </header>

      <main className="pricing-main">
        <section className="pricing-hero">
          <div className="pricing-eyebrow"><Sparkles /> Memberships</div>
          <h1>Professional coaching.<br /><span>One clear monthly price.</span></h1>
          <p>Choose personal access for your own plan, or PT Pro to run your coaching business from the app.</p>
          <div className="pricing-trust-row">
            <span><ShieldCheck /> Secure Stripe payment</span>
            <span><BadgeCheck /> Cancel anytime</span>
            <span><Check /> No setup fee</span>
          </div>
        </section>

        <section className="app-pricing-grid" aria-label="Membership options">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <article key={plan.id} className={`app-pricing-card ${plan.featured ? 'is-featured' : ''}`}>
                {plan.featured && <span className="pricing-choice">Coach's choice</span>}
                <div className="pricing-card-heading">
                  <span className="pricing-plan-icon"><Icon /></span>
                  <div><small>{plan.audience}</small><h2>{plan.name}</h2></div>
                </div>
                <p className="pricing-plan-description">{plan.description}</p>
                <div className="pricing-value"><sup>£</sup><strong>{plan.price}</strong><span>/ month</span></div>
                <div className="pricing-divider" />
                <ul>
                  {plan.features.map((feature) => <li key={feature}><Check /> <span>{feature}</span></li>)}
                </ul>
                <button onClick={() => startCheckout(plan.id)} disabled={Boolean(loadingPlan)}>
                  {loadingPlan === plan.id ? 'Opening secure checkout…' : `Choose ${plan.name}`}
                  {!loadingPlan && <ArrowRight />}
                </button>
              </article>
            );
          })}
        </section>

        <section className="pricing-footer-panel">
          <div><small>Prefer one-to-one coaching?</small><strong>Train with Dean in East London.</strong></div>
          <a href="https://dbworkouts.co.uk/pricing">View personal training prices <ArrowRight /></a>
        </section>
      </main>
    </div>
  );
}
