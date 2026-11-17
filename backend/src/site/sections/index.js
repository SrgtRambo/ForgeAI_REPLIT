// Section library index — re-exports every section module with unique names.
export { type as navType, variants as navVariants } from './nav.js';
export { type as heroType, variants as heroVariants } from './hero.js';
export { type as servicesType, variants as servicesVariants } from './services.js';
export { type as featureType, variants as featureVariants } from './feature.js';
export { type as testimonialsType, variants as testimonialsVariants } from './testimonials.js';
export { type as statsType, variants as statsVariants } from './stats.js';
export { type as processType, variants as processVariants } from './process.js';
export { type as teamType, variants as teamVariants } from './team.js';
export { type as galleryType, variants as galleryVariants } from './gallery.js';
export { type as menuType, variants as menuVariants } from './menu.js';
export { type as pricingType, variants as pricingVariants } from './pricing.js';
export { type as faqType, variants as faqVariants } from './faq.js';
export { type as contactType, variants as contactVariants } from './contact.js';
export { type as bookingType, variants as bookingVariants } from './booking.js';
export { type as ctaType, variants as ctaVariants } from './cta.js';
export { type as footerType, variants as footerVariants } from './footer.js';

import * as nav from './nav.js';
import * as hero from './hero.js';
import * as services from './services.js';
import * as feature from './feature.js';
import * as testimonials from './testimonials.js';
import * as stats from './stats.js';
import * as process from './process.js';
import * as team from './team.js';
import * as gallery from './gallery.js';
import * as menu from './menu.js';
import * as pricing from './pricing.js';
import * as faq from './faq.js';
import * as contact from './contact.js';
import * as booking from './booking.js';
import * as cta from './cta.js';
import * as footer from './footer.js';

export const SECTION_MODULES = [
  { type: 'nav', variants: nav.variants },
  { type: 'hero', variants: hero.variants },
  { type: 'services', variants: services.variants },
  { type: 'feature', variants: feature.variants },
  { type: 'testimonials', variants: testimonials.variants },
  { type: 'stats', variants: stats.variants },
  { type: 'process', variants: process.variants },
  { type: 'team', variants: team.variants },
  { type: 'gallery', variants: gallery.variants },
  { type: 'menu', variants: menu.variants },
  { type: 'pricing', variants: pricing.variants },
  { type: 'faq', variants: faq.variants },
  { type: 'contact', variants: contact.variants },
  { type: 'booking', variants: booking.variants },
  { type: 'cta', variants: cta.variants },
  { type: 'footer', variants: footer.variants },
];
