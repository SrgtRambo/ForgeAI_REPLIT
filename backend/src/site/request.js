const COLOR_RE = /^#[0-9a-f]{6}$/i;

export class SiteRequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function textField(value, name, maxLength, { required = false, minLength = 0 } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new SiteRequestError(`${name} is required.`);
    return '';
  }
  if (typeof value !== 'string') throw new SiteRequestError(`${name} must be text.`);
  const text = value.trim();
  if (text.length > maxLength) throw new SiteRequestError(`${name} must be at most ${maxLength} characters.`);
  if (text.length < minLength) throw new SiteRequestError(`${name} must be at least ${minLength} characters.`);
  return text;
}

export function validateSiteRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new SiteRequestError('Request body must be an object.');
  }

  const businessName = textField(body.businessName, 'Business name', 100, { required: true, minLength: 2 });
  const description = textField(body.description, 'Description', 3000, { required: true, minLength: 30 });
  const industry = textField(body.industry, 'Industry', 80);
  const location = textField(body.location, 'Location', 100);
  let brandColors = [];

  if (body.brandColors !== undefined) {
    if (!Array.isArray(body.brandColors) || body.brandColors.length > 6 ||
      body.brandColors.some((color) => typeof color !== 'string' || !COLOR_RE.test(color))) {
      throw new SiteRequestError('Brand colors must be up to six hex colors.');
    }
    brandColors = [...new Set(body.brandColors.map((color) => color.toLowerCase()))];
  }

  return { businessName, industry, location, description, brandColors };
}
