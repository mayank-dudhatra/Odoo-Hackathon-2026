/**
 * High-performance, zero-dependency in-memory cache with TTL and prefix invalidation.
 */
class MemoryCache {
  constructor(defaultTtlSeconds = 60, maxItems = 3000) {
    this.defaultTtl = defaultTtlSeconds * 1000;
    this.maxItems = maxItems;
    this.store = new Map();
  }

  set(key, value, ttlSeconds = null) {
    const ttl = ttlSeconds !== null ? ttlSeconds * 1000 : this.defaultTtl;
    const expiresAt = Date.now() + ttl;

    // Prune if over max capacity
    if (this.store.size >= this.maxItems) {
      const now = Date.now();
      for (const [k, v] of this.store.entries()) {
        if (v.expiresAt <= now) {
          this.store.delete(k);
        }
      }
      if (this.store.size >= this.maxItems) {
        // Drop first 10% oldest entries
        const dropCount = Math.floor(this.maxItems * 0.1);
        let dropped = 0;
        for (const k of this.store.keys()) {
          this.store.delete(k);
          dropped += 1;
          if (dropped >= dropCount) break;
        }
      }
    }

    this.store.set(key, { value, expiresAt });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  del(key) {
    this.store.delete(key);
  }

  delPrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear() {
    this.store.clear();
  }
}

// Global instances for different domains
const authCache = new MemoryCache(60, 1000);        // 60s for auth session/user resolution
const rbacCache = new MemoryCache(300, 500);        // 5 min for role permissions
const dataCache = new MemoryCache(120, 2000);       // 2 min for reference tables (departments, positions, etc.)
const dashboardCache = new MemoryCache(30, 500);    // 30s for aggregated dashboard analytics

module.exports = {
  MemoryCache,
  authCache,
  rbacCache,
  dataCache,
  dashboardCache,
};
