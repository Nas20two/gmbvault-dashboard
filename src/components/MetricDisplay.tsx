interface Props {
  rating: number;
  reviewCount: number;
  score: number;
  rank: number;
}
export default function MetricDisplay({ rating, reviewCount, score, rank }: Props) {
  return (
    <p className="text-sm text-gray-600">
      ★ {rating.toFixed(1)} · {reviewCount} reviews · Score {score} · Rank {rank}
    </p>
  );
}
