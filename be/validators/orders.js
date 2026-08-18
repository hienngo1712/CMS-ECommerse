const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

// null, undefined và chuỗi rỗng đều KHÔNG được ngầm hiểu là 0.
const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return NaN;
  return Number(value);
};

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "SHIPPING",
  "DELIVERED",
  "CANCELED",
];

// Trạng thái nào đi tiếp được sang trạng thái nào. Mảng rỗng = trạng thái cuối.
const STATUS_FLOW = {
  PENDING: ["CONFIRMED", "CANCELED"],
  CONFIRMED: ["SHIPPING", "CANCELED"],
  SHIPPING: ["DELIVERED", "CANCELED"],
  DELIVERED: [],
  CANCELED: [],
};

const ADDRESS_FIELDS = ["fullname", "phone", "street", "city"];

const validateOrderPayload = (payload) => {
  const errors = [];
  const { items, address, userId } = payload || {};

  if (userId !== undefined && userId !== null && !Number.isInteger(toNumber(userId))) {
    errors.push("userId phải là số nguyên");
  }

  if (!address || typeof address !== "object") {
    errors.push("address là bắt buộc");
  } else {
    ADDRESS_FIELDS.forEach((field) => {
      if (!isNonEmptyString(address[field])) {
        errors.push(`address.${field} là bắt buộc`);
      }
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    errors.push("items là bắt buộc và phải có ít nhất 1 dòng");
    return errors;
  }

  const seenVariants = new Set();

  items.forEach((item, i) => {
    const variantId = toNumber(item?.variantId);
    if (!Number.isInteger(variantId)) {
      errors.push(`items[${i}].variantId là bắt buộc và phải là số nguyên`);
    } else if (seenVariants.has(variantId)) {
      // Để lọt hai dòng cùng variant thì bước trừ kho chạy hai lần trên cùng
      // một bản ghi, lần sau ghi đè lần trước và kho bị trừ thiếu.
      errors.push(`items[${i}].variantId bị lặp lại, gộp số lượng lại một dòng`);
    } else {
      seenVariants.add(variantId);
    }

    const quantity = toNumber(item?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      errors.push(`items[${i}].quantity phải là số nguyên >= 1`);
    }
  });

  return errors;
};

module.exports = {
  validateOrderPayload,
  ORDER_STATUSES,
  STATUS_FLOW,
};
