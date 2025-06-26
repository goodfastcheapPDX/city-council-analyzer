import { PerformanceTiming, LogContext } from './types';

/**
 * Performance timing implementation for logging performance metrics
 */
export class PerformanceTimer implements PerformanceTiming {
  public readonly startTime: number;
  private marks: { label: string; timestamp: number }[] = [];

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Mark a performance milestone with a label
   */
  mark(label: string): void {
    this.marks.push({
      label,
      timestamp: Date.now(),
    });
  }

  /**
   * Get elapsed time since timer creation in milliseconds
   */
  getElapsed(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get all performance marks as formatted strings
   */
  getMarks(): string[] {
    return this.marks.map(mark => 
      `${mark.label}: +${mark.timestamp - this.startTime}ms`
    );
  }

  /**
   * Complete timing and return structured timing context
   */
  complete(): LogContext['timing'] {
    const duration = this.getElapsed();
    return {
      startTime: this.startTime,
      duration,
      performanceMarks: this.getMarks(),
    };
  }

  /**
   * Create timing context for immediate use (without completion)
   */
  getTimingContext(): LogContext['timing'] {
    return {
      startTime: this.startTime,
      duration: this.getElapsed(),
      performanceMarks: this.getMarks(),
    };
  }
}

/**
 * Create a new performance timer
 */
export function createPerformanceTimer(): PerformanceTimer {
  return new PerformanceTimer();
}

/**
 * Utility function to time an async operation
 */
export async function timeOperation<T>(
  operation: () => Promise<T>,
  label?: string
): Promise<{ result: T; timing: LogContext['timing'] }> {
  const timer = createPerformanceTimer();
  
  if (label) {
    timer.mark(`${label}_start`);
  }
  
  try {
    const result = await operation();
    
    if (label) {
      timer.mark(`${label}_complete`);
    }
    
    return {
      result,
      timing: timer.complete(),
    };
  } catch (error) {
    if (label) {
      timer.mark(`${label}_error`);
    }
    
    throw error;
  }
}

/**
 * Utility function to time a synchronous operation
 */
export function timeSync<T>(
  operation: () => T,
  label?: string
): { result: T; timing: LogContext['timing'] } {
  const timer = createPerformanceTimer();
  
  if (label) {
    timer.mark(`${label}_start`);
  }
  
  try {
    const result = operation();
    
    if (label) {
      timer.mark(`${label}_complete`);
    }
    
    return {
      result,
      timing: timer.complete(),
    };
  } catch (error) {
    if (label) {
      timer.mark(`${label}_error`);
    }
    
    throw error;
  }
}