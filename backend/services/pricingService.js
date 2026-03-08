import "dotenv/config";

const BASE_CATEGORY_GST_RATES = {
  "musical-instruments": 12,
  instruments: 12,
  "string-instruments": 12,
  "wind-instruments": 12,
  "percussion-instruments": 12,
  accessories: 12,
  "musical-accessories": 12,
  electronics: 12,
  "audio-electronics": 12,
  "dj-equipment": 12,
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const roundMoney = (value) =>
  Number((Math.round((Number(value) + Number.EPSILON) * 100) / 100).toFixed(2));

const normalizeCategoryKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseEnvRateMap = () => {
  const raw = process.env.GST_RATES_JSON;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce((acc, [key, value]) => {
      const normalizedKey = normalizeCategoryKey(key);
      if (!normalizedKey) return acc;
      const numericRate = toNumber(value, NaN);
      if (!Number.isFinite(numericRate) || numericRate < 0) return acc;
      acc[normalizedKey] = numericRate;
      return acc;
    }, {});
  } catch (_error) {
    return {};
  }
};

const getConfiguredRateMap = () => ({
  ...BASE_CATEGORY_GST_RATES,
  ...parseEnvRateMap(),
});

export const getPricingConfig = () => ({
  defaultGstRate: toNumber(process.env.DEFAULT_GST_RATE, 12),
  buyShippingCharge: Math.max(0, toNumber(process.env.BUY_SHIPPING_CHARGE, 199)),
  rentShippingCharge: Math.max(0, toNumber(process.env.RENT_SHIPPING_CHARGE, 149)),
  freeShippingThreshold: Math.max(0, toNumber(process.env.FREE_SHIPPING_THRESHOLD, 499)),
  categoryGstRates: getConfiguredRateMap(),
});

const getCategoryMeta = (category) => {
  if (!category || typeof category !== "object") {
    return { name: "", slug: "", gstRate: null };
  }

  return {
    name: String(category.name || ""),
    slug: String(category.slug || ""),
    gstRate:
      category.gstRate !== undefined && category.gstRate !== null
        ? Number(category.gstRate)
        : null,
  };
};

const KEYWORD_RULES = [
  { keywords: ["instrument", "guitar", "piano", "drum", "violin", "flute"], rate: 12 },
  { keywords: ["accessor", "string", "strap", "stand", "case", "cover"], rate: 12 },
  { keywords: ["electronic", "audio", "speaker", "amplifier", "mixer", "dj"], rate: 12 },
];

export const resolveGstRateForCategory = (category) => {
  const config = getPricingConfig();
  const { name, slug, gstRate } = getCategoryMeta(category);

  if (Number.isFinite(gstRate) && gstRate >= 0) {
    return gstRate;
  }

  const normalizedKeys = [slug, name]
    .map((value) => normalizeCategoryKey(value))
    .filter(Boolean);

  for (const key of normalizedKeys) {
    if (Object.prototype.hasOwnProperty.call(config.categoryGstRates, key)) {
      return config.categoryGstRates[key];
    }
  }

  const configuredEntries = Object.entries(config.categoryGstRates);
  for (const key of normalizedKeys) {
    const matched = configuredEntries.find(
      ([configuredKey]) => key.includes(configuredKey) || configuredKey.includes(key)
    );
    if (matched) return matched[1];
  }

  const searchableText = `${name} ${slug}`.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((word) => searchableText.includes(word))) {
      return rule.rate;
    }
  }

  return config.defaultGstRate;
};

export const getShippingCharge = (orderType = "buy", subtotal = 0) => {
  const config = getPricingConfig();
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);

  if (safeSubtotal > config.freeShippingThreshold) {
    return 0;
  }

  return orderType === "rent" ? config.rentShippingCharge : config.buyShippingCharge;
};

export const buildPricingSummary = ({ subtotal = 0, gstAmount = 0, shippingCharge = 0 }) => {
  const sanitizedSubtotal = roundMoney(Math.max(0, subtotal));
  const sanitizedGstAmount = roundMoney(Math.max(0, gstAmount));
  const sanitizedShipping = roundMoney(Math.max(0, shippingCharge));
  const total = roundMoney(sanitizedSubtotal + sanitizedGstAmount + sanitizedShipping);

  return {
    subtotal: sanitizedSubtotal,
    gstAmount: sanitizedGstAmount,
    shippingCharge: sanitizedShipping,
    total,
  };
};

export const calculateBuyItemAmounts = ({ instrument, quantity, unitPrice }) => {
  const safeQuantity = Math.max(1, Number(quantity) || 1);
  const safeUnitPrice = Math.max(0, Number(unitPrice) || 0);
  const taxableAmount = roundMoney(safeUnitPrice * safeQuantity);
  const gstRate = resolveGstRateForCategory(instrument?.category);
  const gstAmount = roundMoney((taxableAmount * gstRate) / 100);
  const lineTotal = roundMoney(taxableAmount + gstAmount);

  return {
    quantity: safeQuantity,
    unitPrice: safeUnitPrice,
    taxableAmount,
    gstRate,
    gstAmount,
    lineTotal,
  };
};

export const calculateRentAmounts = ({
  instrument,
  days,
  rentPricePerDay,
  deposit = 0,
  shippingCharge,
}) => {
  const safeDays = Math.max(1, Number(days) || 1);
  const safeRentPricePerDay = Math.max(0, Number(rentPricePerDay) || 0);
  const safeDeposit = Math.max(0, Number(deposit) || 0);
  const rentalAmount = roundMoney(safeDays * safeRentPricePerDay);
  const subtotal = roundMoney(rentalAmount + safeDeposit);
  const gstRate = resolveGstRateForCategory(instrument?.category);
  const gstAmount = roundMoney((subtotal * gstRate) / 100);
  const summary = buildPricingSummary({
    subtotal,
    gstAmount,
    shippingCharge,
  });

  return {
    days: safeDays,
    rentPricePerDay: safeRentPricePerDay,
    deposit: safeDeposit,
    rentalAmount,
    gstRate,
    ...summary,
  };
};
