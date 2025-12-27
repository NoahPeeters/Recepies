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
  if (amount < 0.01) {
    return amount.toFixed(3);
  }
  if (amount < 1) {
    const fractions = [
      [0.25, '¼'], [0.33, '⅓'], [0.5, '½'], [0.66, '⅔'], [0.75, '¾'],
      [0.125, '⅛'], [0.375, '⅜'], [0.625, '⅝'], [0.875, '⅞'],
    ];
    for (const [val, frac] of fractions) {
      if (Math.abs(amount - val) < 0.02) {
        return frac;
      }
    }
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

  if (unitConversions[currentUnit]) {
    for (const [threshold, divisor, newUnit] of unitConversions[currentUnit]) {
      if (currentAmount >= threshold) {
        currentAmount = currentAmount / divisor;
        currentUnit = newUnit;
      }
    }
  }

  if (reverseConversions[currentUnit]) {
    const [threshold, multiplier, newUnit] = reverseConversions[currentUnit];
    if (currentAmount < threshold && currentAmount > 0) {
      currentAmount = currentAmount * multiplier;
      currentUnit = newUnit;
    }
  }

  return { amount: currentAmount, unit: currentUnit };
}

function getPortionTypes(container) {
  const definitions = container.querySelectorAll('.portion-type-definition');
  const portionTypes = [];

  definitions.forEach(def => {
    portionTypes.push({
      name: def.dataset.name,
      plural: def.dataset.plural,
      multiplier: parseFloat(def.dataset.multiplier) || 1,
      isDefault: def.dataset.default === 'true',
    });
  });

  return portionTypes;
}

function getPortionTypeName(portionType, count) {
  if (!portionType) return '';
  return count === 1 ? portionType.name : portionType.plural;
}

function updateIngredients(container) {
  const baseServings = parseFloat(container.dataset.baseServings);
  const input = container.querySelector('.servings-input');
  const currentServings = parseFloat(input.value) || baseServings;

  // Get portion type multiplier
  const portionTypeSelect = container.querySelector('.portion-type-select');
  const portionTypes = container.portionTypes || [];
  let portionMultiplier = 1;
  let currentPortionType = null;

  if (portionTypeSelect && portionTypes.length > 0) {
    const selectedIndex = parseInt(portionTypeSelect.value) || 0;
    currentPortionType = portionTypes[selectedIndex];
    portionMultiplier = currentPortionType ? currentPortionType.multiplier : 1;
  }

  // Update portion type display
  const portionLabel = container.querySelector('.portion-type-label');
  if (portionLabel) {
    // Simple label (no portion types defined)
    portionLabel.textContent = currentServings === 1 ? 'Portion' : 'Portionen';
  }

  // Update dropdown options with correct singular/plural
  if (portionTypeSelect) {
    const options = portionTypeSelect.querySelectorAll('option');
    options.forEach(option => {
      const singular = option.dataset.singular;
      const plural = option.dataset.plural;
      option.textContent = currentServings === 1 ? singular : plural;
    });
  }

  const ratio = (currentServings / baseServings) * portionMultiplier;
  const ingredients = container.querySelectorAll('.ingredient');

  ingredients.forEach(ingredient => {
    const baseAmount = parseFloat(ingredient.dataset.baseAmount) || 0;
    const baseUnit = ingredient.dataset.unit || '';
    const name = ingredient.dataset.name || '';
    const plural = ingredient.dataset.plural || name;
    const scalable = ingredient.dataset.scalable !== 'false';

    let newAmount = scalable ? baseAmount * ratio : baseAmount;
    let displayUnit = baseUnit;

    if (baseUnit && newAmount > 0) {
      const converted = convertUnit(newAmount, baseUnit);
      newAmount = converted.amount;
      displayUnit = converted.unit;
    }

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
      nameEl.textContent = newAmount > 1 ? plural : name;
    }
  });
}

function buildPortionTypeSelector(container, portionTypes) {
  const selectorContainer = container.querySelector('.portion-type-selector');
  if (!selectorContainer) return;

  if (portionTypes.length === 0) {
    // No portion types defined, show simple label
    const label = document.createElement('span');
    label.className = 'portion-type-label';
    const servings = parseInt(container.querySelector('.servings-input').value) || 4;
    label.textContent = servings === 1 ? 'Portion' : 'Portionen';
    selectorContainer.appendChild(label);
    return;
  }

  // Find default index
  let defaultIndex = portionTypes.findIndex(pt => pt.isDefault);
  if (defaultIndex === -1) defaultIndex = 0;

  // Create select element
  const select = document.createElement('select');
  select.className = 'portion-type-select';
  select.setAttribute('aria-label', 'Portion type');

  portionTypes.forEach((pt, index) => {
    const option = document.createElement('option');
    option.value = index;
    // Will be updated dynamically based on serving count
    option.dataset.singular = pt.name;
    option.dataset.plural = pt.plural;
    option.textContent = pt.plural;
    if (index === defaultIndex) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  selectorContainer.appendChild(select);

  // Store portion types on container for later access
  container.portionTypes = portionTypes;

  // Add event listener
  select.addEventListener('change', () => {
    updateIngredients(container);
  });
}

function initIngredients() {
  document.querySelectorAll('.ingredients-container').forEach(container => {
    const input = container.querySelector('.servings-input');
    const decreaseBtn = container.querySelector('[data-action="decrease"]');
    const increaseBtn = container.querySelector('[data-action="increase"]');

    // Parse and build portion type selector
    const portionTypes = getPortionTypes(container);
    buildPortionTypeSelector(container, portionTypes);

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

    // Initial update
    updateIngredients(container);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIngredients);
} else {
  initIngredients();
}
