/**
 * Local-only key/value storage, backed by localStorage.
 *
 * This used to also sync to Supabase, but Supabase is deferred (see
 * FINAL_STATUS_REPORT.md) and was never actually reachable in practice —
 * isSupabaseConfigured() was always false, so every "cloud sync" code path
 * was dead. Removed rather than kept as misleading no-op branches; the
 * Supabase sync logic is recoverable from git history if it's revived later.
 */

interface StorageItem {
  key: string;
  value: any;
  timestamp: number;
}

class HybridStorageService {
  private cache: Map<string, StorageItem> = new Map();

  async initialize(): Promise<void> {
    this.loadFromLocalStorage();
    console.log(`✅ Loaded ${this.cache.size} items from localStorage`);
  }

  async set(key: string, value: any): Promise<void> {
    this.cache.set(key, { key, value, timestamp: Date.now() });
    this.saveToLocalStorage();
  }

  async get(key: string): Promise<any> {
    return this.cache.get(key)?.value;
  }

  async remove(key: string): Promise<void> {
    this.cache.delete(key);
    this.saveToLocalStorage();
  }

  async getAll(): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    for (const [key, item] of this.cache) {
      result[key] = item.value;
    }
    return result;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.saveToLocalStorage();
  }

  private saveToLocalStorage(): void {
    const data: Record<string, any> = {};
    for (const [key, item] of this.cache) {
      data[key] = item.value;
    }
    localStorage.setItem('sacred_core_storage', JSON.stringify(data));
  }

  private loadFromLocalStorage(): void {
    try {
      const data = localStorage.getItem('sacred_core_storage');
      if (data) {
        const parsed = JSON.parse(data);
        Object.entries(parsed).forEach(([key, value]) => {
          this.cache.set(key, { key, value, timestamp: Date.now() });
        });
      }
    } catch (error) {
      console.error('❌ Failed to load localStorage:', error);
    }
  }

  destroy(): void {
    // No background sync timer to clear anymore; kept for API compatibility.
  }
}

export const hybridStorage = new HybridStorageService();
