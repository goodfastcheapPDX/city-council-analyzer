import adze, { setup } from 'adze';
import { config } from '../config';

/**
 * Environment types for logging configuration
 */
export type LogEnvironment = 'development' | 'test' | 'production';

/**
 * Log level configuration
 */
export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  environment: LogEnvironment;
  level: LogLevel;
  namespace?: string;
  enableColors?: boolean;
  enableTimestamp?: boolean;
  enableJson?: boolean;
}

/**
 * Get logging configuration from the config system
 */
function getConfigForEnvironment(environment: LogEnvironment): Partial<LoggerConfig> {
  // Get environment-specific overrides from config
  const envConfig = config.logging.environments[environment];
  
  return {
    level: envConfig.level,
    enableColors: envConfig.enableColors,
    enableTimestamp: envConfig.enableTimestamp,
    enableJson: envConfig.enableJson,
  };
}

/**
 * Get logging configuration with environment variable overrides
 */
function getLoggingConfig(): typeof config.logging {
  return config.logging;
}

/**
 * Detect current environment from NODE_ENV
 */
function detectEnvironment(): LogEnvironment {
  const nodeEnv = process.env.NODE_ENV;
  
  if (nodeEnv === 'test') return 'test';
  if (nodeEnv === 'production') return 'production';
  return 'development';
}

/**
 * Create a configured Adze logger instance
 */
export function createLogger(options: Partial<LoggerConfig> = {}) {
  const environment = options.environment ?? detectEnvironment();
  const defaults = getConfigForEnvironment(environment);
  const globalConfig = getLoggingConfig();
  
  const loggerConfig: LoggerConfig = {
    environment,
    level: options.level ?? defaults.level ?? globalConfig.level,
    namespace: options.namespace,
    enableColors: options.enableColors ?? defaults.enableColors ?? globalConfig.enableColors,
    enableTimestamp: options.enableTimestamp ?? defaults.enableTimestamp ?? globalConfig.enableTimestamp,
    enableJson: options.enableJson ?? defaults.enableJson ?? globalConfig.enableJson,
  };

  // Create base logger with configuration
  let logger = adze;

  // Create the appropriate logger with namespace
  let namespacedLogger = loggerConfig.namespace ? logger.ns(loggerConfig.namespace) : logger;

  // Apply log level filtering by returning a filtered logger interface
  const levelPriority = {
    silent: 5,
    error: 4,
    warn: 3,
    info: 2,
    debug: 1,
  };
  
  const currentLevelPriority = levelPriority[loggerConfig.level];
  
  // Return a logger interface that respects the level
  return {
    debug: (message: string, ...args: any[]) => {
      if (currentLevelPriority <= levelPriority.debug) {
        namespacedLogger.debug(message, ...args);
      }
    },
    info: (message: string, ...args: any[]) => {
      if (currentLevelPriority <= levelPriority.info) {
        namespacedLogger.info(message, ...args);
      }
    },
    warn: (message: string, ...args: any[]) => {
      if (currentLevelPriority <= levelPriority.warn) {
        namespacedLogger.warn(message, ...args);
      }
    },
    error: (message: string, ...args: any[]) => {
      if (currentLevelPriority <= levelPriority.error) {
        namespacedLogger.error(message, ...args);
      }
    },
    log: (message: string, ...args: any[]) => {
      if (currentLevelPriority <= levelPriority.info) {
        namespacedLogger.log(message, ...args);
      }
    },
    // Utility methods for context
    withContext: (context: Record<string, any>) => {
      // For now, just include context in the log message
      return {
        debug: (message: string, ...args: any[]) => {
          if (currentLevelPriority <= levelPriority.debug) {
            namespacedLogger.debug(message, { context, ...args });
          }
        },
        info: (message: string, ...args: any[]) => {
          if (currentLevelPriority <= levelPriority.info) {
            namespacedLogger.info(message, { context, ...args });
          }
        },
        warn: (message: string, ...args: any[]) => {
          if (currentLevelPriority <= levelPriority.warn) {
            namespacedLogger.warn(message, { context, ...args });
          }
        },
        error: (message: string, ...args: any[]) => {
          if (currentLevelPriority <= levelPriority.error) {
            namespacedLogger.error(message, { context, ...args });
          }
        },
      };
    },
  };
}

/**
 * Create a logger with a specific namespace
 */
export function createNamespacedLogger(namespace: string, options: Partial<LoggerConfig> = {}) {
  return createLogger({ ...options, namespace });
}

/**
 * Global logger instances for common use cases
 */
export const logger = createLogger();
export const apiLogger = createNamespacedLogger('api');
export const storageLogger = createNamespacedLogger('storage');
export const errorLogger = createNamespacedLogger('error');

/**
 * Logger factory for creating environment-specific loggers
 */
export const LoggerFactory = {
  create: createLogger,
  createNamespaced: createNamespacedLogger,
  
  // Pre-configured logger creators
  createApiLogger: (options?: Partial<LoggerConfig>) => createNamespacedLogger('api', options),
  createStorageLogger: (options?: Partial<LoggerConfig>) => createNamespacedLogger('storage', options),
  createErrorLogger: (options?: Partial<LoggerConfig>) => createNamespacedLogger('error', options),
  createTestLogger: (options?: Partial<LoggerConfig>) => createLogger({ 
    environment: 'test', 
    level: 'silent', // Very quiet for tests by default
    ...options 
  }),
};