/**
 * SSO Sign-In Buttons Component
 * 
 * Displays OAuth provider buttons for single sign-on.
 * Falls back to email/password if providers not available.
 */

import React, { useEffect, useState } from 'react';
import { ssoService, OAuthProvider } from '../services/ssoService';

interface SSOButtonsProps {
  onSignIn?: (provider: OAuthProvider) => void;
  compact?: boolean;
}

export function SSOButtons({ onSignIn, compact = false }: SSOButtonsProps) {
  const [providers, setProviders] = useState<ReturnType<typeof ssoService.getAvailableProviders>>([]);
  const [loading, setLoading] = useState<OAuthProvider | null>(null);

  useEffect(() => {
    const available = ssoService.getAvailableProviders();
    setProviders(available);
  }, []);

  async function handleSignIn(provider: OAuthProvider) {
    setLoading(provider);
    try {
      const success = await ssoService.signInWithProvider(provider);
      if (success && onSignIn) {
        onSignIn(provider);
      }
    } finally {
      setLoading(null);
    }
  }

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${compact ? 'space-y-1' : ''}`}>
      {providers.map((provider) => (
        <button
          key={provider.provider}
          onClick={() => handleSignIn(provider.provider)}
          disabled={loading === provider.provider}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded font-medium transition-all ${
            loading === provider.provider
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:opacity-90 active:scale-95'
          } ${
            provider.provider === 'google'
              ? 'bg-white text-black hover:bg-gray-100'
              : provider.provider === 'github'
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
          } ${compact ? 'py-1 text-sm' : ''}`}
        >
          <span className="text-lg">{provider.icon}</span>
          <span>Sign in with {provider.name}</span>
          {loading === provider.provider && (
            <span className="animate-spin">⏳</span>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * Link Additional Provider Component
 * 
 * Allows authenticated users to link additional OAuth providers.
 */
interface LinkProviderProps {
  onLinked?: (provider: OAuthProvider) => void;
  onError?: (error: string) => void;
}

export function LinkProvider({ onLinked, onError }: LinkProviderProps) {
  const [providers, setProviders] = useState<ReturnType<typeof ssoService.getAvailableProviders>>([]);
  const [linked, setLinked] = useState<OAuthProvider[]>([]);
  const [loading, setLoading] = useState<OAuthProvider | null>(null);

  useEffect(() => {
    const available = ssoService.getAvailableProviders();
    setProviders(available);

    // Load linked providers
    ssoService.getLinkedProviders().then(setLinked).catch((err) => {
      if (onError) onError(err.message);
    });
  }, [onError]);

  async function handleLink(provider: OAuthProvider) {
    setLoading(provider);
    try {
      const success = await ssoService.linkProvider(provider);
      if (success) {
        setLinked((prev) => [...prev, provider]);
        if (onLinked) onLinked(provider);
      } else {
        if (onError) onError(`Failed to link ${provider}`);
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleUnlink(provider: OAuthProvider) {
    setLoading(provider);
    try {
      const success = await ssoService.unlinkProvider(provider);
      if (success) {
        setLinked((prev) => prev.filter((p) => p !== provider));
      } else {
        if (onError) onError(`Failed to unlink ${provider}`);
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-white">Connected Sign-In Methods</h3>
      <div className="space-y-2">
        {providers.map((provider) => {
          const isLinked = linked.includes(provider.provider);
          return (
            <button
              key={provider.provider}
              onClick={() => (isLinked ? handleUnlink(provider.provider) : handleLink(provider.provider))}
              disabled={loading === provider.provider}
              className={`w-full flex items-center justify-between px-4 py-3 rounded transition-all ${
                loading === provider.provider
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:opacity-90'
              } ${
                isLinked
                  ? 'bg-green-900/30 border border-green-700 text-green-200'
                  : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{provider.icon}</span>
                <span>{provider.name}</span>
              </div>
              <span className="text-sm">
                {loading === provider.provider
                  ? '⏳'
                  : isLinked
                    ? '✓ Connected'
                    : 'Connect'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
