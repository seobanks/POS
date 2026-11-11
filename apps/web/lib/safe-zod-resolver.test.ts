import assert from "node:assert/strict";
import { test } from "node:test";
import { safeZodResolver } from "./safe-zod-resolver.ts";

test("safeZodResolver returns values on successful validation", async () => {
  const mockSchema = {
    safeParse: (input: any) => ({
      success: true as const,
      data: { email: input.email, password: input.password },
    }),
  };

  const resolver = safeZodResolver(mockSchema);
  const result = await (resolver as any)({ email: "user@example.com", password: "password123" });

  assert.deepEqual(result.values, { email: "user@example.com", password: "password123" });
  assert.deepEqual(result.errors, {});
});

test("safeZodResolver converts Zod 4 issues into field errors without throwing", async () => {
  const mockSchema = {
    safeParse: () => ({
      success: false as const,
      error: {
        issues: [
          { path: ["email"], message: "Please enter a valid email address", code: "invalid_string" },
          { path: ["password"], message: "Password is required", code: "too_small" },
        ],
      },
    }),
  };

  const resolver = safeZodResolver(mockSchema);
  const result = await (resolver as any)({ email: "invalid", password: "" });

  assert.deepEqual(result.values, {});
  assert.equal(result.errors.email?.message, "Please enter a valid email address");
  assert.equal(result.errors.password?.message, "Password is required");
});

test("safeZodResolver handles Zod 3 legacy error format with errors array", async () => {
  const mockSchema = {
    safeParse: () => ({
      success: false as const,
      error: {
        errors: [
          { path: ["email"], message: "Invalid email", code: "custom" },
        ],
      },
    }),
  };

  const resolver = safeZodResolver(mockSchema);
  const result = await (resolver as any)({ email: "invalid" });

  assert.deepEqual(result.values, {});
  assert.equal(result.errors.email?.message, "Invalid email");
});

test("safeZodResolver handles thrown exceptions safely without unhandled rejections", async () => {
  const mockSchema = {
    safeParse: () => {
      throw new Error("Unexpected parser crash");
    },
  };

  const resolver = safeZodResolver(mockSchema);
  const result = await (resolver as any)({ email: "test" });

  assert.deepEqual(result.values, {});
  assert.equal(result.errors.root?.message, "Unexpected parser crash");
});

test("safeZodResolver validates email for forgotPassword", async () => {
  const mockForgotPasswordSchema = {
    safeParse: (input: any) => {
      if (!input?.email || !input.email.includes("@")) {
        return {
          success: false as const,
          error: {
            issues: [{ path: ["email"], message: "Please enter a valid email address", code: "invalid_string" }],
          },
        };
      }
      return { success: true as const, data: input };
    },
  };

  const resolver = safeZodResolver(mockForgotPasswordSchema);
  const invalid = await (resolver as any)({ email: "notanemail" });
  assert.equal(invalid.errors.email?.message, "Please enter a valid email address");

  const valid = await (resolver as any)({ email: "user@hanva.in" });
  assert.deepEqual(valid.values, { email: "user@hanva.in" });
  assert.deepEqual(valid.errors, {});
});
