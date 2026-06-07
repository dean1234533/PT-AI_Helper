import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PublicCheckIn() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [checkIn, setCheckIn] = useState(null);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    if (!id) {
      setError('Missing check-in ID.');
      setLoading(false);
      return;
    }

    const loadCheckIn = async () => {
      try {
        const response = await fetch(`/api/get-checkin?id=${encodeURIComponent(id)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load check-in.');
        }

        setCheckIn(data);
        setSubmitted(data.status === 'answered');
        setAnswers(
          (data.questions || []).map((question, index) => ({
            question,
            answer: data.answers?.[index]?.answer || '',
          }))
        );
      } catch (err) {
        setError(err.message || 'Failed to load check-in.');
      } finally {
        setLoading(false);
      }
    };

    loadCheckIn();
  }, [id]);

  const isComplete = useMemo(
    () => answers.length > 0 && answers.every((item) => item.answer.trim()),
    [answers]
  );

  const updateAnswer = (index, value) => {
    setAnswers((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, answer: value } : item
      )
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isComplete) {
      toast.error('Please answer every question.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/submit-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkInId: id, answers }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit check-in.');
      }

      setSubmitted(true);
      toast.success('Check-in submitted successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to submit check-in.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <p className="text-sm text-slate-300">Loading your check-in...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
          <h1 className="text-2xl font-bold mb-3">Check-in unavailable</h1>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
          <h1 className="text-3xl font-bold mb-3">Thank you</h1>
          <p className="text-slate-300 text-sm leading-6">
            Your check-in has been submitted successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8">
          <h1 className="text-3xl font-bold mb-2">Weekly Check-in</h1>
          <p className="text-slate-400 text-sm mb-6">
            {checkIn?.greeting || `Hi ${checkIn?.clientName || ''}, please answer your weekly check-in.`}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {answers.map((item, index) => (
              <div key={`${index}-${item.question}`} className="space-y-2">
                <label className="block text-sm font-semibold text-slate-200">
                  {index + 1}. {item.question}
                </label>
                <textarea
                  value={item.answer}
                  onChange={(event) => updateAnswer(index, event.target.value)}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm outline-none"
                  placeholder="Type your answer here..."
                  required
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-2xl py-3 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Check-in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}