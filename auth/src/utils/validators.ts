import { z } from "zod";

// Password validation rules
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character"
  );

// Auth schemas
export const signupSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email address")
      .toLowerCase()
      .trim(),
    password: passwordSchema,
    name: z.string().min(2).max(100).optional(),
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    role: z
      .enum(["admin", "manager", "therapist", "receptionist"])
      .optional()
      .default("therapist"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email address")
      .toLowerCase()
      .trim(),
    password: z.string().min(1, "Password is required"),
  }),
});

export const updatePasswordSchema = z
  .object({
    body: z.object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: passwordSchema,
      newPasswordConfirm: z
        .string()
        .min(1, "Password confirmation is required"),
    }),
  })
  .refine((data) => data.body.newPassword === data.body.newPasswordConfirm, {
    message: "Passwords do not match",
    path: ["body", "newPasswordConfirm"],
  });

export const updateUserSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    email: z.string().email().toLowerCase().trim().optional(),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/)
      .optional(),
    bio: z.string().max(500).optional(),
    specializations: z.array(z.string()).optional(),
    profileImage: z.string().url().optional(),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email address")
      .toLowerCase()
      .trim(),
  }),
});

export const resetPasswordSchema = z
  .object({
    body: z.object({
      password: passwordSchema,
      passwordConfirm: z.string().min(1, "Password confirmation is required"),
    }),
    params: z.object({
      token: z.string().min(1, "Reset token is required"),
    }),
  })
  .refine((data) => data.body.password === data.body.passwordConfirm, {
    message: "Passwords do not match",
    path: ["body", "passwordConfirm"],
  });

// Type exports
export type SignupInput = z.infer<typeof signupSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>["body"];
export type UpdateUserInput = z.infer<typeof updateUserSchema>["body"];
