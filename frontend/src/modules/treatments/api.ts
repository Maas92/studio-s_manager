import api from "../../services/api";
import { z } from "zod";
import { toArray } from "../../services/normalise";
import { mockTreatments } from "./mockTreatments";

// Schemas
export const TreatmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  durationMinutes: z.number(),
  price: z.number(),
  category: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  preparationInstructions: z.string().optional(),
  aftercareInstructions: z.string().optional(),
  availableFor: z.array(z.string()).optional(), // Staff IDs who can perform this treatment
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  popularityScore: z.number().optional(), // Based on bookings
  tags: z.array(z.string()).optional(),
});

export const CreateTreatmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  durationMinutes: z.number().min(1, "Duration must be at least 1 minute"),
  price: z.number().min(0, "Price must be positive"),
  category: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  preparationInstructions: z.string().optional(),
  aftercareInstructions: z.string().optional(),
  availableFor: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
});

// Types
export type Treatment = z.infer<typeof TreatmentSchema>;
export type CreateTreatmentInput = z.infer<typeof CreateTreatmentSchema>;

const USE_MOCK_DATA = false;

// API Functions
export async function listTreatments(): Promise<Treatment[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockTreatments;
  }

  try {
    const { data } = await api.get("/treatments");
    const treatments = toArray<Treatment>(data);
    return treatments.map((treatment) => TreatmentSchema.parse(treatment));
  } catch (error) {
    console.error("Failed to fetch treatments:", error);
    throw new Error("Unable to load treatments. Please try again.");
  }
}

export async function getTreatment(id: string): Promise<Treatment> {
  try {
    const { data } = await api.get(`/treatments/${id}`);
    return TreatmentSchema.parse(data);
  } catch (error) {
    console.error("Failed to fetch treatment:", error);
    throw new Error("Unable to load treatment details. Please try again.");
  }
}

export async function createTreatment(
  input: CreateTreatmentInput
): Promise<Treatment> {
  try {
    const validatedInput = CreateTreatmentSchema.parse(input);
    const { data } = await api.post("/treatments", validatedInput);
    return TreatmentSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues[0]?.message}`);
    }
    console.error("Failed to create treatment:", error);
    throw new Error("Unable to create treatment. Please try again.");
  }
}

export async function updateTreatment(
  id: string,
  updates: Partial<CreateTreatmentInput>
): Promise<Treatment> {
  try {
    const { data } = await api.patch(`/treatments/${id}`, updates);
    return TreatmentSchema.parse(data);
  } catch (error) {
    console.error("Failed to update treatment:", error);
    throw new Error("Unable to update treatment. Please try again.");
  }
}

export async function deleteTreatment(id: string): Promise<void> {
  try {
    await api.delete(`/treatments/${id}`);
  } catch (error) {
    console.error("Failed to delete treatment:", error);
    throw new Error("Unable to delete treatment. Please try again.");
  }
}
