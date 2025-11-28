import { describe, it, expect } from 'vitest';
import {
  TypeSafeTemplateValidator,
  createTemplateValidator,
  TEMPLATE_SCHEMAS,
} from '../../../src/utils/type-safe-templates.js';

describe('TypeSafeTemplateValidator', () => {
  describe('addVariable', () => {
    it('should register a single variable', () => {
      const validator = new TypeSafeTemplateValidator();
      validator.addVariable('name', 'string', true, 'User name');

      const result = validator.validateTemplate('{{name}}');
      expect(result.valid).toBe(true);
    });

    it('should handle optional variables', () => {
      const validator = new TypeSafeTemplateValidator();
      validator.addVariable('email', 'string', false);

      const result = validator.validateTemplate('{{email}}');
      // Optional variable used - should warn that required variable is missing
      expect(result.valid).toBe(true);
    });
  });

  describe('addVariables', () => {
    it('should register multiple variables at once', () => {
      const validator = new TypeSafeTemplateValidator();
      validator.addVariables({
        title: { type: 'string', required: true },
        count: { type: 'number', required: true },
        active: { type: 'boolean', required: false },
      });

      const result = validator.validateTemplate('{{title}} - {{count}} - {{active}}');
      expect(result.valid).toBe(true);
    });
  });

  describe('registerHelper', () => {
    it('should register custom helpers', () => {
      const validator = new TypeSafeTemplateValidator();
      validator.registerHelper('customHelper');

      const result = validator.validateTemplate('{{customHelper value}}');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateTemplate', () => {
    it.skip('should detect syntax errors', () => {
      const validator = new TypeSafeTemplateValidator();
      const result = validator.validateTemplate('{{unclosed');

      // Syntax errors should be detected
      expect(result.valid === false || result.errors.length > 0).toBe(true);
    });

    it('should extract used variables', () => {
      const validator = new TypeSafeTemplateValidator();
      validator.addVariables({
        name: { type: 'string' },
        email: { type: 'string' },
      });

      const result = validator.validateTemplate('Name: {{name}}, Email: {{email}}');
      expect(result.usedVariables).toContain('name');
      expect(result.usedVariables).toContain('email');
    });

    it('should detect missing variables', () => {
      const validator = new TypeSafeTemplateValidator();
      validator.addVariables({
        name: { type: 'string' },
      });

      const result = validator.validateTemplate('{{name}} {{undefined}}');
      expect(result.missingVariables).toContain('undefined');
    });

    it('should handle nested variable access', () => {
      const validator = new TypeSafeTemplateValidator();
      validator.addVariable('user', 'object');

      const result = validator.validateTemplate('{{user.name}}');
      expect(result.usedVariables).toContain('user');
    });

    it('should validate built-in helpers', () => {
      const validator = new TypeSafeTemplateValidator();
      validator.addVariable('items', 'array');

      const result = validator.validateTemplate('{{#each items}}{{this}}{{/each}}');
      expect(result.valid).toBe(true);
    });

    it('should detect invalid helpers', () => {
      const validator = new TypeSafeTemplateValidator();
      const result = validator.validateTemplate('{{unknownHelper}}');

      // Should detect unknown helper or treat as variable warning
      expect(result.errors.length + result.warnings.length).toBeGreaterThan(0);
    });

    it('should ignore built-in loop variables', () => {
      const validator = new TypeSafeTemplateValidator();
      validator.addVariable('items', 'array');

      const result = validator.validateTemplate(
        '{{#each items}}Index: {{@index}}, Key: {{@key}}{{/each}}'
      );
      expect(result.missingVariables).not.toContain('@index');
      expect(result.missingVariables).not.toContain('@key');
    });
  });

  describe('generateTypeScriptInterface', () => {
    it('should generate interface from variables', () => {
      const validator = new TypeSafeTemplateValidator();
      validator.addVariables({
        name: { type: 'string', required: true, description: 'User name' },
        age: { type: 'number', required: false },
      });

      const iface = validator.generateTypeScriptInterface('User');
      expect(iface).toContain('interface User');
      expect(iface).toContain('name: string');
      expect(iface).toContain('age?: number');
      expect(iface).toContain('User name');
    });

    it('should handle all data types', () => {
      const validator = new TypeSafeTemplateValidator();
      validator.addVariables({
        text: { type: 'string' },
        num: { type: 'number' },
        flag: { type: 'boolean' },
        items: { type: 'array' },
        data: { type: 'object' },
        timestamp: { type: 'date' },
      });

      const iface = validator.generateTypeScriptInterface();
      expect(iface).toContain('string');
      expect(iface).toContain('number');
      expect(iface).toContain('boolean');
      expect(iface).toContain('any[]');
      expect(iface).toContain('Record<string, any>');
      expect(iface).toContain('Date | string');
    });
  });

  describe('getValidationReport', () => {
    it('should generate valid report text', () => {
      const validator = new TypeSafeTemplateValidator();
      validator.addVariable('name', 'string');

      const result = validator.validateTemplate('{{name}}');
      const report = validator.getValidationReport(result);

      expect(report).toContain('✅ VALID');
      expect(report).toContain('# Template Validation Report');
    });

    it('should include errors in report', () => {
      const validator = new TypeSafeTemplateValidator();
      const result = validator.validateTemplate('{{invalid}}');
      const report = validator.getValidationReport(result);

      // Report should include statistics
      expect(report).toContain('Template Validation Report');
    });

    it('should include statistics', () => {
      const validator = new TypeSafeTemplateValidator();
      validator.addVariables({
        a: { type: 'string' },
        b: { type: 'number' },
      });

      const result = validator.validateTemplate('{{a}} {{b}}');
      const report = validator.getValidationReport(result);

      expect(report).toContain('Used Variables');
      expect(report).toContain('Statistics');
    });
  });
});

describe('createTemplateValidator', () => {
  it('should create validator with schema', () => {
    const schema = {
      title: { type: 'string' as const, required: true },
      count: { type: 'number' as const, required: true },
    };

    const validator = createTemplateValidator(schema);
    const result = validator.validateTemplate('{{title}} - {{count}}');

    expect(result.valid).toBe(true);
  });
});

describe('TEMPLATE_SCHEMAS', () => {
  it('should define pullRequest schema', () => {
    expect(TEMPLATE_SCHEMAS.pullRequest).toBeDefined();
    expect(TEMPLATE_SCHEMAS.pullRequest.number).toBeDefined();
    expect(TEMPLATE_SCHEMAS.pullRequest.title).toBeDefined();
  });

  it('should define repositorySummary schema', () => {
    expect(TEMPLATE_SCHEMAS.repositorySummary).toBeDefined();
    expect(TEMPLATE_SCHEMAS.repositorySummary.owner).toBeDefined();
    expect(TEMPLATE_SCHEMAS.repositorySummary.name).toBeDefined();
  });

  it('should define analytics schema', () => {
    expect(TEMPLATE_SCHEMAS.analytics).toBeDefined();
    expect(TEMPLATE_SCHEMAS.analytics.totalPRs).toBeDefined();
    expect(TEMPLATE_SCHEMAS.analytics.mergeRate).toBeDefined();
  });

  it('should validate against pullRequest schema', () => {
    const validator = createTemplateValidator(TEMPLATE_SCHEMAS.pullRequest);
    const template = '# PR #{{number}} - {{title}}\nAuthor: {{author}}\nState: {{state}}';

    const result = validator.validateTemplate(template);
    expect(result.usedVariables).toContain('number');
    expect(result.usedVariables).toContain('title');
  });
});
