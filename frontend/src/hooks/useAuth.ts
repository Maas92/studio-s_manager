import { useAuth as useAuthContext } from "../modules/auth/AuthContext";

export const useAuth = () => {
  const auth = useAuthContext();

  // Role checking helpers
  const isOwner = auth.user?.data?.role === "owner";
  const isAdmin = auth.user?.data?.role === "admin" || isOwner;
  const isManager = auth.user?.data?.role === "manager" || isAdmin;
  const isTherapist = auth.user?.data?.role === "therapist";
  const isReceptionist = auth.user?.data?.role === "receptionist";
  const isStaff = isTherapist || isReceptionist || isManager || isAdmin;

  // Permission helpers
  const canManageTreatments = isAdmin || isManager;
  const canManageAppointments = isStaff;
  const canManageClients = isStaff;
  const canManageStock = isAdmin || isManager;
  const canViewReports = isAdmin || isManager;
  const canManageStaff = isOwner || isAdmin;

  return {
    ...auth,
    // Role flags
    isOwner,
    isAdmin,
    isManager,
    isTherapist,
    isReceptionist,
    isStaff,
    // Permission flags
    canManageTreatments,
    canManageAppointments,
    canManageClients,
    canManageStock,
    canViewReports,
    canManageStaff,
  };
};

export default useAuth;
