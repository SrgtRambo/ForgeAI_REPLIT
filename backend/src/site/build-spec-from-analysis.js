// Builds a valid site spec from a business analysis object.
// Used by tests and by the mock model in the analyzer pipeline.

export function buildSpecFromAnalysis(analysis) {
  const businessType = analysis.businessType || 'service';
  const businessName = analysis.businessName || 'Test Business';
  const primaryAction = analysis.primaryAction || 'contact';

  const pages = [
    {
      slug: 'index',
      title: businessName,
      description: analysis.businessSummary || '',
      sections: [
        { type: 'nav', variant: 'split', content: {} },
        { type: 'hero', variant: 'split-image', content: { heading: businessName, body: analysis.businessSummary || 'Welcome.', imageId: 'hero-1', imageAlt: 'Hero image' } },
        { type: 'services', variant: 'grid-cards', content: { heading: 'Our services', body: 'We help you.' } },
        { type: 'contact', variant: 'form-split', content: { heading: 'Get in touch', body: 'Reach out today.', form: { id: 'contact-1', fields: [{ name: 'name', label: 'Your name', type: 'text', required: true }], submitLabel: 'Send', successMessage: 'Thanks!' } } },
        { type: 'footer', variant: 'minimal', content: {} },
      ],
    },
  ];

  const team = [];
  let sectionIndex = 3;
  if (analysis.needs?.team) {
    team.push({ name: 'Founder', role: 'Owner', bio: '', photoImageId: null });
    pages[0].sections.splice(sectionIndex, 0, { type: 'team', variant: 'initial-cards', content: { heading: 'Our team', body: 'Meet our team.' } });
    sectionIndex++;
  }

  if (primaryAction === 'book' || analysis.needs?.booking) {
    pages[0].sections.splice(pages[0].sections.length - 1, 0, {
      type: 'booking',
      variant: 'inline-form',
      content: {
        heading: 'Book now',
        body: 'Reserve your spot.',
        form: {
          id: 'booking-1',
          fields: [{ name: 'date', label: 'Date', type: 'date', required: true }],
          submitLabel: 'Request',
          successMessage: 'Booking received!',
        },
      },
    });
  }

  if (businessType === 'restaurant') {
    pages[0].sections.splice(sectionIndex, 0, { type: 'menu', variant: 'categories-tabs', content: { heading: 'Menu', body: 'Our dishes.' } });
  }

  if (analysis.needs?.testimonials) {
    pages[0].sections.splice(pages[0].sections.length - 1, 0, { type: 'testimonials', variant: 'cards', content: { heading: 'What people say', body: 'Happy clients.', quotes: [{ text: 'Great!', name: 'Sam', role: 'Client' }] } });
  }

  // Collect image ids referenced in the spec.
  const referencedIds = new Set(['hero-1']);
  for (const member of team) {
    if (member.photoImageId) referencedIds.add(member.photoImageId);
  }

  const spec = {
    version: 1,
    meta: {
      businessName,
      tagline: (analysis.businessSummary || '').slice(0, 120),
      industry: analysis.industry || '',
      businessType,
      locale: 'en',
      description: analysis.businessSummary || '',
    },
    brief: {
      offer: analysis.businessSummary || '',
      audience: analysis.audience || '',
      primaryAction,
      tone: Array.isArray(analysis.tone) ? analysis.tone : ['professional', 'clear'],
      avoid: [],
    },
    unknowns: Array.isArray(analysis.unknowns) ? analysis.unknowns : [],
    design: {
      palette: analysis.palette && analysis.palette.bg
        ? { bg: analysis.palette.bg, surface: analysis.palette.surface, ink: analysis.palette.ink, muted: analysis.palette.muted, brand: analysis.palette.brand, accent: analysis.palette.accent }
        : { bg: '#ffffff', surface: '#f5f5f5', ink: '#111111', muted: '#666666', brand: '#0066cc', accent: '#ff9900' },
      fonts: analysis.fonts || { display: 'modern-grotesk', body: 'Inter' },
      radius: analysis.radius || 'soft',
      density: analysis.density || 'regular',
      motion: 'subtle',
      imageStyle: analysis.imageStyle || 'natural',
    },
    nav: [{ label: 'Home', href: '/' }],
    pages,
    images: (Array.isArray(analysis.imageSlots) ? analysis.imageSlots : [])
      .filter((slot) => referencedIds.has(slot.id))
      .map((slot) => ({ ...slot, source: 'stock', purpose: slot.purpose || `Photo for ${slot.slot} slot` })),
    forms: [{ id: 'contact-1', purpose: 'General enquiry', fields: [{ name: 'name', label: 'Your name', type: 'text', required: true }], submitLabel: 'Send', successMessage: 'Thanks!' }],
    team,
    seo: { keywords: [businessName], localBusiness: false },
  };

  return spec;
}
