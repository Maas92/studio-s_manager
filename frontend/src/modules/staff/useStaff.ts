import { useResource } from "../../hooks/useResource";
import { staffClient } from "../../services/staffClient";
import type { StaffMember, CreateStaffMemberInput } from "./StaffSchema";

export function useStaff() {
  return useResource<StaffMember, CreateStaffMemberInput>({
    resourceKey: "staff",
    client: staffClient,
    toastMessages: {
      create: "Staff member added",
      update: "Staff updated",
      delete: "Staff removed",
    },
  });
}
