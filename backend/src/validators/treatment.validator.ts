import { z } from "zod";

export const createTreatmentSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    durationMinutes: z.number().int().min(1),
    price: z.number().nonnegative(),
    category: z.string().optional(),
    benefits: z.array(z.string()).optional(),
    contraindications: z.array(z.string()).optional(),
    preparationInstructions: z.string().optional(),
    aftercareInstructions: z.string().optional(),
    availableFor: z.array(z.string()).optional(), // expect array of IDs
    imageUrl: z.string().optional(),
    isActive: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const updateTreatmentSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    durationMinutes: z.number().int().min(1).optional(),
    price: z.number().nonnegative().optional(),
    category: z.string().optional(),
    benefits: z.array(z.string()).optional(),
    contraindications: z.array(z.string()).optional(),
    preparationInstructions: z.string().optional(),
    aftercareInstructions: z.string().optional(),
    availableFor: z.array(z.string()).optional(),
    imageUrl: z.string().optional(),
    isActive: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  }),
});
