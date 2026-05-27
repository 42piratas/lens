import { MaximizedCardClient } from "@/components/grid/MaximizedCardClient";

export default async function CardFullPage({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  const { cardId } = await params;
  return <MaximizedCardClient cardId={cardId} />;
}
