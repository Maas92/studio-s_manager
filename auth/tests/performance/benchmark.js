const autocannon = require("autocannon");

const tests = [
  {
    name: "Health Check",
    url: "http://localhost:5002/health",
    connections: 100,
    duration: 10,
  },
  {
    name: "JWKS Endpoint",
    url: "http://localhost:5002/.well-known/jwks.json",
    connections: 50,
    duration: 10,
  },
  {
    name: "Login Endpoint",
    url: "http://localhost:5002/api/v1/auth/login",
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: "test@example.com",
      password: "Test@1234",
    }),
    connections: 10,
    duration: 10,
  },
];

async function runTests() {
  console.log("🚀 Starting Performance Tests\n");

  for (const test of tests) {
    console.log(`\n📊 Testing: ${test.name}`);
    console.log("━".repeat(50));

    const result = await autocannon({
      url: test.url,
      method: test.method || "GET",
      headers: test.headers,
      body: test.body,
      connections: test.connections,
      duration: test.duration,
    });

    console.log(`\nResults for ${test.name}:`);
    console.log(`  Requests: ${result.requests.total}`);
    console.log(`  Throughput: ${result.throughput.mean} bytes/sec`);
    console.log(`  Latency: ${result.latency.mean}ms (avg)`);
    console.log(`  Errors: ${result.errors}`);
    console.log(`  Timeouts: ${result.timeouts}`);
  }

  console.log("\n✅ Performance tests completed\n");
}

runTests().catch(console.error);