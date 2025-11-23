import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import toast from "react-hot-toast";
import {
  listStockItems,
  transferStock,
  type StockItem,
  type StockLocation,
  type TransferStockInput,
} from "./api";
import Button from "../../ui/components/Button";
import Input from "../../ui/components/Input";
import Spinner from "../../ui/components/Spinner";
import StockDetailModal from "./StockDetailModal";
import TransferStockModal from "./TransferStockModal";
import {
  Search,
  ArrowRightLeft,
  Package,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";

const PageWrapper = styled.div`
  padding: 2rem;
  max-width: 1600px;
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

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
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

const TableWrapper = styled.div`
  overflow-x: auto;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.panel};
  box-shadow: ${({ theme }) => theme.shadowMd};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  background: ${({ theme }) => theme.color.grey50 || "#f9fafb"};
  border-bottom: 2px solid ${({ theme }) => theme.color.border};
`;

const Th = styled.th`
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.text};
  white-space: nowrap;
`;

const Tbody = styled.tbody``;

const Tr = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.color.grey50 || "#f9fafb"};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const Td = styled.td`
  padding: 1rem;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.color.text};
`;

const ItemName = styled.div`
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const ItemSKU = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.color.mutedText};
`;

const Badge = styled.span<{ $variant: "retail" | "treatment" | "storage" }>`
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  background: ${({ $variant }) => {
    switch ($variant) {
      case "retail":
        return "#dbeafe";
      case "treatment":
        return "#dcfce7";
      case "storage":
        return "#fef3c7";
    }
  }};
  color: ${({ $variant }) => {
    switch ($variant) {
      case "retail":
        return "#1d4ed8";
      case "treatment":
        return "#15803d";
      case "storage":
        return "#a16207";
    }
  }};
`;

const StockQuantity = styled.div<{ $level: "low" | "medium" | "high" }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: ${({ $level, theme }) => {
    switch ($level) {
      case "low":
        return theme.color.red600 || "#dc2626";
      case "medium":
        return theme.color.yellow700 || "#ca8a04";
      case "high":
        return theme.color.green500 || "#16a34a";
    }
  }};
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

function getStockLevel(
  quantity: number,
  minQuantity?: number
): "low" | "medium" | "high" {
  if (!minQuantity) return "high";
  if (quantity <= minQuantity) return "low";
  if (quantity <= minQuantity * 2) return "medium";
  return "high";
}

export default function Stock() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<StockLocation | "all">(
    "all"
  );
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferPreselectedItem, setTransferPreselectedItem] =
    useState<StockItem | null>(null);

  // Query
  const {
    data: stockItems = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["stock"],
    queryFn: listStockItems,
    staleTime: 30000,
  });

  // Transfer Mutation
  const transferMutation = useMutation({
    mutationFn: transferStock,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      setShowTransferModal(false);
      setTransferPreselectedItem(null);
      toast.success(result.message || "Stock transferred successfully", {
        duration: 4000,
        position: "top-right",
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to transfer stock",
        { duration: 5000, position: "top-right" }
      );
    },
  });

  // Filter stock items
  const filteredItems = useMemo(() => {
    let filtered = stockItems;

    // Location filter
    if (locationFilter !== "all") {
      filtered = filtered.filter((item) => item.location === locationFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.sku?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [stockItems, locationFilter, searchQuery]);

  // Count items by location
  const locationCounts = useMemo(() => {
    return {
      all: stockItems.length,
      retail: stockItems.filter((i) => i.location === "retail").length,
      treatment: stockItems.filter((i) => i.location === "treatment").length,
      storage: stockItems.filter((i) => i.location === "storage").length,
    };
  }, [stockItems]);

  // Handlers
  const handleItemClick = useCallback((item: StockItem) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  }, []);

  const handleTransferFromDetail = useCallback((item: StockItem) => {
    setTransferPreselectedItem(item);
    setShowTransferModal(true);
  }, []);

  const handleTransfer = useCallback(
    (transfer: TransferStockInput) => {
      transferMutation.mutate(transfer);
    },
    [transferMutation]
  );

  if (isLoading) {
    return (
      <PageWrapper>
        <HeaderRow>
          <PageTitle>Stock Management</PageTitle>
        </HeaderRow>
        <Spinner />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper>
        <HeaderRow>
          <PageTitle>Stock Management</PageTitle>
        </HeaderRow>
        <ErrorMessage>
          {error instanceof Error ? error.message : "Error loading stock items"}
        </ErrorMessage>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <StickyHeader>
        <HeaderRow>
          <PageTitle>Stock Management</PageTitle>
          <Button
            onClick={() => {
              setTransferPreselectedItem(null);
              setShowTransferModal(true);
            }}
            variation="primary"
            size="medium"
          >
            <ArrowRightLeft size={18} />
            Transfer Stock
          </Button>
        </HeaderRow>

        <SearchBar>
          <SearchIcon>
            <Search size={20} />
          </SearchIcon>
          <SearchInput
            type="text"
            placeholder="Search by name, SKU, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchBar>

        <FilterButtons>
          <FilterButton
            $active={locationFilter === "all"}
            onClick={() => setLocationFilter("all")}
          >
            All Locations ({locationCounts.all})
          </FilterButton>
          <FilterButton
            $active={locationFilter === "retail"}
            onClick={() => setLocationFilter("retail")}
          >
            Retail ({locationCounts.retail})
          </FilterButton>
          <FilterButton
            $active={locationFilter === "treatment"}
            onClick={() => setLocationFilter("treatment")}
          >
            Treatment ({locationCounts.treatment})
          </FilterButton>
          <FilterButton
            $active={locationFilter === "storage"}
            onClick={() => setLocationFilter("storage")}
          >
            Storage ({locationCounts.storage})
          </FilterButton>
        </FilterButtons>
      </StickyHeader>

      {filteredItems.length === 0 ? (
        <EmptyState>
          <Package size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
          <p>
            {searchQuery || locationFilter !== "all"
              ? "No stock items found matching your filters."
              : "No stock items yet."}
          </p>
        </EmptyState>
      ) : (
        <TableWrapper>
          <Table>
            <Thead>
              <Tr as="tr">
                <Th>Item</Th>
                <Th>Category</Th>
                <Th>Location</Th>
                <Th>Quantity</Th>
                <Th>Min. Qty</Th>
                <Th>Value</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredItems.map((item) => {
                const stockLevel = getStockLevel(
                  item.quantity,
                  item.minQuantity
                );

                return (
                  <Tr key={item.id} onClick={() => handleItemClick(item)}>
                    <Td>
                      <ItemName>{item.name}</ItemName>
                      {item.sku && <ItemSKU>SKU: {item.sku}</ItemSKU>}
                    </Td>
                    <Td>{item.category || "—"}</Td>
                    <Td>
                      <Badge $variant={item.location}>{item.location}</Badge>
                    </Td>
                    <Td>
                      <StockQuantity $level={stockLevel}>
                        {stockLevel === "low" && <AlertTriangle size={16} />}
                        {stockLevel === "medium" && <TrendingDown size={16} />}
                        {item.quantity} {item.unit || "units"}
                      </StockQuantity>
                    </Td>
                    <Td>{item.minQuantity || "—"}</Td>
                    <Td>
                      {item.cost
                        ? `$${(item.cost * item.quantity).toFixed(2)}`
                        : "—"}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </TableWrapper>
      )}

      <StockDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onTransfer={handleTransferFromDetail}
      />

      <TransferStockModal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setTransferPreselectedItem(null);
        }}
        onTransfer={handleTransfer}
        transferring={transferMutation.isPending}
        preselectedItem={transferPreselectedItem}
        stockItems={stockItems}
      />
    </PageWrapper>
  );
}
