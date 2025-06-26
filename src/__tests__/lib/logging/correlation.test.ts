import {
  generateCorrelationId,
  createCorrelationContext,
  createChildContext,
  extractCorrelationId,
  correlationStore,
  correlationUtils,
} from '@/lib/logging/correlation';

describe('CorrelationUtilities', () => {
  beforeEach(() => {
    // Clear correlation store before each test
    correlationStore.clear();
  });

  describe('generateCorrelationId', () => {
    it('should generate unique UUIDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(id2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(id1).not.toBe(id2);
    });
  });

  describe('createCorrelationContext', () => {
    it('should create context with generated correlation ID', () => {
      const context = createCorrelationContext();
      
      expect(context.correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(context.startTime).toBeCloseTo(Date.now(), -2); // Within ~100ms
      expect(context.parentId).toBeUndefined();
      expect(context.metadata).toBeUndefined();
    });

    it('should create context with parent ID and metadata', () => {
      const parentId = 'parent-123';
      const metadata = { operation: 'test', userId: '456' };
      
      const context = createCorrelationContext(parentId, metadata);
      
      expect(context.parentId).toBe(parentId);
      expect(context.metadata).toEqual(metadata);
    });
  });

  describe('createChildContext', () => {
    it('should create child context with parent correlation ID', () => {
      const parent = createCorrelationContext(undefined, { originalOperation: 'parent' });
      const child = createChildContext(parent, { childOperation: 'child' });
      
      expect(child.parentId).toBe(parent.correlationId);
      expect(child.correlationId).not.toBe(parent.correlationId);
      expect(child.metadata).toEqual({
        originalOperation: 'parent',
        childOperation: 'child',
      });
    });
  });

  describe('extractCorrelationId', () => {
    it('should extract from existing context', () => {
      const existingContext = createCorrelationContext();
      const extracted = extractCorrelationId({}, {}, existingContext);
      
      expect(extracted).toBe(existingContext.correlationId);
    });

    it('should extract from headers', () => {
      const correlationId = 'header-correlation-123';
      const headers = { 'x-correlation-id': correlationId };
      const extracted = extractCorrelationId(headers);
      
      expect(extracted).toBe(correlationId);
    });

    it('should extract from alternative header names', () => {
      const correlationId = 'request-id-456';
      const headers = { 'x-request-id': correlationId };
      const extracted = extractCorrelationId(headers);
      
      expect(extracted).toBe(correlationId);
    });

    it('should handle array header values', () => {
      const correlationId = 'array-id-789';
      const headers = { 'x-correlation-id': [correlationId, 'other'] };
      const extracted = extractCorrelationId(headers);
      
      expect(extracted).toBe(correlationId);
    });

    it('should extract from query parameters', () => {
      const correlationId = 'query-id-999';
      const query = { correlationId };
      const extracted = extractCorrelationId({}, query);
      
      expect(extracted).toBe(correlationId);
    });

    it('should generate new ID when none found', () => {
      const extracted = extractCorrelationId({}, {});
      expect(extracted).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('correlationStore', () => {
    it('should store and retrieve contexts', () => {
      const context = createCorrelationContext();
      
      correlationStore.set(context);
      const retrieved = correlationStore.get(context.correlationId);
      
      expect(retrieved).toEqual(context);
    });

    it('should delete contexts', () => {
      const context = createCorrelationContext();
      correlationStore.set(context);
      
      const deleted = correlationStore.delete(context.correlationId);
      const retrieved = correlationStore.get(context.correlationId);
      
      expect(deleted).toBe(true);
      expect(retrieved).toBeUndefined();
    });

    it('should return false when deleting non-existent context', () => {
      const deleted = correlationStore.delete('non-existent');
      expect(deleted).toBe(false);
    });

    it('should get active correlation IDs', () => {
      const context1 = createCorrelationContext();
      const context2 = createCorrelationContext();
      
      correlationStore.set(context1);
      correlationStore.set(context2);
      
      const activeIds = correlationStore.getActiveIds();
      expect(activeIds).toContain(context1.correlationId);
      expect(activeIds).toContain(context2.correlationId);
      expect(activeIds).toHaveLength(2);
    });

    it('should cleanup old contexts', async () => {
      // Create old context
      const oldContext = createCorrelationContext();
      oldContext.startTime = Date.now() - 400000; // 400 seconds ago
      
      // Create recent context
      const recentContext = createCorrelationContext();
      
      correlationStore.set(oldContext);
      correlationStore.set(recentContext);
      
      const removed = correlationStore.cleanup(300000); // 5 minutes
      
      expect(removed).toBe(1);
      expect(correlationStore.get(oldContext.correlationId)).toBeUndefined();
      expect(correlationStore.get(recentContext.correlationId)).toBeDefined();
    });

    it('should clear all contexts', () => {
      const context1 = createCorrelationContext();
      const context2 = createCorrelationContext();
      
      correlationStore.set(context1);
      correlationStore.set(context2);
      
      correlationStore.clear();
      
      expect(correlationStore.getActiveIds()).toHaveLength(0);
    });
  });

  describe('correlationUtils', () => {
    it('should run async operation with context', async () => {
      const context = createCorrelationContext();
      let capturedContext: any;
      
      const result = await correlationUtils.withContext(context, async (ctx) => {
        capturedContext = ctx;
        return 'test-result';
      });
      
      expect(result).toBe('test-result');
      expect(capturedContext).toEqual(context);
      expect(correlationStore.get(context.correlationId)).toBeDefined();
    });

    it('should run sync operation with context', () => {
      const context = createCorrelationContext();
      let capturedContext: any;
      
      const result = correlationUtils.withContextSync(context, (ctx) => {
        capturedContext = ctx;
        return 'sync-result';
      });
      
      expect(result).toBe('sync-result');
      expect(capturedContext).toEqual(context);
      expect(correlationStore.get(context.correlationId)).toBeDefined();
    });

    it('should get current context by ID', () => {
      const context = createCorrelationContext();
      correlationStore.set(context);
      
      const retrieved = correlationUtils.getCurrentContext(context.correlationId);
      expect(retrieved).toEqual(context);
    });

    it('should create and store new context', () => {
      const parentId = 'parent-123';
      const metadata = { test: 'data' };
      
      const context = correlationUtils.createAndStore(parentId, metadata);
      
      expect(context.parentId).toBe(parentId);
      expect(context.metadata).toEqual(metadata);
      expect(correlationStore.get(context.correlationId)).toEqual(context);
    });

    it('should cleanup contexts through utils', () => {
      const oldContext = createCorrelationContext();
      oldContext.startTime = Date.now() - 400000;
      correlationStore.set(oldContext);
      
      const removed = correlationUtils.cleanup(300000);
      expect(removed).toBe(1);
    });
  });
});