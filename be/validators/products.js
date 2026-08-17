const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

// null, undefined và chuỗi rỗng đều KHÔNG được ngầm hiểu là 0.
const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return NaN;
  return Number(value);
};

const validateProductPayload = (payload) => {
  const errors = [];
  const { name, categoryId, colors } = payload || {};

  if (!isNonEmptyString(name)) {
    errors.push("name là bắt buộc");
  } else if (name.trim().length > 255) {
    errors.push("name tối đa 255 ký tự");
  }

  if (!Number.isInteger(toNumber(categoryId))) {
    errors.push("categoryId là bắt buộc và phải là số nguyên");
  }

  if (colors === undefined) return errors;

  if (!Array.isArray(colors)) {
    errors.push("colors phải là mảng");
    return errors;
  }

  const seenColors = new Set();

  colors.forEach((color, i) => {
    if (!isNonEmptyString(color?.color)) {
      errors.push(`colors[${i}].color là bắt buộc`);
    } else {
      const key = color.color.trim();
      if (seenColors.has(key)) errors.push(`Màu '${key}' bị lặp lại`);
      seenColors.add(key);
    }

    (color?.images || []).forEach((image, j) => {
      if (!isNonEmptyString(image?.imageUrl)) {
        errors.push(`colors[${i}].images[${j}].imageUrl là bắt buộc`);
      }
    });

    const seenSizes = new Set();

    (color?.variants || []).forEach((variant, j) => {
      if (!isNonEmptyString(variant?.size)) {
        errors.push(`colors[${i}].variants[${j}].size là bắt buộc`);
      } else {
        const key = variant.size.trim();
        if (seenSizes.has(key)) {
          errors.push(`Size '${key}' bị lặp trong màu '${color.color}'`);
        }
        seenSizes.add(key);
      }

      const price = toNumber(variant?.price);
      if (!Number.isFinite(price) || price < 0) {
        errors.push(`colors[${i}].variants[${j}].price phải là số >= 0`);
      }

      const stock = toNumber(variant?.stock);
      if (!Number.isInteger(stock) || stock < 0) {
        errors.push(`colors[${i}].variants[${j}].stock phải là số nguyên >= 0`);
      }
    });
  });

  return errors;
};

module.exports = { validateProductPayload };
