// Unit conversion rules: [threshold, divisor, newUnit]
const unitConversions = {
  'g': [
    [1000, 1000, 'kg'],
  ],
  'mg': [
    [1000, 1000, 'g'],
  ],
  'ml': [
    [1000, 1000, 'L'],
  ],
  'cl': [
    [100, 100, 'L'],
  ],
  'mm': [
    [10, 10, 'cm'],
    [1000, 1000, 'm'],
  ],
  'cm': [
    [100, 100, 'm'],
  ],
};

// Reverse conversions for scaling down
const reverseConversions = {
  'kg': [1, 1000, 'g'],
  'L': [1, 1000, 'ml'],
  'm': [1, 100, 'cm'],
};

function formatAmount(amount) {
  // Handle very small amounts
  if (amount < 0.01) {
    return amount.toFixed(3);
  }
  // Round to reasonable precision
  if (amount < 1) {
    // Show fractions for small amounts
    const fractions = [
      [0.25, '¼'], [0.33, '⅓'], [0.5, '½'], [0.66, '⅔'], [0.75, '¾'],
      [0.125, '⅛'], [0.375, '⅜'], [0.625, '⅝'], [0.875, '⅞'],
    ];
    for (const [val, frac] of fractions) {
      if (Math.abs(amount - val) < 0.02) {
        return frac;
      }
    }
    // Check for whole + fraction
    const whole = Math.floor(amount);
    const remainder = amount - whole;
    if (whole > 0) {
      for (const [val, frac] of fractions) {
        if (Math.abs(remainder - val) < 0.02) {
          return `${whole}${frac}`;
        }
      }
    }
    return amount.toFixed(2).replace(/\.?0+$/, '');
  }
  if (amount < 10) {
    return amount.toFixed(1).replace(/\.0$/, '');
  }
  return Math.round(amount).toString();
}

function convertUnit(amount, unit) {
  let currentAmount = amount;
  let currentUnit = unit;

  // Check for scale-up conversions
  if (unitConversions[currentUnit]) {
    for (const [threshold, divisor, newUnit] of unitConversions[currentUnit]) {
      if (currentAmount >= threshold) {
        currentAmount = currentAmount / divisor;
        currentUnit = newUnit;
      }
    }
  }

  // Check for scale-down conversions (e.g., 0.5 kg -> 500 g)
  if (reverseConversions[currentUnit]) {
    const [threshold, multiplier, newUnit] = reverseConversions[currentUnit];
    if (currentAmount < threshold && currentAmount > 0) {
      currentAmount = currentAmount * multiplier;
      currentUnit = newUnit;
    }
  }

  return { amount: currentAmount, unit: currentUnit };
}

function updateIngredients(container) {
  const baseServings = parseFloat(container.dataset.baseServings);
  const currentServings = parseFloat(container.querySelector('.servings-input').value) || baseServings;
  const ratio = currentServings / baseServings;

  const ingredients = container.querySelectorAll('.ingredient');

  ingredients.forEach(ingredient => {
    const baseAmount = parseFloat(ingredient.dataset.baseAmount) || 0;
    const baseUnit = ingredient.dataset.unit || '';
    const name = ingredient.dataset.name || '';
    const plural = ingredient.dataset.plural || name;
    const scalable = ingredient.dataset.scalable !== 'false';

    let newAmount = scalable ? baseAmount * ratio : baseAmount;
    let displayUnit = baseUnit;

    // Convert units if needed
    if (baseUnit && newAmount > 0) {
      const converted = convertUnit(newAmount, baseUnit);
      newAmount = converted.amount;
      displayUnit = converted.unit;
    }

    // Update DOM
    const amountEl = ingredient.querySelector('.ingredient-amount');
    const unitEl = ingredient.querySelector('.ingredient-unit');
    const nameEl = ingredient.querySelector('.ingredient-name');

    if (amountEl) {
      amountEl.textContent = newAmount > 0 ? formatAmount(newAmount) : '';
    }
    if (unitEl) {
      unitEl.textContent = displayUnit;
    }
    if (nameEl) {
      // Use plural if amount > 1
      nameEl.textContent = newAmount > 1 ? plural : name;
    }
  });
}

function initIngredients() {
  document.querySelectorAll('.ingredients-container').forEach(container => {
    const input = container.querySelector('.servings-input');
    const decreaseBtn = container.querySelector('[data-action="decrease"]');
    const increaseBtn = container.querySelector('[data-action="increase"]');

    if (input) {
      input.addEventListener('input', () => {
        let value = parseInt(input.value) || 1;
        value = Math.max(1, Math.min(99, value));
        input.value = value;
        updateIngredients(container);
      });

      input.addEventListener('blur', () => {
        if (!input.value || parseInt(input.value) < 1) {
          input.value = container.dataset.baseServings;
          updateIngredients(container);
        }
      });
    }

    if (decreaseBtn) {
      decreaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(input.value) || 1;
        if (currentValue > 1) {
          input.value = currentValue - 1;
          updateIngredients(container);
        }
      });
    }

    if (increaseBtn) {
      increaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(input.value) || 1;
        if (currentValue < 99) {
          input.value = currentValue + 1;
          updateIngredients(container);
        }
      });
    }

    // Initial update to ensure proper formatting
    updateIngredients(container);
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIngredients);
} else {
  initIngredients();
}
