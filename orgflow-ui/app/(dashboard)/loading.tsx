import LoadingState from "@/components/ui/LoadingState";

export default function DashboardLoading() {
  return (
    <div className="of-dashboard-page of-container">
      <LoadingState variant="skeleton" skeletonCount={4} />
    </div>
  );
}
