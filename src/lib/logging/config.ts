import { config } from '../config';
import { LogLevel, LogEnvironment } from './factory';

/**
 * Logging configuration utilities
 */

/**
 * Get the configured log level for the current environment
 */
export function getLogLevel(): LogLevel {
  return config.logging.level;
}

/**
 * Get all configured namespaces
 */
export function getNamespaces() {
  return config.logging.namespaces;
}

/**
 * Check if JSON formatting is enabled
 */
export function isJsonFormattingEnabled(): boolean {
  return config.logging.enableJson;
}

/**
 * Check if colors are enabled for logging
 */
export function areColorsEnabled(): boolean {
  return config.logging.enableColors;
}

/**
 * Check if timestamps are enabled
 */
export function areTimestampsEnabled(): boolean {
  return config.logging.enableTimestamp;
}

/**
 * Check if correlation tracking is enabled
 */
export function isCorrelationEnabled(): boolean {
  return config.logging.enableCorrelation;
}

/**
 * Check if performance timing is enabled
 */
export function isTimingEnabled(): boolean {
  return config.logging.enableTiming;
}

/**
 * Get the timing threshold for performance logging
 */
export function getTimingThreshold(): number {
  return config.logging.timingThreshold;
}

/**
 * Get the maximum age for correlation contexts
 */
export function getCorrelationMaxAge(): number {
  return config.logging.correlationMaxAge;
}

/**
 * Get the correlation headers in order of preference
 */
export function getCorrelationHeaders(): readonly string[] {
  return config.logging.correlationHeaders;
}

/**
 * Get operations that should always be timed
 */
export function getAlwaysTimedOperations(): readonly string[] {
  return config.logging.performance.alwaysTime;
}

/**
 * Get operations that should be conditionally timed
 */
export function getConditionallyTimedOperations(): readonly string[] {
  return config.logging.performance.conditionalTime;
}

/**
 * Check if an operation should be timed
 */
export function shouldTimeOperation(operation: string, duration?: number): boolean {
  // Always time operations in the alwaysTime list
  if (getAlwaysTimedOperations().includes(operation)) {
    return true;
  }
  
  // For conditional operations, check duration against threshold
  if (getConditionallyTimedOperations().includes(operation)) {
    return duration !== undefined && duration >= getTimingThreshold();
  }
  
  // For unknown operations, use threshold if timing is enabled
  return isTimingEnabled() && (duration !== undefined ? duration >= getTimingThreshold() : true);
}

/**
 * Get environment-specific logging configuration
 */
export function getEnvironmentConfig(environment: LogEnvironment) {
  return config.logging.environments[environment];
}

/**
 * Create a logging configuration object for a specific namespace
 */
export function createNamespaceConfig(namespace: string) {
  return {
    namespace,
    level: getLogLevel(),
    enableColors: areColorsEnabled(),
    enableTimestamp: areTimestampsEnabled(),
    enableJson: isJsonFormattingEnabled(),
  };
}

/**
 * Utility to check if a log level should be processed
 */
export function shouldLog(messageLevel: LogLevel, configLevel: LogLevel = getLogLevel()): boolean {
  const levelPriority = {
    silent: 5,
    error: 4,
    warn: 3,
    info: 2,
    debug: 1,
  };
  
  return levelPriority[messageLevel] >= levelPriority[configLevel];
}

/**
 * Get all logging configuration for debugging/monitoring
 */
export function getFullLoggingConfig() {
  return {
    ...config.logging,
    currentEnvironment: process.env.NODE_ENV || 'development',
    effectiveLevel: getLogLevel(),
    featuresEnabled: {
      json: isJsonFormattingEnabled(),
      colors: areColorsEnabled(),
      timestamps: areTimestampsEnabled(),
      correlation: isCorrelationEnabled(),
      timing: isTimingEnabled(),
    },
  };
}