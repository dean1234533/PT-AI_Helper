import { useLocalStorage } from './useLocalStorage';

export const CHAT_KEY = 'fitai_chat';

export function useChat() {
  const [messages, setMessages] = useLocalStorage(CHAT_KEY, []);

  const addMessage = (role, content) => {
    const msg = { id: `msg_${Date.now()}`, role, content, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, msg]);
    return msg;
  };

  const clearHistory = () => setMessages([]);

  return { messages, addMessage, clearHistory };
}
