import { createResourceClient } from "../services/resourceFactory";
import {
  StaffMemberSchema,
  CreateStaffMemberSchema,
  type StaffMember,
  type CreateStaffMemberInput,
} from "../modules/staff/StaffSchema";

export const staffClient = createResourceClient<
  StaffMember,
  CreateStaffMemberInput
>({
  basePath: "/staff",
  schema: StaffMemberSchema,
  createSchema: CreateStaffMemberSchema,
});
