import { Link } from 'react-router-dom';
import type { Business } from '../types';
import StatusBadge from './StatusBadge';
import MetricDisplay from './MetricDisplay';
import { actionLine, daysAgo, seenText } from '../lib/helpers';

export default function BusinessCard({ business }: { business: Business }) {
  const last = daysAgo(business.sentDate);
  return (
    <Link
      to={`/business/${business.slug}`}
      className="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition hover:shadow-md"
    >
      <h3 className="text-lg font-bold text-gray-900">{business.name}</h3>
      <div className="mt-2"><StatusBadge status={business.status} /></div>
      <p className="mt-3 text-base font-medium text-gray-800">{actionLine(business)}</p>
      <MetricDisplay
        rating={business.rating}
        reviewCount={business.reviewCount}
        score={business.score}
        rank={business.rank}
      />
      <p className="mt-1 text-sm text-gray-500">
        {last === null ? 'Not contacted yet' : `Last contacted ${last} day${last === 1 ? '' : 's'} ago.`}
      </p>
      <p className="mt-1 text-sm text-gray-500">{seenText(business.open)}</p>
    </Link>
  );
}
