import "@types/jest";

// Global test setup
process.env.NODE_ENV = "test";
process.env.MONGODB_URI =
  "mongodb+srv://mansoorghumra92_db_user:Mansoor92@cluster0.3m4i0vw.mongodb.net/?appName=Cluster0";
process.env.LOG_LEVEL = "error"; // Reduce noise during tests

// Increase timeout for integration tests
jest.setTimeout(30000);
