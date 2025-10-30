/**
 * Jest Setup File
 * Global configuration and mocks for all tests
 */

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_KEY = "test-service-key";
process.env.OPENAI_API_KEY = "test-openai-key";
process.env.FRONTEND_URL = "http://localhost:3000";

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
