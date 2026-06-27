import { create } from 'zustand';
import { supabase } from '../lib/supabase';
// import { useDownloadStore } from './downloadStore';
import { useSettingsStore } from './settingsStore';

export type UserRole = 'student' | 'teacher' | 'admin';

export interface AppUser {
  user_metadata: any;
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole | null;
  profileImage: string | null;
  phone?: string | null;
  address?: string | null;
  bio?: string | null;
  class_name?: string | null;
  profession?: string | null;
  streak_count?: number;
}

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  isInitialized: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  signUpWithEmail: (
    name: string,
    email: string,
    password: string,
    phone: string | null,
    role: UserRole
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<AppUser>) => void;
  resetPasswordForEmail: (email: string) => Promise<void>;
}

async function fetchUserProfile(userId: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, profile_image, phone, address, bio, class_name, streak_count')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    user_metadata: undefined,
    id: data.id,
    name: data.name ?? null,
    email: data.email ?? null,
    role: data.role ?? null,
    profileImage: data.profile_image ?? null,
    phone: data.phone ?? null,
    address: data.address ?? null,
    bio: data.bio ?? null,
    class_name: data.class_name ?? null,
    streak_count: data.streak_count ?? 1,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  isInitialized: false,
  error: null,
  initialize: async () => {
    set({ loading: true, error: null });
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.user) {
        set({ user: null, loading: false, isInitialized: true, error: null });
        return;
      }

      const profile = await fetchUserProfile(session.user.id);

      const appUser: AppUser = {
        id: session.user.id,
        name: profile?.name ?? session.user.user_metadata?.name ?? null,
        email: profile?.email ?? session.user.email ?? null,
        role: profile?.role ?? session.user.user_metadata?.role ?? null,
        profileImage: profile?.profileImage ?? session.user.user_metadata?.profile_image ?? null,
        phone: profile?.phone ?? session.user.user_metadata?.phone ?? null,
        address: profile?.address ?? session.user.user_metadata?.address ?? null,
        bio: profile?.bio ?? session.user.user_metadata?.bio ?? null,
        class_name: profile?.class_name ?? session.user.user_metadata?.class_name ?? null,
        streak_count: profile?.streak_count ?? session.user.user_metadata?.streak_count ?? 1,
        user_metadata: session.user.user_metadata
      };

      set({ user: appUser, loading: false, isInitialized: true, error: null });
    } catch (e: any) {
      const message =
        typeof e?.message === 'string' ? e.message : 'Failed to initialize session';
      set({ user: null, loading: false, isInitialized: true, error: message });
    }
  },
  signInWithEmail: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session?.user) {
        throw new Error(error?.message || 'Invalid credentials');
      }

      const sessionUser = data.session.user;
      const profile = await fetchUserProfile(sessionUser.id);

      const appUser: AppUser = {
        id: sessionUser.id,
        name: profile?.name ?? sessionUser.user_metadata?.name ?? null,
        email: profile?.email ?? sessionUser.email ?? null,
        role: profile?.role ?? sessionUser.user_metadata?.role ?? null,
        profileImage: profile?.profileImage ?? sessionUser.user_metadata?.profile_image ?? null,
        phone: profile?.phone ?? sessionUser.user_metadata?.phone ?? null,
        address: profile?.address ?? sessionUser.user_metadata?.address ?? null,
        bio: profile?.bio ?? sessionUser.user_metadata?.bio ?? null,
        class_name: profile?.class_name ?? sessionUser.user_metadata?.class_name ?? null,
        streak_count: profile?.streak_count ?? sessionUser.user_metadata?.streak_count ?? 1,
        user_metadata: sessionUser.user_metadata
      };

      set({ user: appUser, loading: false, error: null });
    } catch (e: any) {
      const message =
        typeof e?.message === 'string' ? e.message : 'Failed to sign in';
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },
  signInWithOtp: async (email) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          shouldCreateUser: true,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      set({ loading: false, error: null });
    } catch (e: any) {
      const message =
        typeof e?.message === 'string' ? e.message : 'Failed to send OTP';
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },
  verifyEmailOtp: async (email, token) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error || !data.session?.user) {
        throw new Error(error?.message || 'Invalid verification code');
      }

      const sessionUser = data.session.user;
      const profile = await fetchUserProfile(sessionUser.id);

      const appUser: AppUser = {
        id: sessionUser.id,
        name: profile?.name ?? sessionUser.user_metadata?.name ?? null,
        email: profile?.email ?? sessionUser.email ?? null,
        role: profile?.role ?? sessionUser.user_metadata?.role ?? null,
        profileImage: profile?.profileImage ?? sessionUser.user_metadata?.profile_image ?? null,
        phone: profile?.phone ?? sessionUser.user_metadata?.phone ?? null,
        address: profile?.address ?? sessionUser.user_metadata?.address ?? null,
        bio: profile?.bio ?? sessionUser.user_metadata?.bio ?? null,
        class_name: profile?.class_name ?? sessionUser.user_metadata?.class_name ?? null,
        streak_count: profile?.streak_count ?? sessionUser.user_metadata?.streak_count ?? 1,
        user_metadata: sessionUser.user_metadata
      };

      set({ user: appUser, loading: false, error: null });
    } catch (e: any) {
      const message =
        typeof e?.message === 'string' ? e.message : 'Failed to verify OTP';
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },
  signUpWithEmail: async (name, email, password, phone, role) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            role,
          },
        },
      });

      if (error || !data.user) {
        throw new Error(error?.message || 'Failed to sign up');
      }

      const profileInsert = await supabase.from('users').upsert({
        id: data.user.id,
        name,
        email,
        phone,
        role,
        profile_image: null,
      });

      if (profileInsert.error) {
        throw new Error(profileInsert.error.message);
      }

      const appUser: AppUser = {
        id: data.user.id,
        name,
        email,
        role,
        profileImage: null,
        phone,
        address: null,
        bio: null,
        class_name: null,
        user_metadata: data.user.user_metadata
      };

      set({ user: appUser, loading: false, error: null });
    } catch (e: any) {
      console.error('SignUp Error:', e);
      const message =
        typeof e?.message === 'string' ? e.message : 'Failed to sign up';
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },
  signOut: async () => {
    set({ loading: true, error: null });
    try {
      // Clear downloads and local files
      
      // Clear settings or other persisted stores if needed
      // useSettingsStore.getState().reset(); // If reset exists, or just specific keys

      // Clear all localStorage (optional but cleaner)
      // Be careful not to clear things that should persist across users if any (e.g. onboarding flag?)
      // Actually, onboarding flag 'hasOnboarded' should probably persist.
      // So we should only clear specific keys or let stores handle their cleanup.
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error(error.message);
      }
      set({ user: null, loading: false, error: null });
    } catch (e: any) {
      const message =
        typeof e?.message === 'string' ? e.message : 'Failed to sign out';
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },
  updateProfile: (updates) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    }));
  },
  resetPasswordForEmail: async (email) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/resetpassword`,
      });
      if (error) throw error;
      set({ loading: false, error: null });
    } catch (e: any) {
      const message = typeof e?.message === 'string' ? e.message : 'Failed to send password reset email';
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },
}));

