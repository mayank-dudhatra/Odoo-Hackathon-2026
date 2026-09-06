const { dataCache } = require("../utils/cache");

/**
 * Express middleware for in-memory caching of GET responses.
 * Automatically invalidates cache when mutations occur.
 */
function cacheResponse(ttlSeconds = 120, resourceTag = "") {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const companyId = req.auth?.company_id || "public";
    const cacheKey = `http:${companyId}:${resourceTag || req.baseUrl || ""}:${req.originalUrl}`;

    const cached = dataCache.get(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(cached);
    }

    res.setHeader("X-Cache", "MISS");

    // Intercept res.json to store into cache
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && body) {
        dataCache.set(cacheKey, body, ttlSeconds);
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Middleware to invalidate cache on state mutations (POST, PUT, PATCH, DELETE).
 */
function invalidateCache(resourcePrefixes = []) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        const companyId = req.auth?.company_id || "public";
        for (const prefix of resourcePrefixes) {
          dataCache.delPrefix(`http:${companyId}:${prefix}`);
        }
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = {
  cacheResponse,
  invalidateCache,
};
