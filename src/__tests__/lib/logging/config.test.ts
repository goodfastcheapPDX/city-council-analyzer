import {
  getLogLevel,
  getNamespaces,
  isJsonFormattingEnabled,
  areColorsEnabled,
  areTimestampsEnabled,
  isCorrelationEnabled,
  isTimingEnabled,
  getTimingThreshold,
  getCorrelationMaxAge,
  getCorrelationHeaders,
  getAlwaysTimedOperations,
  getConditionallyTimedOperations,
  shouldTimeOperation,
  getEnvironmentConfig,
  createNamespaceConfig,
  shouldLog,
  getFullLoggingConfig,
} from '@/lib/logging/config';

describe('LoggingConfig', () => {
  // Save original NODE_ENV
  const originalNodeEnv = process.env.NODE_ENV;
  
  afterEach(() => {
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('basic configuration access', () => {
    it('should get log level from config', () => {
      const level = getLogLevel();
      expect(['silent', 'error', 'warn', 'info', 'debug']).toContain(level);
    });

    it('should get namespaces from config', () => {
      const namespaces = getNamespaces();
      expect(namespaces).toHaveProperty('api');
      expect(namespaces).toHaveProperty('storage');
      expect(namespaces).toHaveProperty('error');
      expect(namespaces).toHaveProperty('middleware');
    });

    it('should check if JSON formatting is enabled', () => {
      const isJson = isJsonFormattingEnabled();
      expect(typeof isJson).toBe('boolean');
    });

    it('should check if colors are enabled', () => {
      const colorsEnabled = areColorsEnabled();
      expect(typeof colorsEnabled).toBe('boolean');
    });

    it('should check if timestamps are enabled', () => {
      const timestampsEnabled = areTimestampsEnabled();
      expect(typeof timestampsEnabled).toBe('boolean');
    });
  });

  describe('feature flags', () => {
    it('should check correlation tracking status', () => {
      const correlationEnabled = isCorrelationEnabled();
      expect(typeof correlationEnabled).toBe('boolean');
    });

    it('should check timing status', () => {
      const timingEnabled = isTimingEnabled();
      expect(typeof timingEnabled).toBe('boolean');
    });

    it('should get timing threshold', () => {
      const threshold = getTimingThreshold();
      expect(typeof threshold).toBe('number');
      expect(threshold).toBeGreaterThan(0);
    });

    it('should get correlation max age', () => {
      const maxAge = getCorrelationMaxAge();
      expect(typeof maxAge).toBe('number');
      expect(maxAge).toBeGreaterThan(0);
    });
  });

  describe('correlation configuration', () => {
    it('should get correlation headers', () => {
      const headers = getCorrelationHeaders();
      expect(Array.isArray(headers)).toBe(true);
      expect(headers.length).toBeGreaterThan(0);
      expect(headers).toContain('x-correlation-id');
    });
  });

  describe('performance timing configuration', () => {
    it('should get always timed operations', () => {
      const operations = getAlwaysTimedOperations();
      expect(Array.isArray(operations)).toBe(true);
      expect(operations).toContain('api_request');
      expect(operations).toContain('db_query');
    });

    it('should get conditionally timed operations', () => {
      const operations = getConditionallyTimedOperations();
      expect(Array.isArray(operations)).toBe(true);
      expect(operations).toContain('validation');
      expect(operations).toContain('parsing');
    });

    it('should determine if operation should be timed - always timed operations', () => {
      expect(shouldTimeOperation('api_request')).toBe(true);
      expect(shouldTimeOperation('api_request', 50)).toBe(true);
      expect(shouldTimeOperation('db_query')).toBe(true);
    });

    it('should determine if operation should be timed - conditional operations', () => {
      const threshold = getTimingThreshold();
      
      expect(shouldTimeOperation('validation', threshold + 10)).toBe(true);
      expect(shouldTimeOperation('validation', threshold - 10)).toBe(false);
      expect(shouldTimeOperation('parsing', threshold)).toBe(true);
    });

    it('should determine if operation should be timed - unknown operations', () => {
      const threshold = getTimingThreshold();
      
      expect(shouldTimeOperation('unknown_operation', threshold + 10)).toBe(true);
      expect(shouldTimeOperation('unknown_operation', threshold - 10)).toBe(false);
    });
  });

  describe('environment-specific configuration', () => {
    it('should get development environment config', () => {
      const devConfig = getEnvironmentConfig('development');
      expect(devConfig.level).toBe('debug');
      expect(devConfig.enableColors).toBe(true);
      expect(devConfig.enableJson).toBe(false);
    });

    it('should get test environment config', () => {
      const testConfig = getEnvironmentConfig('test');
      expect(testConfig.level).toBe('warn');
      expect(testConfig.enableColors).toBe(false);
      expect(testConfig.enableJson).toBe(false);
      expect(testConfig.enableTimestamp).toBe(false);
    });

    it('should get production environment config', () => {
      const prodConfig = getEnvironmentConfig('production');
      expect(prodConfig.level).toBe('info');
      expect(prodConfig.enableColors).toBe(false);
      expect(prodConfig.enableJson).toBe(true);
    });
  });

  describe('namespace configuration', () => {
    it('should create namespace config', () => {
      const namespaceConfig = createNamespaceConfig('test-namespace');
      
      expect(namespaceConfig.namespace).toBe('test-namespace');
      expect(namespaceConfig.level).toBeDefined();
      expect(typeof namespaceConfig.enableColors).toBe('boolean');
      expect(typeof namespaceConfig.enableTimestamp).toBe('boolean');
      expect(typeof namespaceConfig.enableJson).toBe('boolean');
    });
  });

  describe('log level checking', () => {
    it('should determine if debug messages should be logged with debug level', () => {
      expect(shouldLog('debug', 'debug')).toBe(true);
      expect(shouldLog('info', 'debug')).toBe(true);
      expect(shouldLog('warn', 'debug')).toBe(true);
      expect(shouldLog('error', 'debug')).toBe(true);
    });

    it('should determine if debug messages should be logged with info level', () => {
      expect(shouldLog('debug', 'info')).toBe(false);
      expect(shouldLog('info', 'info')).toBe(true);
      expect(shouldLog('warn', 'info')).toBe(true);
      expect(shouldLog('error', 'info')).toBe(true);
    });

    it('should determine if messages should be logged with error level', () => {
      expect(shouldLog('debug', 'error')).toBe(false);
      expect(shouldLog('info', 'error')).toBe(false);
      expect(shouldLog('warn', 'error')).toBe(false);
      expect(shouldLog('error', 'error')).toBe(true);
    });

    it('should handle silent level', () => {
      expect(shouldLog('debug', 'silent')).toBe(false);
      expect(shouldLog('info', 'silent')).toBe(false);
      expect(shouldLog('warn', 'silent')).toBe(false);
      expect(shouldLog('error', 'silent')).toBe(false);
    });
  });

  describe('full configuration', () => {
    it('should get full logging configuration', () => {
      const fullConfig = getFullLoggingConfig();
      
      expect(fullConfig).toHaveProperty('level');
      expect(fullConfig).toHaveProperty('namespaces');
      expect(fullConfig).toHaveProperty('currentEnvironment');
      expect(fullConfig).toHaveProperty('effectiveLevel');
      expect(fullConfig).toHaveProperty('featuresEnabled');
      
      expect(fullConfig.featuresEnabled).toHaveProperty('json');
      expect(fullConfig.featuresEnabled).toHaveProperty('colors');
      expect(fullConfig.featuresEnabled).toHaveProperty('timestamps');
      expect(fullConfig.featuresEnabled).toHaveProperty('correlation');
      expect(fullConfig.featuresEnabled).toHaveProperty('timing');
    });
  });
});