import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Trash2, Bot, User, Loader2, Bookmark, BookmarkCheck } from 'lucide-react';
import { useGemini } from '../contexts/GeminiContext';
import { useProfile } from '../hooks/useProfile';
import { usePlans } from '../hooks/usePlans';
import { useCheckIns } from '../hooks/useCheckIns';
import { useChat } from '../hooks/useChat';

const NOTES_KEY = 'dbsai_saved_notes';
const getSaved = () => JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
const persistSaved = (notes) => localStorage.setItem(NOTES_KEY, JSON.stringify(notes));

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 animate-fade-in">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shrink-0">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-brand-400 block" />
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-brand-400 block" />
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-brand-400 block" />
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ msg, onSave, saved }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex items-end gap-2 animate-fade-in-up ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        isUser ? 'bg-accent-500' : 'bg-gradient-to-br from-brand-500 to-brand-700'
      }`}>
        {isUser ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-white" />}
      </div>
      <div className="max-w-[78%] flex flex-col gap-1">
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
          isUser
            ? 'bg-brand-600 text-white rounded-br-sm'
            : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
        }`}>
          {msg.content}
        </div>
        {!isUser && (
          <button
            onClick={() => onSave(msg)}
            className={`self-start flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
              saved
                ? 'text-emerald-600 bg-emerald-50 border border-emerald-200'
                : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50 border border-transparent'
            }`}
          >
            {saved
              ? <><BookmarkCheck className="w-3 h-3" /> Saved</>
              : <><Bookmark className="w-3 h-3" /> Save note</>}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [savedNotes, setSavedNotes] = useState(getSaved);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { callAI } = useGemini();
  const { profile } = useProfile();
  const { currentPlan, analysis } = usePlans();
  const { latestCheckIn } = useCheckIns();
  const { messages, addMessage, clearHistory } = useChat();

  const handleSave = (msg) => {
    setSavedNotes(prev => {
      const already = prev.find(n => n.msgId === msg.id);
      let next;
      if (already) {
        next = prev.filter(n => n.msgId !== msg.id);
      } else {
        next = [{ id: Date.now(), msgId: msg.id, content: msg.content, savedAt: new Date().toISOString() }, ...prev];
      }
      persistSaved(next);
      return next;
    });
  };

  const deleteNote = (id) => {
    setSavedNotes(prev => {
      const next = prev.filter(n => n.id !== id);
      persistSaved(next);
      return next;
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const buildSystemContext = () => {
    const parts = [
      'You are an expert personal fitness coach and sports dietitian AI assistant built by a qualified personal trainer. Be warm, motivating, specific, and science-backed. Keep answers concise but actionable. Never suggest the user see another professional unless there is a genuine safety risk.',
    ];

    if (profile?.name) {
      parts.push(
        `\nUser Profile:\n- Name: ${profile.name}\n- Age: ${profile.age}\n- Weight: ${profile.weight}kg\n- Height: ${profile.height}cm\n- Gender: ${profile.gender}\n- Goal: ${profile.goal}\n- Training: ${profile.trainingDaysPerWeek} days/week, ${profile.sessionDuration} mins/session\n- Fitness level: ${profile.fitnessLevel}\n- Diet style: ${profile.dietaryStyle}\n- Allergies: ${profile.allergies?.join(', ') || 'none'}\n- Dietary restrictions: ${profile.dietaryRestrictions || 'none'}\n- Foods liked: ${profile.foodsLiked || 'not specified'}\n- Foods disliked: ${profile.foodsDisliked || 'not specified'}`
      );
    }

    if (analysis?.bodyType) {
      parts.push(
        `\nBody Type Analysis:\n- Somatotype: ${analysis.bodyType}\n- Macro split: Protein ${analysis.macros?.protein}% / Carbs ${analysis.macros?.carbs}% / Fat ${analysis.macros?.fat}%\n- Workout style: ${analysis.workoutStyle || 'not specified'}\n- Timeline: ${analysis.timeline || 'not specified'}`
      );
    }

    if (currentPlan) {
      const np = currentPlan.nutritionPlan;
      parts.push(
        `\nCurrent Plan (Week ${currentPlan.weekNumber}):\n- Daily calories target: ${np?.dailyTargetCalories} kcal\n- Daily macros: Protein ${np?.dailyMacros?.protein}g / Carbs ${np?.dailyMacros?.carbs}g / Fat ${np?.dailyMacros?.fat}g\n- Workout split: ${currentPlan.workoutPlan?.focus}`
      );

      // Today's workout
      const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
      const todayWorkout = currentPlan.workoutPlan?.days?.[todayIdx];
      if (todayWorkout) {
        if (todayWorkout.isRestDay) {
          parts.push(`\nToday's Workout: REST DAY — ${todayWorkout.dayName}`);
        } else {
          const exList = (todayWorkout.exercises || [])
            .map(e => `  • ${e.name}: ${e.sets} sets × ${e.reps} reps (${e.rest} rest)`)
            .join('\n');
          parts.push(`\nToday's Workout — ${todayWorkout.dayName} (${todayWorkout.focus}):\n${exList}`);
        }
      }

      // Today's meals
      const todayMeals = currentPlan.weeklyMealPlan?.[todayIdx];
      if (todayMeals) {
        const mealList = (todayMeals.meals || [])
          .map(m => {
            const cal = m.usdaCalories ?? m.calories;
            const p   = m.usdaProtein  ?? m.macros?.protein;
            const c   = m.usdaCarbs    ?? m.macros?.carbs;
            const f   = m.usdaFat      ?? m.macros?.fat;
            return `  • ${m.name} (${m.time}): ${cal}kcal — P${p}g C${c}g F${f}g\n    Ingredients: ${(m.ingredients || []).join(', ')}`;
          })
          .join('\n');
        parts.push(`\nToday's Meals — ${todayMeals.dayName}:\n${mealList}`);
      }
    }

    if (latestCheckIn) {
      parts.push(
        `\nLatest Check-in (${new Date(latestCheckIn.date).toLocaleDateString()}): weight ${latestCheckIn.weight}kg, energy ${latestCheckIn.energy}/10, mood ${latestCheckIn.mood}/10, workout adherence: ${latestCheckIn.adherenceWorkout}, nutrition adherence: ${latestCheckIn.adherenceNutrition}.`
      );
    }

    return parts.join('\n');
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || thinking) return;

    setInput('');
    addMessage('user', text);
    setThinking(true);

    try {
      const systemContext = buildSystemContext();
      const history = messages
        .slice(-10)
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

      const prompt = `${systemContext}\n\nConversation history:\n${history}\n\nUser: ${text}\n\nAssistant:`;

      const reply = await callAI(prompt);
      addMessage('assistant', reply.trim());
    } catch (err) {
      const isKeyError = err.message?.toLowerCase().includes('api key') || err.message?.toLowerCase().includes('settings');
      addMessage('assistant', isKeyError
        ? 'I need an API key to work. Please add your Gemini API key in Settings.'
        : 'Sorry, I had trouble connecting right now. Please try again in a moment.');
    } finally {
      setThinking(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        id="ai-chat-toggle"
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-glow-blue-brand flex items-center justify-center transition-all duration-300 ${
          open
            ? 'bg-gray-700 rotate-0 scale-90'
            : 'bg-gradient-to-br from-brand-500 to-brand-700 hover:scale-110'
        }`}
        aria-label="Toggle AI Chat"
      >
        {open ? <X className="w-5 h-5 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
        {!open && messages.length === 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-500 border-2 border-white animate-pulse" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] bg-white rounded-2xl shadow-card-hover border border-gray-100 flex flex-col animate-slide-right overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-700 to-brand-600 px-4 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">DB's AI Coach</p>
                <p className="text-brand-200 text-xs">Ask me anything about your plan</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSaved(s => !s)}
                className={`relative flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                  showSaved ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'
                }`}
                title="Saved notes"
              >
                <Bookmark className="w-4 h-4" />
                {savedNotes.length > 0 && (
                  <span className="bg-white text-brand-700 text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                    {savedNotes.length}
                  </span>
                )}
              </button>
              <button
                onClick={clearHistory}
                className="text-white/50 hover:text-white transition-colors"
                title="Clear history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages / Saved panel */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/60">
            {showSaved ? (
              savedNotes.length === 0 ? (
                <div className="text-center py-10 animate-fade-in">
                  <Bookmark className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-500">No saved notes yet</p>
                  <p className="text-xs text-gray-400 mt-1">Tap "Save note" under any AI reply</p>
                </div>
              ) : (
                <div className="space-y-3 animate-fade-in">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Saved Notes</p>
                  {savedNotes.map(note => (
                    <div key={note.id} className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm relative group">
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap pr-6">{note.content}</p>
                      <p className="text-[10px] text-gray-400 mt-2">{new Date(note.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="absolute top-2 right-2 text-gray-300 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 transition-all"
                        aria-label="Delete note"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <>
                {messages.length === 0 && (
                  <div className="text-center py-8 animate-fade-in">
                    <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-3">
                      <Bot className="w-7 h-7 text-brand-500" />
                    </div>
                    <p className="font-semibold text-gray-700 text-sm">Hi{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}! 👋</p>
                    <p className="text-gray-400 text-xs mt-1 max-w-[220px] mx-auto">
                      Ask me about your workout, nutrition, exercises, or motivation!
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                      {['What should I eat today?', 'Explain my body type', 'How can I build more muscle?'].map((q) => (
                        <button
                          key={q}
                          onClick={() => { setInput(q); inputRef.current?.focus(); }}
                          className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 hover:border-brand-300 hover:text-brand-600 transition-all"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    msg={msg}
                    onSave={handleSave}
                    saved={savedNotes.some(n => n.msgId === msg.id)}
                  />
                ))}
                {thinking && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 bg-white shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                placeholder="Ask your AI coach..."
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all max-h-24 min-h-[40px]"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || thinking}
                className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 shadow-sm"
              >
                {thinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
