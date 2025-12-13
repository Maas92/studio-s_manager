// import React from "react";
// import styled from "styled-components";
// import { FileText } from "lucide-react";
// import toast from "react-hot-toast";

// import PageHeader from "../../ui/components/PageHeader";
// import Button from "../../ui/components/Button";
// import Spinner from "../../ui/components/Spinner";
// import SearchBar from "../../ui/components/SearchBar";
// import EmptyState from "../../ui/components/EmptyState";
// import Table from "../../ui/components/Table";
// import Modal from "../../ui/components/Modal";

// import { useTransactions } from "./useTransactions";
// import { useListFilter } from "../../hooks/useListFilter";
// import { useModalState } from "../../hooks/useModalState";

// import type { Transaction } from "./schemas";

// const PageWrapper = styled.div`
//   padding: 2rem;
//   max-width: 1200px;
//   margin: 0 auto;
// `;

// export default function TransactionsPage() {
//   const { listQuery } = useTransactions();
//   const transactions = listQuery.data ?? [];
//   const isLoading = listQuery.isLoading;
//   const isError = listQuery.isError;
//   const error = listQuery.error;

//   const { filteredItems, searchQuery, setSearchQuery } =
//     useListFilter<Transaction>(transactions, {
//       searchFields: ["reference", "clientName", "paymentMethod"],
//     });

//   const detailModal = useModalState<Transaction>();

//   if (isLoading) {
//     return (
//       <PageWrapper>
//         <PageHeader title="Transactions" />
//         <Spinner />
//       </PageWrapper>
//     );
//   }

//   if (isError) {
//     return (
//       <PageWrapper>
//         <PageHeader title="Transactions" />
//         <div style={{ padding: 12 }}>
//           {(error instanceof Error && error.message) ||
//             "Failed to load transactions"}
//         </div>
//       </PageWrapper>
//     );
//   }

//   return (
//     <PageWrapper>
//       <div style={{ position: "sticky", top: 0, zIndex: 5, paddingBottom: 12 }}>
//         <PageHeader title="Transactions" />
//         <SearchBar
//           value={searchQuery}
//           onChange={setSearchQuery}
//           placeholder="Search by reference, client, or method..."
//         />
//       </div>

//       {filteredItems.length === 0 ? (
//         <EmptyState
//           icon={FileText}
//           title={searchQuery ? "No transactions found" : "No transactions yet"}
//         >
//           {!searchQuery && (
//             <p>Make a sale or record a transaction to populate this list.</p>
//           )}
//         </EmptyState>
//       ) : (
//         <div style={{ overflowX: "auto", marginTop: 12 }}>
//           <Table>
//             <thead>
//               <tr>
//                 <th>Date</th>
//                 <th>Reference</th>
//                 <th>Client</th>
//                 <th>Amount</th>
//                 <th>Method</th>
//                 <th></th>
//               </tr>
//             </thead>
//             <tbody>
//               {filteredItems.map((t) => (
//                 <tr key={t.id}>
//                   <td>
//                     {new Date(
//                       t.createdAt ?? t.datetimeISO ?? Date.now()
//                     ).toLocaleString()}
//                   </td>
//                   <td>{t.reference ?? "—"}</td>
//                   <td>{t.clientName ?? "—"}</td>
//                   <td>${Number(t.amount ?? 0).toFixed(2)}</td>
//                   <td>{t.paymentMethod ?? "—"}</td>
//                   <td>
//                     <div style={{ display: "flex", gap: 8 }}>
//                       <Button
//                         size="small"
//                         variation="secondary"
//                         onClick={() => detailModal.open(t)}
//                       >
//                         View
//                       </Button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </Table>
//         </div>
//       )}

//       <Modal
//         isOpen={detailModal.isOpen}
//         onClose={detailModal.close}
//         title="Transaction details"
//         size="md"
//       >
//         {detailModal.selectedItem ? (
//           <div>
//             <div style={{ marginBottom: 8 }}>
//               <strong>Reference:</strong> {detailModal.selectedItem.reference}
//             </div>
//             <div style={{ marginBottom: 8 }}>
//               <strong>Client:</strong>{" "}
//               {detailModal.selectedItem.clientName ?? "—"}
//             </div>
//             <div style={{ marginBottom: 8 }}>
//               <strong>Amount:</strong> $
//               {Number(detailModal.selectedItem.amount ?? 0).toFixed(2)}
//             </div>
//             <div style={{ marginBottom: 8 }}>
//               <strong>Method:</strong>{" "}
//               {detailModal.selectedItem.paymentMethod ?? "—"}
//             </div>

//             <div style={{ marginTop: 12 }}>
//               <Button
//                 onClick={() => {
//                   navigator.clipboard?.writeText(
//                     JSON.stringify(detailModal.selectedItem)
//                   );
//                   toast.success("Copied");
//                 }}
//               >
//                 Copy JSON
//               </Button>
//             </div>
//           </div>
//         ) : (
//           <div>Loading…</div>
//         )}
//       </Modal>
//     </PageWrapper>
//   );
// }
