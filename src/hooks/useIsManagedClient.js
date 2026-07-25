import { useProfile } from './useProfile';

// True for accounts created via a trainer's invite link. Used to keep AI/Gemini
// mechanics out of client-facing copy while trainers still see how it works.
export function useIsManagedClient() {
  const { profile } = useProfile();
  return Boolean(profile?.trainerId);
}
