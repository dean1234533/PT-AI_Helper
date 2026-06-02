import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Video, Lightbulb, MessageSquare, CheckCircle2,
  Clock, ArrowLeft, Brain, Phone,
} from 'lucide-react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import Layout, { Breadcrumb } from '../components/Layout';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { Textarea } from '../components/ui/Input';
import { PageLoader } from '../components/ui/LoadingSpinner';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';

function StatusStep({ label, done, active }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${active ? 'text-brand-700 font-semibold' : done ? 'text-accent-600' : 'text-gray-400'}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${active ? 'bg-brand-600 text-white' : done ? 'bg-accent-500 text-white' : 'bg-gray-200'}`}>
        {done ? <CheckCircle2 className="w-3 h-3" /> : <span className="text-xs">{active ? '●' : '○'}</span>}
      </div>
      {label}
    </div>
  );
}

export default function CheckInDetail() {
  const { checkInId } = useParams();
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [callModal, setCallModal] = useState(false);
  const [callLink, setCallLink] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [sendingCall, setSendingCall] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'checkIns', checkInId)).then((snap) => {
      if (snap.exists()) setCheckIn({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
  }, [checkInId]);

  const markReviewed = async () => {
    await updateDoc(doc(db, 'checkIns', checkInId), { status: 'reviewed', reviewedAt: serverTimestamp() });
    setCheckIn((c) => ({ ...c, status: 'reviewed' }));
    toast.success('Marked as reviewed');
  };

  const generateInsights = async () => {
    if (!checkIn?.answers?.length) return;
    setGeneratingInsights(true);
    try {
      const res = await fetch('/api/checkin-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: checkIn.clientName,
          questions: checkIn.questions,
          answers: checkIn.answers,
          planSummary: checkIn.planSummary || null,
        }),
      });
      if (!res.ok) throw new Error();
      const { insights } = await res.json();
      await updateDoc(doc(db, 'checkIns', checkInId), { aiInsights: insights });
      setCheckIn((c) => ({ ...c, aiInsights: insights }));
      toast.success('AI insights generated');
    } catch {
      toast.error('Failed to generate insights');
    } finally {
      setGeneratingInsights(false);
    }
  };

  const handleScheduleCall = async () => {
    if (!callLink) { toast.error('Enter a video call link'); return; }
    setSendingCall(true);
    try {
      const res = await fetch('/api/schedule-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: checkIn.clientEmail,
          clientName: checkIn.clientName,
          trainerName: checkIn.trainerName,
          videoCallLink: callLink,
          callNotes,
        }),
      });
      if (!res.ok) throw new Error();
      await updateDoc(doc(db, 'checkIns', checkInId), {
        status: 'call_scheduled',
        videoCallLink: callLink,
        callScheduledAt: serverTimestamp(),
      });
      setCheckIn((c) => ({ ...c, status: 'call_scheduled', videoCallLink: callLink }));
      toast.success(`Video call invitation sent to ${checkIn.clientName}`);
      setCallModal(false);
    } catch {
      toast.error('Failed to send call invitation');
    } finally {
      setSendingCall(false);
    }
  };

  const markCallComplete = async () => {
    await updateDoc(doc(db, 'checkIns', checkInId), { status: 'call_completed', callCompletedAt: serverTimestamp() });
    setCheckIn((c) => ({ ...c, status: 'call_completed' }));
    toast.success('Call marked as completed');
  };

  if (loading) return <PageLoader />;
  if (!checkIn) return <Layout><div className="p-8 text-gray-500">Check-in not found.</div></Layout>;

  const status = checkIn.status;
  const hasAnswers = checkIn.answers?.length > 0;
  const ts = (f) => { const v = checkIn[f]; if (!v) return null; return (v.toDate ? v.toDate() : new Date(v)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };

  return (
    <Layout>
      <SEO title={`Check-in — ${checkIn.clientName}`} noIndex />
      <div className="p-4 sm:p-8 max-w-4xl mx-auto">
        <Breadcrumb items={[{ label: 'Check-ins', href: '/checkins' }, { label: `${checkIn.clientName}'s Check-in` }]} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{checkIn.clientName}'s Check-in</h1>
            <p className="text-gray-500 text-sm mt-1">{checkIn.clientEmail} · Sent {ts('sentAt') || ts('createdAt')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {status === 'answered' && (
              <Button variant="secondary" onClick={markReviewed} size="sm">
                <CheckCircle2 className="w-4 h-4" /> Mark Reviewed
              </Button>
            )}
            {(status === 'answered' || status === 'reviewed') && (
              <Button onClick={() => setCallModal(true)}>
                <Video className="w-4 h-4" /> Schedule Video Call
              </Button>
            )}
            {status === 'call_scheduled' && checkIn.videoCallLink && (
              <>
                <Button variant="secondary" onClick={markCallComplete} size="sm">
                  <CheckCircle2 className="w-4 h-4" /> Mark Call Done
                </Button>
                <a href={checkIn.videoCallLink} target="_blank" rel="noreferrer">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Video className="w-4 h-4" /> Join Video Call
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: status tracker */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Progress</p>
              <div className="space-y-3">
                <StatusStep label="Check-in Sent" done={true} active={false} />
                <StatusStep label="Client Responded" done={hasAnswers} active={status === 'sent'} />
                <StatusStep label="You Reviewed" done={['reviewed','call_scheduled','call_completed'].includes(status)} active={status === 'answered'} />
                <StatusStep label="Call Scheduled" done={['call_scheduled','call_completed'].includes(status)} active={status === 'reviewed'} />
                <StatusStep label="Call Completed" done={status === 'call_completed'} active={status === 'call_scheduled'} />
              </div>
            </div>

            {checkIn.videoCallLink && (
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Video Call</p>
                <a href={checkIn.videoCallLink} target="_blank" rel="noreferrer" className="text-sm text-purple-700 font-medium hover:text-purple-800 break-all underline">
                  {checkIn.videoCallLink}
                </a>
                {ts('callScheduledAt') && <p className="text-xs text-purple-500 mt-1">Scheduled {ts('callScheduledAt')}</p>}
              </div>
            )}

            {checkIn.greeting && (
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">AI Greeting Sent</p>
                <p className="text-sm text-gray-700 italic">"{checkIn.greeting}"</p>
              </div>
            )}
          </div>

          {/* Right: questions + answers */}
          <div className="lg:col-span-2 space-y-4">
            {/* Questions & Answers */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-brand-500" /> Questions & Responses
                </p>
                {!hasAnswers && (
                  <span className="text-xs text-yellow-700 bg-yellow-100 px-2.5 py-1 rounded-full font-medium">Awaiting reply</span>
                )}
              </div>

              {checkIn.questions?.length > 0 ? (
                <div className="space-y-5">
                  {checkIn.questions.map((q, i) => {
                    const answer = checkIn.answers?.[i];
                    return (
                      <div key={i} className="border-b border-gray-50 last:border-0 pb-5 last:pb-0">
                        <p className="text-sm font-semibold text-gray-800 mb-2">
                          <span className="text-brand-500 mr-2">{i + 1}.</span> {q}
                        </p>
                        {answer?.answer ? (
                          <div className="bg-blue-50 rounded-xl p-3">
                            <p className="text-sm text-gray-700 leading-relaxed">{answer.answer}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 italic">No answer yet</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Questions not yet generated.</p>
              )}
            </div>

            {/* AI Insights */}
            {hasAnswers && (
              <div className={`rounded-2xl border p-5 ${checkIn.aiInsights ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-gray-900 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-amber-500" /> AI Analysis
                  </p>
                  {!checkIn.aiInsights && (
                    <Button size="sm" variant="secondary" onClick={generateInsights} loading={generatingInsights}>
                      <Lightbulb className="w-4 h-4" /> Generate Insights
                    </Button>
                  )}
                </div>
                {checkIn.aiInsights ? (
                  <div className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">{checkIn.aiInsights}</div>
                ) : (
                  <p className="text-sm text-gray-400">Click "Generate Insights" to get an AI analysis of the client's responses — including key concerns and talking points for your video call.</p>
                )}
              </div>
            )}

            {/* Trainer notes on the call */}
            {status === 'call_completed' && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <p className="text-sm font-semibold text-green-800 flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4" /> Video call completed
                </p>
                <p className="text-xs text-green-700">{ts('callCompletedAt')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Call Modal */}
      <Modal open={callModal} onClose={() => setCallModal(false)} title="Schedule Video Call">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">Ready to call {checkIn.clientName}?</p>
            <p>You've reviewed their check-in responses. Enter your video call link below and we'll send them an invitation email.</p>
          </div>

          {checkIn.aiInsights && (
            <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-800">
              <strong>Key talking points from AI analysis:</strong>
              <p className="mt-1 line-clamp-3">{checkIn.aiInsights}</p>
            </div>
          )}

          <Input
            label="Your video call link *"
            type="url"
            value={callLink}
            onChange={(e) => setCallLink(e.target.value)}
            placeholder="https://meet.google.com/your-link or https://zoom.us/j/..."
            hint="Paste your Google Meet, Zoom, Teams, or any other video call link"
          />
          <Textarea
            label="Message to client (optional)"
            value={callNotes}
            onChange={(e) => setCallNotes(e.target.value)}
            placeholder="e.g. Great responses — let's jump on a call to talk through the next steps. Looking forward to chatting!"
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCallModal(false)}>Cancel</Button>
            <Button onClick={handleScheduleCall} loading={sendingCall} disabled={!callLink} className="bg-purple-600 hover:bg-purple-700">
              <Video className="w-4 h-4" /> Send Call Invitation
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
