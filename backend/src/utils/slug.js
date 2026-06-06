function makeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function makeUniqueSlug(model, value, options = {}) {
  const {
    field = 'slug',
    fallback = 'item',
    excludeId = null,
    where = {},
  } = options;

  const { Op } = require('sequelize');
  const baseSlug = makeSlug(value) || fallback;
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const queryWhere = { ...where, [field]: slug };
    if (excludeId) queryWhere.id = { [Op.ne]: excludeId };

    const existing = await model.findOne({ where: queryWhere });
    if (!existing) return slug;

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function makeChapterSlug(chapterNumber, title = '') {
  const numberPart = String(chapterNumber || '')
    .trim()
    .replace(',', '.')
    .replace(/[^0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const titlePart = makeSlug(title);
  return titlePart ? `chapter-${numberPart}-${titlePart}` : `chapter-${numberPart}`;
}

function parseChapterNumberFromSlug(value) {
  const text = String(value || '').trim().toLowerCase();
  const match = text.match(/^chapter-([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : null;
}

module.exports = {
  makeSlug,
  makeUniqueSlug,
  makeChapterSlug,
  parseChapterNumberFromSlug,
};
