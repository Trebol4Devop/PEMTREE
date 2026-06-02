import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://pemtree.netlify.app';

const pensumNames = {
  'ciencias_y_sistemas_22': 'Ingeniería en Ciencias y Sistemas (2022)',
  'ciencias_y_sistemas_25': 'Ingeniería en Ciencias y Sistemas (2025)',
  'industrial_22': 'Ingeniería Industrial (2022)',
  'mecanica_22': 'Ingeniería Mecánica (2022)',
  'civil_22': 'Ingeniería Civil (2022)',
  'electrica_22': 'Ingeniería Eléctrica (2022)',
  'electronica_22': 'Ingeniería Electrónica (2022)',
  'mecanica_electrica_22': 'Ingeniería Mecánica Eléctrica (2022)',
  'mecanica_industrial_22': 'Ingeniería Mecánica Industrial (2022)',
  'quimica_22': 'Ingeniería Química (2022)',
  'ambiental_25': 'Ingeniería Ambiental (2025)',
};

export default function Seo({ 
  title = 'PEMTREE | Grafo de Estudios USAC',
  description = 'PEMTREE es una aplicación web interactiva que permite explorar y visualizar rutas académicas del PENSUM CLAR 2022 USAC para todas las carreras de ingeniería.',
  pensum = null,
  pathname = ''
}) {
  const canonicalUrl = `${BASE_URL}${pathname}`;
  const fullTitle = title.includes('PEMTREE') ? title : `${title} | PEMTREE`;

  const ogImage = `${BASE_URL}/images/logo_trebol.png`;
  const ogUrl = pensum ? `${BASE_URL}/visualizador?pensum=${pensum}` : canonicalUrl;

  const pensumTitle = pensum && pensumNames[pensum] 
    ? `${pensumNames[pensum]} - PEMTREE`
    : fullTitle;

  const pensumDescription = pensum && pensumNames[pensum]
    ? `Explora el pensum ${pensumNames[pensum]} de la FIUSAC. Visualiza prerrequisitos, créditos y rutas académicas interactivas.`
    : description;

  const jsonLdBase = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'PEMTREE',
    description: pensumDescription,
    url: BASE_URL,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    browserRequirements: 'Requires JavaScript',
    runtimeVersions: ['HTML5', 'ES2020'],
    permissions: 'browser session storage',
    author: {
      '@type': 'Organization',
      name: 'Trebol4Devop',
      url: 'https://github.com/trebol4devop'
    },
    educationalLevel: 'University',
    educationalUse: 'Course Planning',
    about: {
      '@type': 'Thing',
      description: 'Universidad de San Carlos de Guatemala (USAC) Pensum CLAR 2022'
    }
  };

  const breadcrumbJsonLd = pensum ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: BASE_URL
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: pensumNames[pensum] || 'Visualizador',
        item: `${BASE_URL}/visualizador?pensum=${pensum}`
      }
    ]
  } : null;

  return (
    <Helmet>
      <title>{pensumTitle}</title>
      <meta name="description" content={pensumDescription} />
      <meta name="language" content="Spanish" />
      <meta name="geo.region" content="GT" />
      <meta name="geo.placename" content="Guatemala" />
      <link rel="canonical" href={ogUrl} />
      
      <meta property="og:title" content={pensumTitle} />
      <meta property="og:description" content={pensumDescription} />
      <meta property="og:url" content={ogUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="512" />
      <meta property="og:image:height" content="512" />
      <meta property="og:locale" content="es_GT" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="PEMTREE" />

      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={pensumTitle} />
      <meta name="twitter:description" content={pensumDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@trebol4devop" />

      <script type="application/ld+json">{JSON.stringify(jsonLdBase)}</script>
      {breadcrumbJsonLd && <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>}
    </Helmet>
  );
}