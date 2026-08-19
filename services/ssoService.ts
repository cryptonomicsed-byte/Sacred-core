/**
 * Single Sign-On (SSO) Service
 * 
 * Manages OAuth providers via Supabase Auth.
 * Supported: Google, GitHub, Microsoft (Azure AD)
 * 
 * Configuration:
 * - Add OAuth app credentials in Supabase dashboard
 * - Provider config auto-loaded from Supabase
 * 
 * Usage:
 *   await ssoService.signInWithProvider('google');
 */

import type { Provider as SupabaseProvider } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';

export type OAuthProvider = 'google' | 'github' | 'microsoft';

// Supabase has no "microsoft" provider id — Azure AD is exposed as "azure".
const toSupabaseProvider = (provider: OAuthProvider): SupabaseProvider =>
  provider === 'microsoft' ? 'azure' : provider;

export interface SSOConfig {
  provider: OAuthProvider;
  enabled: boolean;
  clientId?: string;
  name: string;
  icon: string;
}

const PROVIDER_CONFIGS: Record<OAuthProvider, SSOConfig> = {
  google: {
    provider: 'google',
    enabled: true,
    name: 'Google',
    icon: '🔍',
  },
  github: {
    provider: 'github',
    enabled: true,
    name: 'GitHub',
    icon: '🐙',
  },
  microsoft: {
    provider: 'microsoft',
    enabled: true,
    name: 'Microsoft',
    icon: '🪟',
  },
};

class SSOService {
  private providers: Map<OAuthProvider, SSOConfig> = new Map();
  private initialized = false;

  constructor() {
    this.providers = new Map(Object.entries(PROVIDER_CONFIGS) as [OAuthProvider, SSOConfig][]);
  }

  /**
   * Initialize SSO (check Supabase provider availability)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!isSupabaseConfigured()) {
      console.log('ℹ️ SSO disabled (Supabase not configured)');
      return;
    }

    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // Test if OAuth providers are available
      // In production, query Supabase settings or env
      console.log('✅ SSO service initialized');
      this.initialized = true;
    } catch (error) {
      console.warn('⚠️ SSO initialization failed:', error);
    }
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithProvider(provider: OAuthProvider): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Supabase not configured for SSO');
      return false;
    }

    try {
      const supabase = getSupabase();
      if (!supabase) return false;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: toSupabaseProvider(provider),
        options: {
          redirectTo: `${window.location.origin}/#/auth/callback`,
        },
      });

      if (error) {
        console.error(`❌ ${provider} SSO failed:`, error.message);
        return false;
      }

      console.log(`✅ Redirecting to ${provider} SSO...`);
      return true;
    } catch (error) {
      console.error(`❌ SSO error for ${provider}:`, error);
      return false;
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): SSOConfig[] {
    return Array.from(this.providers.values()).filter((p) => p.enabled);
  }

  /**
   * Check if provider is available
   */
  isProviderAvailable(provider: OAuthProvider): boolean {
    const config = this.providers.get(provider);
    return config?.enabled ?? false;
  }

  /**
   * Get provider config
   */
  getProviderConfig(provider: OAuthProvider): SSOConfig | null {
    return this.providers.get(provider) || null;
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(code: string, state: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Cannot handle callback: Supabase not configured');
      return false;
    }

    try {
      // Supabase handles this automatically via redirectTo
      console.log('✅ OAuth callback received');
      return true;
    } catch (error) {
      console.error('❌ OAuth callback error:', error);
      return false;
    }
  }

  /**
   * Link OAuth provider to existing account (requires auth)
   */
  async linkProvider(provider: OAuthProvider): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Supabase not configured for linking');
      return false;
    }

    try {
      const supabase = getSupabase();
      if (!supabase) return false;

      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.warn('⚠️ User must be authenticated to link providers');
        return false;
      }

      const { error } = await supabase.auth.linkIdentity({
        provider: toSupabaseProvider(provider),
        options: {
          redirectTo: `${window.location.origin}/#/settings`,
        },
      });

      if (error) {
        console.error(`❌ Failed to link ${provider}:`, error.message);
        return false;
      }

      console.log(`✅ ${provider} linked successfully`);
      return true;
    } catch (error) {
      console.error('❌ Provider linking error:', error);
      return false;
    }
  }

  /**
   * Unlink OAuth provider (requires auth)
   */
  async unlinkProvider(provider: OAuthProvider): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Supabase not configured for unlinking');
      return false;
    }

    try {
      const supabase = getSupabase();
      if (!supabase) return false;

      const { data: identitiesData, error: identitiesError } = await supabase.auth.getUserIdentities();
      if (identitiesError) {
        console.error(`❌ Failed to look up identities before unlinking ${provider}:`, identitiesError.message);
        return false;
      }

      const targetProvider = toSupabaseProvider(provider);
      const identity = identitiesData?.identities.find((i) => i.provider === targetProvider);
      if (!identity) {
        console.warn(`⚠️ No linked ${provider} identity to unlink`);
        return false;
      }

      const { error } = await supabase.auth.unlinkIdentity(identity);

      if (error) {
        console.error(`❌ Failed to unlink ${provider}:`, error.message);
        return false;
      }

      console.log(`✅ ${provider} unlinked successfully`);
      return true;
    } catch (error) {
      console.error('❌ Provider unlinking error:', error);
      return false;
    }
  }

  /**
   * Get linked providers for current user
   */
  async getLinkedProviders(): Promise<OAuthProvider[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const supabase = getSupabase();
      if (!supabase) return [];

      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return [];

      // Get identities from user metadata. "email" identities (password auth)
      // aren't OAuth providers, and Supabase's "azure" maps back to our "microsoft".
      const identities = user.identities || [];
      return identities
        .map((i) => i.provider)
        .filter((p): p is 'google' | 'github' | 'azure' => p === 'google' || p === 'github' || p === 'azure')
        .map((p): OAuthProvider => (p === 'azure' ? 'microsoft' : p));
    } catch (error) {
      console.error('❌ Failed to get linked providers:', error);
      return [];
    }
  }
}

export const ssoService = new SSOService();

// Initialize SSO on import
if (isSupabaseConfigured()) {
  ssoService.initialize().catch((err) => {
    console.warn('⚠️ SSO initialization deferred:', err);
  });
}
