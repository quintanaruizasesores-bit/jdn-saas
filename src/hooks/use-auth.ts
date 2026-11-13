'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let requestId = 0;

    const load = async () => {
      const currentRequest = ++requestId;
      setProfile(null);
      setLoading(true);
      const { data: { user: u } } = await supabase.auth.getUser();
      if (currentRequest !== requestId) return;
      setUser(u);
      if (u) {
        const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single();
        if (currentRequest !== requestId) return;
        setProfile(data);
      }
      setLoading(false);
    };

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setProfile(null);
      load();
    });

    return () => {
      requestId++;
      subscription.unsubscribe();
    };
  }, []);

  return { user, profile, loading };
}
