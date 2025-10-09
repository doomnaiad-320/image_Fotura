const BASE_TIME = new Date("2024-01-01T00:00:00Z").getTime() / 1000;

export function calculateHotScore({
  likes,
  views,
  createdAt
}: {
  likes: number;
  views: number;
  createdAt: Date;
}): number {
  const order = Math.log10(Math.max(likes * 2 + views * 0.2, 1));
  const seconds = createdAt.getTime() / 1000 - BASE_TIME;
  return Number((order + seconds / 45000).toFixed(6));
}
