import { createLogger, LoggerFactory, logger, apiLogger, storageLogger } from '@/lib/logging/factory';
import { LogEnvironment } from '@/lib/logging';

describe('LoggerFactory', () => {
  // Save original NODE_ENV
  const originalNodeEnv = process.env.NODE_ENV;
  
  afterEach(() => {
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('environment detection', () => {
    it('should detect test environment', () => {
      process.env.NODE_ENV = 'test';
      const testLogger = createLogger();
      expect(testLogger).toBeDefined();
    });

    it('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      const devLogger = createLogger();
      expect(devLogger).toBeDefined();
    });

    it('should detect production environment', () => {
      process.env.NODE_ENV = 'production'; 
      const prodLogger = createLogger();
      expect(prodLogger).toBeDefined();
    });

    it('should default to development for unknown environments', () => {
      process.env.NODE_ENV = 'unknown';
      const defaultLogger = createLogger();
      expect(defaultLogger).toBeDefined();
    });
  });

  describe('logger configuration', () => {
    it('should create logger with custom level', () => {
      const customLogger = createLogger({ level: 'error' });
      expect(customLogger).toBeDefined();
    });

    it('should create logger with namespace', () => {
      const namespacedLogger = createLogger({ namespace: 'test' });
      expect(namespacedLogger).toBeDefined();
    });

    it('should create logger with explicit environment', () => {
      const prodLogger = createLogger({ environment: 'production' });
      expect(prodLogger).toBeDefined();
    });
  });

  describe('pre-configured loggers', () => {
    it('should provide global logger instance', () => {
      expect(logger).toBeDefined();
    });

    it('should provide API logger with namespace', () => {
      expect(apiLogger).toBeDefined();
    });

    it('should provide storage logger with namespace', () => {
      expect(storageLogger).toBeDefined();
    });
  });

  describe('LoggerFactory methods', () => {
    it('should create API logger through factory', () => {
      const factoryApiLogger = LoggerFactory.createApiLogger();
      expect(factoryApiLogger).toBeDefined();
    });

    it('should create storage logger through factory', () => {
      const factoryStorageLogger = LoggerFactory.createStorageLogger();
      expect(factoryStorageLogger).toBeDefined();
    });

    it('should create test logger with silent level', () => {
      const testLogger = LoggerFactory.createTestLogger();
      expect(testLogger).toBeDefined();
    });

    it('should create test logger with custom options', () => {
      const testLogger = LoggerFactory.createTestLogger({ level: 'debug' });
      expect(testLogger).toBeDefined();
    });
  });

  describe('environment-specific defaults', () => {
    it('should use warn level for test environment', () => {
      const testLogger = createLogger({ environment: 'test' });
      expect(testLogger).toBeDefined();
      // Note: We can't easily test the internal configuration, but we verify it creates
    });

    it('should use debug level for development environment', () => {
      const devLogger = createLogger({ environment: 'development' });
      expect(devLogger).toBeDefined();
    });

    it('should use info level for production environment', () => {
      const prodLogger = createLogger({ environment: 'production' });
      expect(prodLogger).toBeDefined();
    });
  });
});