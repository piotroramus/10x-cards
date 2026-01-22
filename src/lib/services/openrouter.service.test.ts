import { describe, it, expect } from 'vitest';
import {
  OpenRouterService,
  createOpenRouterService,
  UnauthorizedError,
  BadRequestError,
  PaymentRequiredError,
  NotFoundError,
  RateLimitError,
  ServerError,
  NetworkError,
  InvalidJsonError,
  SchemaValidationError,
} from './openrouter.service';

describe('OpenRouter Service', () => {
  describe('Error Classes', () => {
    describe('UnauthorizedError', () => {
      it('should create error with correct properties', () => {
        const error = new UnauthorizedError();
        
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('UnauthorizedError');
        expect(error.code).toBe('UNAUTHORIZED');
        expect(error.statusCode).toBe(401);
        expect(error.message).toContain('Invalid or missing');
      });

      it('should accept custom message', () => {
        const error = new UnauthorizedError('Custom message');
        
        expect(error.message).toBe('Custom message');
      });
    });

    describe('BadRequestError', () => {
      it('should create error with correct properties', () => {
        const error = new BadRequestError('Invalid parameter');
        
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('BadRequestError');
        expect(error.code).toBe('BAD_REQUEST');
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Invalid parameter');
      });

      it('should accept details object', () => {
        const details = { field: 'temperature', reason: 'out of range' };
        const error = new BadRequestError('Invalid parameter', details);
        
        expect(error.details).toEqual(details);
      });
    });

    describe('PaymentRequiredError', () => {
      it('should create error with correct properties', () => {
        const error = new PaymentRequiredError();
        
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('PaymentRequiredError');
        expect(error.code).toBe('PAYMENT_REQUIRED');
        expect(error.statusCode).toBe(402);
        expect(error.message).toContain('quota');
      });
    });

    describe('NotFoundError', () => {
      it('should create error with correct properties', () => {
        const error = new NotFoundError();
        
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('NotFoundError');
        expect(error.code).toBe('NOT_FOUND');
        expect(error.statusCode).toBe(404);
        expect(error.message).toContain('Model not found');
      });
    });

    describe('RateLimitError', () => {
      it('should create error with correct properties', () => {
        const error = new RateLimitError();
        
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('RateLimitError');
        expect(error.code).toBe('RATE_LIMIT');
        expect(error.statusCode).toBe(429);
        expect(error.message).toContain('Rate limit');
      });

      it('should store retryAfter value', () => {
        const error = new RateLimitError('Rate limit exceeded', 60);
        
        expect(error.retryAfter).toBe(60);
      });
    });

    describe('ServerError', () => {
      it('should create error with correct properties', () => {
        const error = new ServerError();
        
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('ServerError');
        expect(error.code).toBe('SERVER_ERROR');
        expect(error.statusCode).toBe(500);
        expect(error.message).toContain('server error');
      });
    });

    describe('NetworkError', () => {
      it('should create error with correct properties', () => {
        const error = new NetworkError();
        
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('NetworkError');
        expect(error.code).toBe('NETWORK_ERROR');
        expect(error.message).toContain('Network error');
      });

      it('should not have statusCode', () => {
        const error = new NetworkError();
        
        expect(error.statusCode).toBeUndefined();
      });
    });

    describe('InvalidJsonError', () => {
      it('should create error with correct properties', () => {
        const error = new InvalidJsonError();
        
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('InvalidJsonError');
        expect(error.code).toBe('INVALID_JSON');
        expect(error.message).toContain('invalid JSON');
      });

      it('should accept custom message', () => {
        const error = new InvalidJsonError('Custom JSON error');
        
        expect(error.message).toBe('Custom JSON error');
      });
    });

    describe('SchemaValidationError', () => {
      it('should create error with correct properties', () => {
        const validationErrors = [
          { path: 'field1', message: 'Required' },
          { path: 'field2', message: 'Invalid type' },
        ];
        const error = new SchemaValidationError('Validation failed', validationErrors);
        
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('SchemaValidationError');
        expect(error.code).toBe('SCHEMA_VALIDATION_ERROR');
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toEqual(validationErrors);
      });
    });
  });

  describe('Service Initialization', () => {
    it('should create service with required API key', () => {
      const service = new OpenRouterService({
        apiKey: 'test-api-key',
      });

      expect(service).toBeInstanceOf(OpenRouterService);
      expect(service.config.apiKey).toContain('test');
      expect(service.config.apiKey).toContain('...'); // Masked
    });

    it('should throw error when API key is missing', () => {
      expect(() => {
        new OpenRouterService({ apiKey: '' });
      }).toThrow('API key is required');
    });

    it('should throw error when API key is whitespace', () => {
      expect(() => {
        new OpenRouterService({ apiKey: '   ' });
      }).toThrow('API key is required');
    });

    it('should use default base URL', () => {
      const service = new OpenRouterService({
        apiKey: 'test-key',
      });

      expect(service.config.baseUrl).toBe('https://openrouter.ai/api/v1');
    });

    it('should accept custom base URL', () => {
      const service = new OpenRouterService({
        apiKey: 'test-key',
        baseUrl: 'https://custom.api.com',
      });

      expect(service.config.baseUrl).toBe('https://custom.api.com');
    });

    it('should store default model', () => {
      const service = new OpenRouterService({
        apiKey: 'test-key',
        defaultModel: 'openai/gpt-4o-mini',
      });

      expect(service.config.defaultModel).toBe('openai/gpt-4o-mini');
    });

    it('should store default temperature', () => {
      const service = new OpenRouterService({
        apiKey: 'test-key',
        defaultTemperature: 0.7,
      });

      expect(service.config.defaultTemperature).toBe(0.7);
    });

    it('should store default max tokens', () => {
      const service = new OpenRouterService({
        apiKey: 'test-key',
        defaultMaxTokens: 2000,
      });

      expect(service.config.defaultMaxTokens).toBe(2000);
    });

    it('should use default timeout', () => {
      const service = new OpenRouterService({
        apiKey: 'test-key',
      });

      expect(service.config.timeoutMs).toBe(30000);
    });

    it('should accept custom timeout', () => {
      const service = new OpenRouterService({
        apiKey: 'test-key',
        timeoutMs: 60000,
      });

      expect(service.config.timeoutMs).toBe(60000);
    });

    it('should use default retry attempts', () => {
      const service = new OpenRouterService({
        apiKey: 'test-key',
      });

      expect(service.config.retryAttempts).toBe(2);
    });

    it('should accept custom retry attempts', () => {
      const service = new OpenRouterService({
        apiKey: 'test-key',
        retryAttempts: 5,
      });

      expect(service.config.retryAttempts).toBe(5);
    });

    it('should mask API key in config', () => {
      const service = new OpenRouterService({
        apiKey: 'sk-1234567890abcdef',
      });

      expect(service.config.apiKey).not.toContain('1234567890abcdef');
      expect(service.config.apiKey).toContain('sk-1');
      expect(service.config.apiKey).toContain('...');
    });

    it('should mask short API keys completely', () => {
      const service = new OpenRouterService({
        apiKey: 'short',
      });

      expect(service.config.apiKey).toBe('****');
    });

    it('should freeze config object', () => {
      const service = new OpenRouterService({
        apiKey: 'test-key',
      });

      expect(Object.isFrozen(service.config)).toBe(true);
    });
  });

  describe('createOpenRouterService factory', () => {
    it('should throw error when OPENROUTER_API_KEY is not set', () => {
      // Clear the environment variable for this test
      const originalKey = import.meta.env.OPENROUTER_API_KEY;
      delete import.meta.env.OPENROUTER_API_KEY;

      expect(() => {
        createOpenRouterService();
      }).toThrow('OPENROUTER_API_KEY environment variable is required');

      // Restore
      if (originalKey) {
        import.meta.env.OPENROUTER_API_KEY = originalKey;
      }
    });

    it('should accept configuration overrides', () => {
      // Set environment variable for this test
      const originalKey = import.meta.env.OPENROUTER_API_KEY;
      import.meta.env.OPENROUTER_API_KEY = 'test-key-from-env';

      const service = createOpenRouterService({
        defaultModel: 'openai/gpt-4o',
        defaultTemperature: 0.5,
      });

      expect(service.config.defaultModel).toBe('openai/gpt-4o');
      expect(service.config.defaultTemperature).toBe(0.5);

      // Restore
      if (originalKey) {
        import.meta.env.OPENROUTER_API_KEY = originalKey;
      } else {
        delete import.meta.env.OPENROUTER_API_KEY;
      }
    });
  });

  describe('Request Validation', () => {
    it('should validate temperature range', () => {
      const service = new OpenRouterService({
        apiKey: 'test-key',
        defaultModel: 'test-model',
      });

      // Test with out of range temperature
      expect(() => {
        // @ts-expect-error - Testing invalid input
        service['buildRequestBody']({
          messages: [{ role: 'user', content: 'test' }],
          temperature: 3.0, // Invalid: > 2
        });
      }).toThrow('Temperature must be between 0 and 2');

      expect(() => {
        // @ts-expect-error - Testing invalid input
        service['buildRequestBody']({
          messages: [{ role: 'user', content: 'test' }],
          temperature: -1, // Invalid: < 0
        });
      }).toThrow('Temperature must be between 0 and 2');
    });

    it('should validate maxTokens is positive', () => {
      const service = new OpenRouterService({
        apiKey: 'test-key',
        defaultModel: 'test-model',
      });

      expect(() => {
        // @ts-expect-error - Testing invalid input
        service['buildRequestBody']({
          messages: [{ role: 'user', content: 'test' }],
          maxTokens: 0, // Invalid
        });
      }).toThrow('maxTokens must be greater than 0');

      expect(() => {
        // @ts-expect-error - Testing invalid input
        service['buildRequestBody']({
          messages: [{ role: 'user', content: 'test' }],
          maxTokens: -100, // Invalid
        });
      }).toThrow('maxTokens must be greater than 0');
    });

    it('should require either messages or prompt', () => {
      const service = new OpenRouterService({
        apiKey: 'test-key',
        defaultModel: 'test-model',
      });

      expect(() => {
        // @ts-expect-error - Testing invalid input
        service['buildRequestBody']({});
      }).toThrow('Either \'messages\' or \'prompt\' must be provided');
    });

    it('should not allow both messages and prompt', () => {
      const service = new OpenRouterService({
        apiKey: 'test-key',
        defaultModel: 'test-model',
      });

      expect(() => {
        // @ts-expect-error - Testing invalid input
        service['buildRequestBody']({
          messages: [{ role: 'user', content: 'test' }],
          prompt: 'test prompt',
        });
      }).toThrow('Cannot provide both');
    });

    it('should require model in config or options', () => {
      const service = new OpenRouterService({
        apiKey: 'test-key',
        // No default model
      });

      expect(() => {
        // @ts-expect-error - Testing invalid input
        service['buildRequestBody']({
          messages: [{ role: 'user', content: 'test' }],
          // No model specified
        });
      }).toThrow('Model must be provided');
    });
  });
});
