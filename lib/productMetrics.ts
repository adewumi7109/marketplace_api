import { PrismaClient } from "@prisma/client";

type ProductWithId = { id: string };

export async function attachProductMetrics<T extends ProductWithId>(
  prisma: PrismaClient,
  products: T[]
) {
  if (products.length === 0) return products.map((product) => ({ ...product, viewCount: 0, whatsappClickCount: 0 }));

  const productIds = products.map((product) => product.id);
  const metrics = await prisma.productClick.groupBy({
    by: ["productId", "source"],
    where: {
      productId: { in: productIds },
      source: { in: ["view", "whatsapp_order_click"] },
    },
    _count: { _all: true },
  });

  const counts = new Map<string, { viewCount: number; whatsappClickCount: number }>();
  for (const item of metrics) {
    const current = counts.get(item.productId) ?? { viewCount: 0, whatsappClickCount: 0 };
    if (item.source === "view") current.viewCount = item._count._all;
    if (item.source === "whatsapp_order_click") current.whatsappClickCount = item._count._all;
    counts.set(item.productId, current);
  }

  return products.map((product) => ({
    ...product,
    viewCount: counts.get(product.id)?.viewCount ?? 0,
    whatsappClickCount: counts.get(product.id)?.whatsappClickCount ?? 0,
  }));
}
