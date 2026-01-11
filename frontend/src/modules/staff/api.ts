import { createResourceClient } from "../../services/resourceFactory";
import {
  StaffMemberSchema,
  CreateStaffMemberSchema,
  StaffLeaveSchema,
  type StaffMember,
  type CreateStaffMemberInput,
  type StaffLeave,
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

export const staffLeaveApi = createResourceClient<StaffLeave, StaffLeave>({
  basePath: "/staff/leaves",
  schema: StaffLeaveSchema,
  createSchema: StaffLeaveSchema,
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
export type { StaffMember, CreateStaffMemberInput, StaffLeave };
