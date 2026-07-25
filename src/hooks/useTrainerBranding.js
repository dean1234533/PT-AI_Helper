import { useState, useEffect } from 'react';
import { useProfile } from './useProfile';
import { useIsManagedClient } from './useIsManagedClient';

// Fetches an invited client's trainer's client-portal branding. No-ops (and
// costs no network call) for solo/trainer accounts.
export function useTrainerBranding() {
  const { profile } = useProfile();
  const isManagedClient = useIsManagedClient();
  const [branding, setBranding] = useState({ brandName: null, brandColor: null, brandLogoBase64: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isManagedClient || !profile?.trainerId) return;
    setLoading(true);
    fetch(`/api/get-trainer-branding?trainerId=${encodeURIComponent(profile.trainerId)}`)
      .then((res) => res.json())
      .then((data) => setBranding({
        brandName: data.brandName || null,
        brandColor: data.brandColor || null,
        brandLogoBase64: data.brandLogoBase64 || null,
      }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isManagedClient, profile?.trainerId]);

  return { ...branding, loading };
}
