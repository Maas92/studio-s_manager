import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import toast from "react-hot-toast";
import {
  listTreatments,
  updateTreatment,
  deleteTreatment,
  createTreatment,
  type Treatment,
  type CreateTreatmentInput,
} from "./api";
import { listClients, listStaff } from "../appointments/api";
import Input from "../../ui/components/Input";
import Spinner from "../../ui/components/Spinner";
import TreatmentDetailModal from "./TreatmentDetailModal";
import AppointmentModal, {
  type AppointmentFormValues,
} from "../appointments/AppointmentsModal";
import { Search, Clock, DollarSign, TrendingUp, Sparkles } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import CreateTreatmentModal from "./CreateTreatmentModal";
import { Plus } from "lucide-react"; // if not already imported
import Button from "../../ui/components/Button";

interface TreatmentsProps {
  isAdmin?: boolean;
}

const PageWrapper = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const StickyHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.color.bg || "#ffffff"};
  padding-bottom: 1.5rem;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
`;

const PageTitle = styled.h2`
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
`;

const SearchBar = styled.div`
  position: relative;
  width: 100%;
  max-width: 500px;
  margin-bottom: 1rem;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.color.mutedText};
  pointer-events: none;
`;

const SearchInput = styled(Input)`
  padding-left: 3.75rem;
`;

const FilterButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const FilterButton = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.color.brand600 : theme.color.border};
  background: ${({ theme, $active }) =>
    $active ? theme.color.brand50 : theme.color.panel};
  color: ${({ theme, $active }) =>
    $active ? theme.color.brand700 : theme.color.text};
  font-weight: ${({ $active }) => ($active ? "600" : "500")};
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.875rem;
  text-transform: capitalize;

  &:hover {
    border-color: ${({ theme }) => theme.color.brand600};
    background: ${({ theme }) => theme.color.brand50};
  }
`;

const TreatmentsList = styled.div`
  display: grid;
  gap: 1rem;
`;

const TreatmentCard = styled.div`
  padding: 1.5rem;
  background: ${({ theme }) => theme.color.panel};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadowMd};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadowLg};
    border-color: ${({ theme }) => theme.color.brand300};
  }
`;

const TreatmentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const TreatmentInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TreatmentName = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
`;

const TreatmentDescription = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.color.mutedText};
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const TreatmentMeta = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.color.text};
  font-weight: 500;
`;

const Badge = styled.span<{ $variant?: "category" | "popular" }>`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $variant, theme }) =>
    $variant === "popular"
      ? theme.color.yellow100 || "#fef3c7"
      : theme.color.brand100 || "#dbeafe"};
  color: ${({ $variant, theme }) =>
    $variant === "popular"
      ? theme.color.yellow700 || "#a16207"
      : theme.color.brand700 || "#1d4ed8"};
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.color.red600 || "#fef2f2"};
  color: ${({ theme }) => theme.color.red500 || "#b91c1c"};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.red600 || "#fecaca"};
`;

const INITIAL_APPOINTMENT_FORM: AppointmentFormValues = {
  client: "",
  treatment: "",
  staff: "",
  datetimeLocal: "",
};

export default function Treatments({ isAdmin = false }: TreatmentsProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState<AppointmentFormValues>(
    INITIAL_APPOINTMENT_FORM
  );

  // Queries
  const {
    data: treatments = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["treatments"],
    queryFn: listTreatments,
    staleTime: 30000,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: listClients,
    staleTime: 60000,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: listStaff,
    staleTime: 60000,
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CreateTreatmentInput>;
    }) => updateTreatment(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatments"] });
      setShowDetailModal(false);
      setSelectedTreatment(null);
      toast.success("Treatment updated successfully", {
        duration: 4000,
        position: "top-right",
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update treatment",
        { duration: 5000, position: "top-right" }
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTreatment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatments"] });
      setShowDetailModal(false);
      setSelectedTreatment(null);
      toast.success("Treatment deleted successfully", {
        duration: 4000,
        position: "top-right",
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete treatment",
        { duration: 5000, position: "top-right" }
      );
    },
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (values: CreateTreatmentInput) => createTreatment(values),
    onSuccess: (newTreatment) => {
      queryClient.invalidateQueries({ queryKey: ["treatments"] });
      setShowCreateModal(false);
      toast.success("Treatment created", {
        duration: 3000,
        position: "top-right",
      });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to create treatment",
        { duration: 5000, position: "top-right" }
      );
    },
  });

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(treatments.map((t) => t.category).filter(Boolean));
    return ["all", ...Array.from(cats)];
  }, [treatments]);

  // Filter treatments
  const filteredTreatments = useMemo(() => {
    let filtered = treatments.filter((t) => t.isActive);

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((t) => t.category === categoryFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.category?.toLowerCase().includes(query) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }
    console.log(treatments);
    return filtered.sort(
      (a, b) => (b.popularityScore || 0) - (a.popularityScore || 0)
    );
  }, [treatments, categoryFilter, searchQuery]);

  // Handlers
  const handleTreatmentClick = useCallback((treatment: Treatment) => {
    setSelectedTreatment(treatment);
    setShowDetailModal(true);
  }, []);

  const handleUpdateTreatment = useCallback(
    (id: string, updates: Partial<CreateTreatmentInput>) => {
      updateMutation.mutate({ id, updates });
    },
    [updateMutation]
  );

  const handleDeleteTreatment = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const handleBookTreatment = useCallback(
    (treatmentId: string, treatmentName: string) => {
      setAppointmentForm({
        ...INITIAL_APPOINTMENT_FORM,
        treatment: treatmentId,
      });
      setShowAppointmentModal(true);
    },
    []
  );

  if (isLoading) {
    return (
      <PageWrapper>
        <HeaderRow>
          <PageTitle>Treatments</PageTitle>
        </HeaderRow>
        <Spinner />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper>
        <HeaderRow>
          <PageTitle>Treatments</PageTitle>
        </HeaderRow>
        <ErrorMessage>
          {error instanceof Error ? error.message : "Error loading treatments"}
        </ErrorMessage>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <StickyHeader>
        <HeaderRow>
          <PageTitle>Treatments</PageTitle>
          <Button
            onClick={() => setShowCreateModal(true)}
            variation="primary"
            size="medium"
          >
            <Plus size={18} />
            New Treatment
          </Button>
        </HeaderRow>

        <SearchBar>
          <SearchIcon>
            <Search size={20} />
          </SearchIcon>
          <SearchInput
            type="text"
            placeholder="Search treatments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchBar>

        <FilterButtons>
          {categories.map((cat) => (
            <FilterButton
              key={cat}
              $active={categoryFilter === cat}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </FilterButton>
          ))}
        </FilterButtons>
      </StickyHeader>

      {filteredTreatments.length === 0 ? (
        <EmptyState>
          <Sparkles size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
          <p>
            {searchQuery || categoryFilter !== "all"
              ? "No treatments found matching your filters."
              : "No treatments available."}
          </p>
        </EmptyState>
      ) : (
        <TreatmentsList>
          {filteredTreatments.map((treatment) => (
            <TreatmentCard
              key={treatment.id}
              onClick={() => handleTreatmentClick(treatment)}
            >
              <TreatmentHeader>
                <TreatmentInfo>
                  <TreatmentName>{treatment.name}</TreatmentName>
                  {treatment.description && (
                    <TreatmentDescription>
                      {treatment.description}
                    </TreatmentDescription>
                  )}
                </TreatmentInfo>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    alignItems: "flex-end",
                  }}
                >
                  {treatment.category && <Badge>{treatment.category}</Badge>}
                  {treatment.popularityScore &&
                    treatment.popularityScore > 80 && (
                      <Badge $variant="popular">
                        <TrendingUp size={12} />
                        Popular
                      </Badge>
                    )}
                </div>
              </TreatmentHeader>

              <TreatmentMeta>
                <MetaItem>
                  <Clock size={16} />
                  {treatment.durationMinutes} min
                </MetaItem>
                <MetaItem>
                  <DollarSign size={16} />${treatment.price.toFixed(2)}
                </MetaItem>
              </TreatmentMeta>
            </TreatmentCard>
          ))}
        </TreatmentsList>
      )}

      <TreatmentDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTreatment(null);
        }}
        treatment={selectedTreatment}
        onUpdate={handleUpdateTreatment}
        onDelete={handleDeleteTreatment}
        onBook={handleBookTreatment}
        updating={updateMutation.isPending}
        deleting={deleteMutation.isPending}
        isAdmin={isAdmin}
      />

      <CreateTreatmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(values: CreateTreatmentInput) =>
          createMutation.mutate(values)
        }
        creating={createMutation.isPending}
      />

      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => {
          setShowAppointmentModal(false);
          setAppointmentForm(INITIAL_APPOINTMENT_FORM);
        }}
        values={appointmentForm}
        onChange={(patch) =>
          setAppointmentForm((prev) => ({ ...prev, ...patch }))
        }
        onSubmit={() => {
          console.log("Create appointment:", appointmentForm);
          setShowAppointmentModal(false);
          setAppointmentForm(INITIAL_APPOINTMENT_FORM);
          toast.success("Appointment booked successfully!");
        }}
        submitting={false}
        clients={clients}
        treatments={treatments}
        staff={staff}
      />
    </PageWrapper>
  );
}
