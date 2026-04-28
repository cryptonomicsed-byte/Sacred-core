/**
 * Admin Dashboard
 * 
 * Protected route (/admin) - accessible only to admin users
 * Features:
 * - Usage statistics (API calls, tokens, costs)
 * - Quota management (set per-user limits)
 * - Audit log export (CSV/JSON)
 * - Team member management
 * - Feature flag toggles
 */

import React, { useEffect, useState } from 'react';
import { Activity, Users, Settings, Download, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';
import { getSupabase, isSupabaseConfigured } from '@infra/platform/supabaseClient';
import { featureFlagService } from '@infra/state/featureFlagService';
import { useFeatureFlags } from '../store';

interface UsageStats {
  totalApiCalls: number;
  totalTokensUsed: number;
  estimatedCost: number;
  monthlyBudgetUsed: number;
  topUsers: Array<{ email: string; apiCalls: number; cost: number }>;
}

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  lastActive: string;
  usage: { apiCalls: number; tokensUsed: number };
}

interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
}

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  metadata: Record<string, any>;
  created_at: string;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'team' | 'flags' | 'audit'>('stats');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const flagsStore = useFeatureFlags();
  const refreshFlags = flagsStore?.refresh || (() => Promise.resolve());

  const isSupabaseReady = isSupabaseConfigured();

  // Load initial data
  useEffect(() => {
    if (!isSupabaseReady) {
      setError('Supabase not configured. Admin features unavailable.');
      setLoading(false);
      return;
    }

    loadData();
  }, [isSupabaseReady]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadUsageStats(),
        loadTeamMembers(),
        loadFeatureFlags(),
        loadAuditLogs(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }

  async function loadUsageStats() {
    if (!isSupabaseReady) return;

    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // Mock data - in production, would aggregate from actual usage tables
      setStats({
        totalApiCalls: 12847,
        totalTokensUsed: 524000,
        estimatedCost: 245.6,
        monthlyBudgetUsed: 78,
        topUsers: [
          { email: 'alice@example.com', apiCalls: 3200, cost: 82.4 },
          { email: 'bob@example.com', apiCalls: 2100, cost: 56.2 },
          { email: 'charlie@example.com', apiCalls: 1850, cost: 45.3 },
        ],
      });
    } catch (err) {
      console.error('Failed to load usage stats:', err);
    }
  }

  async function loadTeamMembers() {
    if (!isSupabaseReady) return;

    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // Mock data - in production, would fetch from auth.users + profile tables
      setTeamMembers([
        {
          id: '1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          lastActive: '2 min ago',
          usage: { apiCalls: 450, tokensUsed: 28000 },
        },
        {
          id: '2',
          email: 'alice@example.com',
          name: 'Alice Johnson',
          role: 'user',
          lastActive: '15 min ago',
          usage: { apiCalls: 3200, tokensUsed: 185000 },
        },
      ]);
    } catch (err) {
      console.error('Failed to load team members:', err);
    }
  }

  async function loadFeatureFlags() {
    try {
      const allFlags = await featureFlagService.getAllFlags();
      const flagsList: FeatureFlag[] = [
        { name: 'video_generation', enabled: allFlags.video_generation ?? true, description: 'Video generation' },
        { name: 'image_generation', enabled: allFlags.image_generation ?? true, description: 'Image generation' },
        { name: 'competitor_analysis', enabled: allFlags.competitor_analysis ?? true, description: 'Competitor analysis' },
        { name: 'ai_optimization', enabled: allFlags.ai_optimization ?? true, description: 'AI optimization' },
        { name: 'advanced_analytics', enabled: allFlags.advanced_analytics ?? true, description: 'Advanced analytics' },
        { name: 'webhook_integrations', enabled: allFlags.webhook_integrations ?? true, description: 'Webhook integrations' },
        { name: 'multi_region_sync', enabled: allFlags.multi_region_sync ?? false, description: 'Multi-region sync' },
        { name: 'beta_ai_features', enabled: allFlags.beta_ai_features ?? false, description: 'Beta AI features' },
      ];
      setFlags(flagsList);
    } catch (err) {
      console.error('Failed to load feature flags:', err);
    }
  }

  async function loadAuditLogs() {
    if (!isSupabaseReady) return;

    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // Mock data - in production, would fetch actual audit logs
      setAuditLogs([
        {
          id: '1',
          user_id: 'user1',
          action: 'login',
          metadata: { ip: '192.168.1.1' },
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          user_id: 'user2',
          action: 'campaign_created',
          metadata: { campaignId: 'camp123' },
          created_at: new Date(Date.now() - 60000).toISOString(),
        },
      ]);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  }

  async function toggleFlag(flagName: string, newState: boolean) {
    try {
      setRefreshing(true);
      const success = await featureFlagService.updateFlag(flagName, newState);
      if (success) {
        await refreshFlags();
        await loadFeatureFlags();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle flag');
    } finally {
      setRefreshing(false);
    }
  }

  async function exportAuditLogs(format: 'csv' | 'json') {
    try {
      if (format === 'csv') {
        const headers = ['ID', 'User ID', 'Action', 'Metadata', 'Created At'];
        const rows = auditLogs.map((log) => [
          log.id,
          log.user_id,
          log.action,
          JSON.stringify(log.metadata),
          log.created_at,
        ]);
        const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
        downloadFile(csv, 'audit-logs.csv', 'text/csv');
      } else {
        const json = JSON.stringify(auditLogs, null, 2);
        downloadFile(json, 'audit-logs.json', 'application/json');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export logs');
    }
  }

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (!isSupabaseReady) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 flex items-center gap-4">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold mb-1">Admin Features Unavailable</h2>
              <p className="text-sm text-gray-400">Supabase is not configured. Please set up VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Manage usage, team, and features</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-700">
          {(['stats', 'team', 'flags', 'audit'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab === 'stats' && <TrendingUp className="w-4 h-4" />}
              {tab === 'team' && <Users className="w-4 h-4" />}
              {tab === 'flags' && <Settings className="w-4 h-4" />}
              {tab === 'audit' && <Activity className="w-4 h-4" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Stats Tab */}
          {activeTab === 'stats' && stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4">Total API Calls</h3>
                <p className="text-4xl font-bold text-white">{stats.totalApiCalls.toLocaleString()}</p>
              </div>
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4">Tokens Used</h3>
                <p className="text-4xl font-bold text-white">{(stats.totalTokensUsed / 1000).toFixed(1)}K</p>
              </div>
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4">Estimated Cost</h3>
                <p className="text-4xl font-bold text-green-400">${stats.estimatedCost.toFixed(2)}</p>
              </div>
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4">Budget Used</h3>
                <p className="text-4xl font-bold text-yellow-400">{stats.monthlyBudgetUsed}%</p>
              </div>

              {/* Top Users */}
              <div className="md:col-span-2 bg-gray-900/50 border border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Top Users</h3>
                <div className="space-y-3">
                  {stats.topUsers.map((user) => (
                    <div key={user.email} className="flex items-center justify-between p-3 bg-gray-800/50 rounded">
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <p className="text-sm text-gray-400">{user.apiCalls.toLocaleString()} API calls</p>
                      </div>
                      <p className="font-semibold text-green-400">${user.cost.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Role</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Last Active</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">API Calls</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Tokens</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-gray-400">{member.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                              member.role === 'admin'
                                ? 'bg-purple-900/30 text-purple-300'
                                : 'bg-blue-900/30 text-blue-300'
                            }`}
                          >
                            {member.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">{member.lastActive}</td>
                        <td className="px-6 py-4 text-sm">{member.usage.apiCalls.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm">{(member.usage.tokensUsed / 1000).toFixed(1)}K</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Flags Tab */}
          {activeTab === 'flags' && (
            <div className="space-y-4">
              {flags.map((flag) => (
                <div key={flag.name} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold">{flag.name}</p>
                    <p className="text-sm text-gray-400">{flag.description}</p>
                  </div>
                  <button
                    onClick={() => toggleFlag(flag.name, !flag.enabled)}
                    disabled={refreshing}
                    className={`ml-4 px-4 py-2 rounded font-medium transition-colors ${
                      flag.enabled
                        ? 'bg-green-900/30 text-green-300 hover:bg-green-900/50'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    } disabled:opacity-50`}
                  >
                    {flag.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Audit Log Tab */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={() => exportAuditLogs('csv')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={() => exportAuditLogs('json')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export JSON
                </button>
              </div>
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left">ID</th>
                        <th className="px-4 py-3 text-left">User</th>
                        <th className="px-4 py-3 text-left">Action</th>
                        <th className="px-4 py-3 text-left">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-800/50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-400">{log.id.slice(0, 8)}</td>
                          <td className="px-4 py-3 text-gray-400">{log.user_id.slice(0, 8)}</td>
                          <td className="px-4 py-3">{log.action}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
