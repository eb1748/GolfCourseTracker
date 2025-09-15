import NodeCache from 'node-cache';

// Cache configuration
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // Disable cloning for better performance
  maxKeys: 1000, // Limit cache size
});

// Cache TTL configurations for different data types
const CACHE_TTL = {
  COURSES: 60 * 15,      // 15 minutes - courses don't change often
  USER_STATS: 60 * 5,    // 5 minutes - stats can be slightly stale
  SEARCH_RESULTS: 60 * 10, // 10 minutes - search results
  USER_COURSES: 60 * 2,  // 2 minutes - user course status (more dynamic)
} as const;

// Cache key generators
export const getCacheKey = {
  allCourses: () => 'courses:all',
  userCourses: (userId: string) => `user:${userId}:courses`,
  userStats: (userId: string) => `user:${userId}:stats`,
  coursesByStatus: (status: string, userId?: string) =>
    userId ? `user:${userId}:courses:${status}` : `courses:${status}`,
  searchResults: (query: string, userId?: string) =>
    userId ? `search:${userId}:${query}` : `search:global:${query}`,
  courseDetails: (courseId: string) => `course:${courseId}`,
};

// Generic cache wrapper with error handling
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  try {
    // Try to get from cache first
    const cached = cache.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetcher();

    // Store in cache
    cache.set(key, data, ttl);
    return data;
  } catch (error) {
    // If cache fails, still return the data
    console.warn(`Cache operation failed for key ${key}:`, error);
    return await fetcher();
  }
}

// Cache invalidation helpers
export const invalidateCache = {
  user: (userId: string) => {
    const userKeys = cache.keys().filter(key =>
      key.includes(`user:${userId}`) ||
      key.includes(`search:${userId}`)
    );
    cache.del(userKeys);
  },

  courses: () => {
    const courseKeys = cache.keys().filter(key =>
      key.startsWith('courses:') ||
      key.startsWith('course:') ||
      key.startsWith('search:')
    );
    cache.del(courseKeys);
  },

  userCourses: (userId: string) => {
    const keys = cache.keys().filter(key =>
      key.includes(`user:${userId}:courses`) ||
      key.includes(`search:${userId}`)
    );
    cache.del(keys);
  },

  all: () => {
    cache.flushAll();
  }
};

// Database connection retry wrapper
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on validation errors or auth errors
      if (error instanceof Error) {
        if (error.message.includes('validation') ||
            error.message.includes('authentication') ||
            error.message.includes('authorization')) {
          throw error;
        }
      }

      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Query performance monitoring
interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  success: boolean;
}

const queryMetrics: QueryMetrics[] = [];
const MAX_METRICS = 1000;

export async function withQueryMetrics<T>(
  queryName: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  let success = true;

  try {
    const result = await operation();
    return result;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const duration = performance.now() - startTime;

    // Log slow queries
    if (duration > 1000) {
      console.warn(`🐌 Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`);
    }

    // Store metrics
    queryMetrics.push({
      query: queryName,
      duration,
      timestamp: new Date(),
      success
    });

    // Keep only recent metrics
    if (queryMetrics.length > MAX_METRICS) {
      queryMetrics.shift();
    }
  }
}

// Get performance statistics
export function getPerformanceStats() {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);

  const recentMetrics = queryMetrics.filter(m =>
    m.timestamp.getTime() > oneHourAgo
  );

  if (recentMetrics.length === 0) {
    return {
      totalQueries: 0,
      averageResponseTime: 0,
      slowQueries: 0,
      errorRate: 0,
      cacheStats: cache.getStats()
    };
  }

  const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
  const slowQueries = recentMetrics.filter(m => m.duration > 1000).length;
  const errors = recentMetrics.filter(m => !m.success).length;

  return {
    totalQueries: recentMetrics.length,
    averageResponseTime: Math.round(totalDuration / recentMetrics.length),
    slowQueries,
    errorRate: Math.round((errors / recentMetrics.length) * 100),
    cacheStats: cache.getStats()
  };
}

// Export cache instance for direct access if needed
export { cache, CACHE_TTL };