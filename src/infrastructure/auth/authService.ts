import { getSupabase, isSupabaseConfigured } from "../../../services/supabaseClient";

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt?: Date;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

class AuthService {
  async signUp(email: string, password: string, name: string): Promise<User> {
    if (!isSupabaseConfigured()) {
      throw new Error('Authentication not configured');
    }

    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase unavailable');

    const { data: { user }, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });

    if (error) throw new Error(error.message);
    if (!user) throw new Error('Sign up failed');

    console.log(`✅ User signed up: ${email}`);

    return {
      id: user.id,
      email: user.email || email,
      name
    };
  }

  async signIn(email: string, password: string): Promise<User> {
    if (!isSupabaseConfigured()) {
      throw new Error('Authentication not configured');
    }

    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase unavailable');

    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw new Error(error.message);
    if (!user) throw new Error('Sign in failed');

    console.log(`✅ User signed in: ${email}`);

    return {
      id: user.id,
      email: user.email || email
    };
  }

  async getCurrentUser(): Promise<User | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const supabase = getSupabase();
    if (!supabase) return null;

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.log('ℹ️ No authenticated user');
      return null;
    }

    console.log(`✅ Current user: ${user.email}`);

    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name
    };
  }

  async signOut(): Promise<void> {
    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }

    console.log('✅ User signed out');
  }

  async updateProfile(name: string, avatar?: string): Promise<User> {
    if (!isSupabaseConfigured()) {
      throw new Error('Authentication not configured');
    }

    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase unavailable');

    const { data: { user }, error } = await supabase.auth.updateUser({
      data: { name, avatar }
    });

    if (error) throw new Error(error.message);
    if (!user) throw new Error('Update failed');

    console.log(`✅ Profile updated`);

    return {
      id: user.id,
      email: user.email || '',
      name,
      avatar
    };
  }

  async resetPassword(email: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Authentication not configured');
    }

    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase unavailable');

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);

    console.log(`✅ Password reset email sent to ${email}`);
  }

  async onAuthStateChange(callback: (user: User | null) => void): Promise<() => void> {
    if (!isSupabaseConfigured()) {
      return () => {};
    }

    const supabase = getSupabase();
    if (!supabase) return () => {};

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name
        });
      } else {
        callback(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }
}

export const authService = new AuthService();
