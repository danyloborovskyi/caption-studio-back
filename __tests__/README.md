# Testing Guide

## 🧪 Running Tests

### Run all tests with coverage

```bash
npm test
```

### Run tests in watch mode (for development)

```bash
npm run test:watch
```

### Run tests for CI (optimized for GitHub Actions)

```bash
npm run test:ci
```

---

## 📁 Test Structure

```
__tests__/
├── setup.js                    # Global test configuration
├── __mocks__/                  # Mock implementations
│   └── supabase.js            # Supabase mock
├── models/                     # Domain model tests
│   └── File.test.js           # File entity tests
├── utils/                      # Utility function tests
│   └── fileService.test.js    # File validation tests
└── integration/                # API endpoint tests
    └── auth.test.js           # Authentication tests
```

---

## ✅ What's Tested

### ✅ Domain Models (`models/`)

- File entity business logic
- Data transformations
- Status checks

### ✅ Utilities (`utils/`)

- File validation (size, extension)
- Path traversal prevention
- Filename sanitization
- Secure random generation

### ✅ Integration Tests (`integration/`)

- Authentication endpoints
- Password validation
- Error handling

---

## 📊 Coverage

Current coverage thresholds:

- **Branches:** 50%
- **Functions:** 50%
- **Lines:** 50%
- **Statements:** 50%

View coverage report:

```bash
npm test
open coverage/lcov-report/index.html
```

---

## 🎯 Writing New Tests

### Unit Test Example

```javascript
// __tests__/services/MyService.test.js
const MyService = require("../../services/MyService");

describe("MyService", () => {
  it("should do something", () => {
    const result = MyService.doSomething();
    expect(result).toBe(expected);
  });
});
```

### Integration Test Example

```javascript
// __tests__/integration/myEndpoint.test.js
const request = require("supertest");
const app = require("../../server");

describe("POST /api/my-endpoint", () => {
  it("should return 200", async () => {
    const response = await request(app)
      .post("/api/my-endpoint")
      .send({ data: "test" });

    expect(response.status).toBe(200);
  });
});
```

---

## 🔧 Mocking

### Mock Supabase

```javascript
jest.mock("@supabase/supabase-js", () => {
  const mockClient = {
    auth: { signIn: jest.fn() },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    })),
  };
  return { createClient: jest.fn(() => mockClient) };
});
```

### Mock OpenAI

```javascript
jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "mock response" } }],
        }),
      },
    },
  }));
});
```

---

## 🚀 Next Steps

### Add more tests for:

1. **Controllers** - HTTP request handling
2. **Services** - Business logic
3. **Repositories** - Database operations
4. **Middleware** - Auth and validation
5. **Error handling** - Edge cases

### Test categories to implement:

- [ ] Upload endpoint tests
- [ ] File management tests
- [ ] Bulk operations tests
- [ ] Middleware tests
- [ ] Error scenario tests
- [ ] Security tests
- [ ] Performance tests

---

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)

---

## ⚡ Tips

1. **Run tests before committing**

   ```bash
   npm test && git commit
   ```

2. **Use watch mode during development**

   ```bash
   npm run test:watch
   ```

3. **Check coverage regularly**

   ```bash
   npm test && open coverage/lcov-report/index.html
   ```

4. **Keep tests fast** - Mock external services

5. **Test behavior, not implementation** - Focus on what, not how
