import { PerformanceTimer, createPerformanceTimer, timeOperation, timeSync } from '@/lib/logging/performance';

describe('PerformanceTimer', () => {
  describe('PerformanceTimer class', () => {
    it('should create timer with start time', () => {
      const timer = new PerformanceTimer();
      expect(timer.startTime).toBeGreaterThan(0);
      expect(typeof timer.startTime).toBe('number');
    });

    it('should track performance marks', () => {
      const timer = new PerformanceTimer();
      timer.mark('checkpoint1');
      timer.mark('checkpoint2');
      
      const marks = timer.getMarks();
      expect(marks).toHaveLength(2);
      expect(marks[0]).toMatch(/checkpoint1: \+\d+ms/);
      expect(marks[1]).toMatch(/checkpoint2: \+\d+ms/);
    });

    it('should calculate elapsed time', async () => {
      const timer = new PerformanceTimer();
      
      // Wait a small amount to ensure elapsed time > 0
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const elapsed = timer.getElapsed();
      expect(elapsed).toBeGreaterThanOrEqual(0);
      expect(typeof elapsed).toBe('number');
    });

    it('should complete timing with full context', async () => {
      const timer = new PerformanceTimer();
      timer.mark('start_operation');
      
      // Wait to ensure measurable time
      await new Promise(resolve => setTimeout(resolve, 1));
      
      timer.mark('end_operation');
      const timing = timer.complete();
      
      expect(timing).toMatchObject({
        startTime: expect.any(Number),
        duration: expect.any(Number),
        performanceMarks: expect.any(Array),
      });
      
      expect(timing.duration).toBeGreaterThan(0);
      expect(timing.performanceMarks).toHaveLength(2);
    });

    it('should provide timing context without completion', () => {
      const timer = new PerformanceTimer();
      timer.mark('milestone');
      
      const context = timer.getTimingContext();
      
      expect(context).toMatchObject({
        startTime: expect.any(Number),
        duration: expect.any(Number),
        performanceMarks: expect.any(Array),
      });
    });
  });

  describe('createPerformanceTimer factory', () => {
    it('should create new PerformanceTimer instance', () => {
      const timer = createPerformanceTimer();
      expect(timer).toBeInstanceOf(PerformanceTimer);
    });
  });

  describe('timeOperation utility', () => {
    it('should time async operation successfully', async () => {
      const testOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return 'success';
      };

      const result = await timeOperation(testOperation, 'test_op');
      
      expect(result.result).toBe('success');
      expect(result.timing).toMatchObject({
        startTime: expect.any(Number),
        duration: expect.any(Number),
        performanceMarks: expect.any(Array),
      });
      
      expect(result.timing.duration).toBeGreaterThan(0);
      expect(result.timing.performanceMarks).toContain('test_op_start: +0ms');
    });

    it('should time async operation without label', async () => {
      const testOperation = async () => 'result';

      const result = await timeOperation(testOperation);
      
      expect(result.result).toBe('result');
      expect(result.timing).toBeDefined();
      expect(result.timing.performanceMarks).toEqual([]);
    });

    it('should handle async operation errors', async () => {
      const testOperation = async () => {
        throw new Error('Test error');
      };

      await expect(timeOperation(testOperation, 'error_op')).rejects.toThrow('Test error');
    });
  });

  describe('timeSync utility', () => {
    it('should time synchronous operation successfully', () => {
      const testOperation = () => {
        // Simulate some work
        const start = Date.now();
        while (Date.now() - start < 1) {
          // Wait at least 1ms
        }
        return 'sync_result';
      };

      const result = timeSync(testOperation, 'sync_op');
      
      expect(result.result).toBe('sync_result');
      expect(result.timing).toMatchObject({
        startTime: expect.any(Number),
        duration: expect.any(Number),
        performanceMarks: expect.any(Array),
      });
      
      expect(result.timing.performanceMarks).toContain('sync_op_start: +0ms');
    });

    it('should time sync operation without label', () => {
      const testOperation = () => 'result';

      const result = timeSync(testOperation);
      
      expect(result.result).toBe('result');
      expect(result.timing).toBeDefined();
      expect(result.timing.performanceMarks).toEqual([]);
    });

    it('should handle sync operation errors', () => {
      const testOperation = () => {
        throw new Error('Sync error');
      };

      expect(() => timeSync(testOperation, 'error_sync')).toThrow('Sync error');
    });
  });
});