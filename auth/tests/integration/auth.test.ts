import request from "supertest";
import app from "../../src/app";
import { connectDatabase, disconnectDatabase } from "../../src/config/database";
import User from "../../src/models/userModel";
import { describe, it, beforeAll } from "node:test";
// import { expect, beforeAll, afterAll } from "jest";

describe("Auth Integration Tests", () => {
  let accessToken: string;
  let refreshCookie: string;
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: "SecureP@ss123",
    firstName: "Test",
    lastName: "User",
  };

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    // Cleanup test user
    await User.deleteOne({ email: testUser.email });
    await disconnectDatabase();
  });

  describe("POST /api/v1/auth/signup", () => {
    it("should create a new user and return access token", async () => {
      const response = await request(app)
        .post("/api/v1/auth/signup")
        .send(testUser)
        .expect(201);

      expect(response.body.status).toBe("success");
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.password).toBeUndefined();

      accessToken = response.body.data.accessToken;
    });

    it("should reject duplicate email", async () => {
      await request(app).post("/api/v1/auth/signup").send(testUser).expect(409);
    });

    it("should reject weak password", async () => {
      await request(app)
        .post("/api/v1/auth/signup")
        .send({
          email: "weak@example.com",
          password: "weak",
          firstName: "Test",
          lastName: "User",
        })
        .expect(400);
    });

    it("should reject invalid email", async () => {
      await request(app)
        .post("/api/v1/auth/signup")
        .send({
          email: "not-an-email",
          password: "SecureP@ss123",
          firstName: "Test",
          lastName: "User",
        })
        .expect(400);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should login with correct credentials", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.headers["set-cookie"]).toBeDefined();

      accessToken = response.body.data.accessToken;
      refreshCookie = response.headers["set-cookie"][0];
    });

    it("should reject wrong password", async () => {
      await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: testUser.email,
          password: "WrongPassword@123",
        })
        .expect(401);
    });

    it("should reject non-existent user", async () => {
      await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: testUser.password,
        })
        .expect(401);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("should return user data with valid token", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it("should reject request without token", async () => {
      await request(app).get("/api/v1/auth/me").expect(401);
    });

    it("should reject request with invalid token", async () => {
      await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer invalid.token.here")
        .expect(401);
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    it("should refresh access token with valid refresh cookie", async () => {
      const response = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", refreshCookie)
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
      accessToken = response.body.data.accessToken;
    });

    it("should reject refresh without cookie", async () => {
      await request(app).post("/api/v1/auth/refresh").expect(401);
    });
  });

  describe("PATCH /api/v1/auth/update-password", () => {
    const newPassword = "NewSecureP@ss456";

    it("should update password with correct current password", async () => {
      const response = await request(app)
        .patch("/api/v1/auth/update-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Cookie", refreshCookie)
        .send({
          currentPassword: testUser.password,
          newPassword: newPassword,
          newPasswordConfirm: newPassword,
        })
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
      testUser.password = newPassword; // Update for subsequent tests
    });

    it("should reject with wrong current password", async () => {
      await request(app)
        .patch("/api/v1/auth/update-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          currentPassword: "WrongPassword@123",
          newPassword: "NewPassword@123",
          newPasswordConfirm: "NewPassword@123",
        })
        .expect(401);
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("should logout successfully", async () => {
      await request(app)
        .post("/api/v1/auth/logout")
        .set("Cookie", refreshCookie)
        .expect(200);
    });

    it("should reject refresh after logout", async () => {
      await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", refreshCookie)
        .expect(401);
    });
  });

  describe("Security Tests", () => {
    it("should block NoSQL injection in login", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: { $gt: "" },
          password: { $gt: "" },
        })
        .expect(400);

      expect(response.body.message).toMatch(/dangerous key/i);
    });

    it("should sanitize XSS attempts", async () => {
      const response = await request(app).post("/api/v1/auth/signup").send({
        email: "xss-test@example.com",
        password: "SecureP@ss123",
        firstName: '<script>alert("XSS")</script>',
        lastName: "User",
      });

      // Should either reject or sanitize
      if (response.status === 201) {
        expect(response.body.data.user.firstName).not.toContain("<script>");
      }
    });

    it("should enforce rate limiting", { timeout: 30000 }, async () => {
      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app).post("/api/v1/auth/login").send({
            email: "ratelimit@test.com",
            password: "Test@1234",
          })
        );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some((r) => r.status === 429);

      expect(rateLimited).toBe(true);
    }); // Increase timeout for rate limit test
  });
});

// function expect(rateLimited: boolean) {
//   throw new Error("Function not implemented.");
// }
// function afterAll(arg0: () => Promise<void>) {
//   throw new Error("Function not implemented.");
// }
// function expect(status: any) {
//   throw new Error("Function not implemented.");
// }

// function beforeAll(arg0: () => Promise<void>) {
//   throw new Error("Function not implemented.");
// }
