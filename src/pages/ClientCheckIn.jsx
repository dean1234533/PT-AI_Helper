import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Dumbbell, CheckCircle, Loader, Send } from 'lucide-react';
import SEO from '../components/SEO';

export default function ClientCheckIn() {
  const { checkInId } = useParams();
  const [checkIn, setCheckIn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/get-checkin?id=${checkInId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); }
        else {
          setCheckIn(data);
          setAnswers(data.questions.map((q) => ({ question: q, answer: '' })));
        }
        setLoading(false);
      })
      .catch(() => { setError('Could not load your check-in. Please try the link again.'); setLoading(false); });
  }, [checkInId]);

  const updateAnswer = (i, val) =>
    setAnswers((prev) => prev.map((a, idx) => idx === i ? { ...a, answer: val } : a));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const empty = answers.findIndex((a) => !a.answer.trim());
    if (empty !== -1) {
      document.getElementById(`answer-${empty}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/submit-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkInId, answers }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch {
      alert('Something went wrong. Please try submitting again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1e1b4b] to-brand-700 flex items-center justify-center">
        <Loader className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1e1b4b] to-brand-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Link not found</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // ── Submitted ──
  if (submitted) {
    return (
      <>
        <SEO title="Check-in Submitted" noIndex />
        <div className="min-h-screen bg-gradient-to-br from-[#1e1b4b] to-brand-700 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Thank you!</h2>
            <p className="text-gray-600 mb-2">
              Your responses have been sent to <strong>{checkIn?.trainerName}</strong>.
            </p>
            <p className="text-gray-500 text-sm leading-relaxed">
              They'll review your answers and be in touch soon — likely with a video call to discuss your progress and any adjustments to your plan.
            </p>
            <div className="mt-6 bg-brand-50 rounded-xl p-4">
              <p className="text-brand-700 text-sm font-medium">Keep up the great work! 💪</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Check-in already answered ──
  if (checkIn?.status === 'answered' || checkIn?.status === 'reviewed' || checkIn?.status === 'call_scheduled') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1e1b4b] to-brand-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Already submitted</h2>
          <p className="text-gray-500 text-sm">You've already answered this check-in. Your trainer will be in touch soon.</p>
        </div>
      </div>
    );
  }

  // ── Main form ──
  return (
    <>
      <SEO title={`Check-in with ${checkIn?.trainerName}`} noIndex />
      <div className="min-h-screen bg-gradient-to-br from-[#1e1b4b] to-[#312e81]">
        {/* Header */}
        <div className="px-4 py-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">PT AI Helper</span>
          </div>
          <p className="text-white/60 text-sm">Check-in from {checkIn?.trainerName}</p>
        </div>

        {/* Form card */}
        <div className="max-w-xl mx-auto px-4 pb-12">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Greeting */}
            <div className="bg-gradient-to-r from-brand-600 to-purple-700 px-6 py-5">
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-1">Check-in for {checkIn?.clientName}</p>
              <p className="text-white text-lg font-semibold leading-snug">
                {checkIn?.greeting || `Hi ${checkIn?.clientName}, your trainer wants to check in on your progress!`}
              </p>
            </div>

            {/* Questions */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <p className="text-sm text-gray-500 leading-relaxed">
                Take a few minutes to answer the questions below. Your honest responses help {checkIn?.trainerName} tailor your plan and get the most out of your next session.
              </p>

              {answers.map((item, i) => (
                <div key={i}>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    <span className="text-brand-500 mr-2">{i + 1}.</span>{item.question}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <textarea
                    id={`answer-${i}`}
                    value={item.answer}
                    onChange={(e) => updateAnswer(i, e.target.value)}
                    required
                    rows={3}
                    placeholder="Your answer…"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none hover:border-gray-300 transition-colors"
                  />
                </div>
              ))}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-base"
              >
                {submitting
                  ? <><Loader className="w-5 h-5 animate-spin" /> Submitting…</>
                  : <><Send className="w-5 h-5" /> Send My Answers</>
                }
              </button>

              <p className="text-center text-xs text-gray-400">
                Your responses go directly to {checkIn?.trainerName} and are kept private.
              </p>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
