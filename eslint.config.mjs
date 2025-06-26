import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  // import.meta.dirname is available after Node.js v20.11.0
  baseDirectory: import.meta.dirname,
})

const eslintConfig = [
  ...compat.config({
    extends: ['next'],
  }),
  
  // Custom date enforcement rules to prevent direct Date usage
  // and ensure consistent use of dateUtils throughout the application
  {
    name: 'date-enforcement-rules',
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    ignores: [
      // Allow Luxon usage in config.ts since it's the foundation for dateUtils
      'src/lib/config.ts',
      // Allow Date usage in date utility tests for verification
      'src/__tests__/lib/config/date-utils.test.ts'
    ],
    rules: {
      // Prevent direct Date constructor and static method usage
      'no-restricted-syntax': [
        'error',
        {
          selector: 'NewExpression[callee.name="Date"]',
          message: 'Direct Date constructor usage is prohibited. Use dateUtils.now(), dateUtils.toDatabase(), or other dateUtils functions instead. Import from src/lib/config.ts'
        },
        {
          selector: 'CallExpression[callee.type="MemberExpression"][callee.object.name="Date"][callee.property.name="now"]',
          message: 'Date.now() is prohibited. Use dateUtils.now() for current timestamp. Import from src/lib/config.ts'
        },
        {
          selector: 'CallExpression[callee.name="Date"]',
          message: 'Direct Date() function calls are prohibited. Use dateUtils functions for consistent date handling. Import from src/lib/config.ts'
        },
        {
          selector: 'CallExpression[callee.type="MemberExpression"][callee.object.name="Date"][callee.property.name="parse"]',
          message: 'Date.parse() is prohibited. Use dateUtils.toDatabase() for parsing date strings. Import from src/lib/config.ts'
        },
        {
          selector: 'CallExpression[callee.type="MemberExpression"][callee.object.name="Date"][callee.property.name="UTC"]',
          message: 'Date.UTC() is prohibited. Use dateUtils functions for UTC date operations. Import from src/lib/config.ts'
        },
        {
          selector: 'MemberExpression[object.name="Date"][property.name="prototype"]',
          message: 'Direct access to Date.prototype is prohibited. Use dateUtils functions for date operations. Import from src/lib/config.ts'
        }
      ],
      
      // Prevent global Date object access patterns
      'no-restricted-globals': [
        'error',
        {
          name: 'Date',
          message: 'Global Date object access is prohibited. Use dateUtils functions for all date operations. Import from src/lib/config.ts'
        }
      ],

      // Enforce proper imports for date functionality
      'no-restricted-imports': [
        'error',
        {
          name: 'moment',
          message: 'Direct moment.js usage is prohibited. Use dateUtils from src/lib/config.ts which uses Luxon internally.'
        },
        {
          name: 'date-fns',
          message: 'Direct date-fns usage is prohibited. Use dateUtils from src/lib/config.ts which provides standardized date operations.'
        },
        {
          name: 'dayjs',
          message: 'Direct dayjs usage is prohibited. Use dateUtils from src/lib/config.ts which provides standardized date operations.'
        },
        {
          name: 'luxon',
          message: 'Direct Luxon import is discouraged outside of config.ts. Use dateUtils functions from src/lib/config.ts for consistency.'
        }
      ]
    }
  },

  // Special rules for test files - more lenient but still encourage dateUtils
  {
    name: 'test-file-date-rules',
    files: ['**/__tests__/**/*.ts', '**/__tests__/**/*.tsx', '**/*.test.ts', '**/*.test.tsx'],
    ignores: [
      // These test files are explicitly exempted above
      'src/__tests__/lib/config/date-utils.test.ts'
    ],
    rules: {
      // Allow limited Date usage in tests for edge case testing and verification
      'no-restricted-globals': 'off',
      'no-restricted-syntax': [
        'warn', // Warning instead of error for tests
        {
          selector: 'NewExpression[callee.name="Date"]',
          message: 'Consider using dateUtils.now() or dateUtils.testDate() for consistent test behavior. Direct Date usage should be limited to edge case testing.'
        },
        {
          selector: 'CallExpression[callee.type="MemberExpression"][callee.object.name="Date"][callee.property.name="now"]',
          message: 'Consider using dateUtils.now() for consistent test behavior. Date.now() should be limited to edge case testing.'
        }
      ],
      // Still enforce import restrictions in tests
      'no-restricted-imports': [
        'error',
        {
          name: 'moment',
          message: 'Use dateUtils from src/lib/config.ts instead of moment.js, even in tests.'
        },
        {
          name: 'date-fns',
          message: 'Use dateUtils from src/lib/config.ts instead of date-fns, even in tests.'
        },
        {
          name: 'dayjs',
          message: 'Use dateUtils from src/lib/config.ts instead of dayjs, even in tests.'
        }
        // Note: Luxon imports allowed in tests for DateTime type usage
      ]
    }
  }
]

export default eslintConfig