import { z } from "zod";

export const TreatmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  durationMinutes: z.number(),
  price: z.number(),
  pricingType: z.enum(["fixed", "from"]).default("fixed"),
  priceRangeMax: z.number().nullable().optional(),
  category: z.string().nullable().optional(),
  benefits: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  preparationInstructions: z.string().nullable().optional(),
  aftercareInstructions: z.string().nullable().optional(),
  availableFor: z.array(z.string()).optional(),
  imageUrl: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  popularityScore: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

export const CreateTreatmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  durationMinutes: z.number().min(1, "Duration must be at least 1 minute"),
  price: z.number().min(0, "Price must be positive"),
  pricingType: z.enum(["fixed", "from"]).default("fixed"),
  priceRangeMax: z.number().min(0).nullable().optional(),
  category: z.string().nullable().optional(),
  benefits: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  preparationInstructions: z.string().nullable().optional(),
  aftercareInstructions: z.string().nullable().optional(),
  availableFor: z.array(z.string()).optional(),
  imageUrl: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
});

// Types
export type Treatment = z.infer<typeof TreatmentSchema>;
export type CreateTreatmentInput = z.infer<typeof CreateTreatmentSchema>;
