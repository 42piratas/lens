import { CardOverlay } from "@/components/grid/CardOverlay";

export default async function CardModal({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  const { cardId } = await params;
  return <CardOverlay cardId={cardId} />;
}
