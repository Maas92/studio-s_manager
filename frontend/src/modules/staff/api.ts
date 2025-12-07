import { createResourceClient } from "../../services/resourceFactory";
import {
  StaffMemberSchema,
  CreateStaffMemberSchema,
  type StaffMember,
  type CreateStaffMemberInput,
} from "./StaffSchema";

// Create typed API client
export const staffApi = createResourceClient<
  StaffMember,
  CreateStaffMemberInput
>({
  basePath: "/staff",
  schema: StaffMemberSchema,
  createSchema: CreateStaffMemberSchema,
});

// Export individual functions for convenience
export const {
  list: listStaffMembers,
  get: getStaffMember,
  create: createStaffMember,
  update: updateStaffMember,
  delete: deleteStaffMember,
} = staffApi;

// Export types
export type { StaffMember, CreateStaffMemberInput };
