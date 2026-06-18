import { Helmet } from 'react-helmet-async';

const SITE_NAME = "DB's AI";
export const SITE_URL = 'https://dbworkouts.co.uk';
const DEFAULT_DESC = 'AI-powered nutrition and workout plans for personal trainers. Generate personalised client plans in seconds using Claude AI, real USDA food data, and verified exercise databases.';
const DEFAULT_IMAGE = '/og-image.png';

export default function SEO({
  title,
  description = DEFAULT_DESC,
  image = DEFAULT_IMAGE,
  canonical,
  noIndex = false,
}) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — AI Plans for Personal Trainers`;
  const canonicalUrl = canonical || `${SITE_URL}/ai-plans`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:url" content={canonicalUrl} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured data */}
      <script type="application/ld+json">{JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: SITE_NAME,
        url: `${SITE_URL}/ai-plans`,
        applicationCategory: 'HealthApplication',
        description: DEFAULT_DESC,
        offers: [
          { '@type': 'Offer', price: '7.99', priceCurrency: 'GBP', name: 'Personal Plan', billingIncrement: 'Month' },
          { '@type': 'Offer', price: '24.99', priceCurrency: 'GBP', name: 'PT Pro', billingIncrement: 'Month' },
        ],
      })}</script>
    </Helmet>
  );
}
