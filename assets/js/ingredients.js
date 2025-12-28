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

function parseAltUnits(altUnitsStr) {
  // Parse format: "TL:3,EL:9" -> [{unit: "TL", factor: 3}, {unit: "EL", factor: 9}]
  if (!altUnitsStr) return [];
  return altUnitsStr.split(',').map(item => {
    const [unit, factor] = item.trim().split(':');
    return { unit: unit.trim(), factor: parseFloat(factor) || 1 };
  });
}

function formatAltUnits(amount, altUnitsStr) {
  // Convert amount to alternative units and format for display
  const altUnits = parseAltUnits(altUnitsStr);
  if (altUnits.length === 0 || amount <= 0) return '';

  const parts = altUnits.map(({ unit, factor }) => {
    const altAmount = amount / factor;
    return `${formatAmount(altAmount)} ${unit}`;
  });

  return parts.join(' · ');
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
    const amountEl = ingredient.querySelector('.ingredient-amount');
    const unitEl = ingredient.querySelector('.ingredient-unit');

    // Check if this is an ingredient-choice
    const ingredientSelect = ingredient.querySelector('.ingredient-select');
    let baseAmount, constant, baseUnit, name, plural;

    if (ingredientSelect) {
      // Get values from selected option
      const selectedOption = ingredientSelect.options[ingredientSelect.selectedIndex];
      baseAmount = parseFloat(selectedOption.dataset.amount) || 0;
      constant = parseFloat(selectedOption.dataset.constant) || 0;
      baseUnit = selectedOption.dataset.unit || '';
      name = selectedOption.dataset.name || '';
      plural = selectedOption.dataset.plural || name;
    } else {
      // Regular ingredient
      baseAmount = parseFloat(ingredient.dataset.baseAmount) || 0;
      constant = parseFloat(ingredient.dataset.constant) || 0;
      baseUnit = ingredient.dataset.unit || '';
      name = ingredient.dataset.name || '';
      plural = ingredient.dataset.plural || name;

      const nameEl = ingredient.querySelector('.ingredient-name');
      if (nameEl) {
        let newAmount = baseAmount * ratio + constant;
        nameEl.textContent = newAmount > 1 ? plural : name;
      }
    }

    // Linear formula: total = amount * ratio + constant
    let newAmount = baseAmount * ratio + constant;
    let displayUnit = baseUnit;

    if (baseUnit && newAmount > 0) {
      const converted = convertUnit(newAmount, baseUnit);
      newAmount = converted.amount;
      displayUnit = converted.unit;
    }

    if (amountEl) {
      amountEl.textContent = newAmount > 0 ? formatAmount(newAmount) : '';
    }
    if (unitEl) {
      unitEl.textContent = displayUnit;
    }

    // Update alternative units display
    const altUnitsEl = ingredient.querySelector('.ingredient-alt-units');
    if (altUnitsEl) {
      // Get altUnits from ingredient or selected option
      let altUnitsStr = '';
      if (ingredientSelect) {
        const selectedOption = ingredientSelect.options[ingredientSelect.selectedIndex];
        altUnitsStr = selectedOption.dataset.altUnits || '';
      } else {
        altUnitsStr = ingredient.dataset.altUnits || '';
      }
      // Use the raw calculated amount (before unit conversion) for alt units
      const rawAmount = baseAmount * ratio + constant;
      const altUnitsText = formatAltUnits(rawAmount, altUnitsStr);
      altUnitsEl.textContent = altUnitsText;
    }

    // Store calculated values for use references
    const ingredientId = ingredient.dataset.ingredientId;
    if (ingredientId) {
      ingredient.dataset.calculatedAmount = baseAmount * ratio + constant;
      ingredient.dataset.calculatedUnit = baseUnit;
      ingredient.dataset.calculatedName = name;
      ingredient.dataset.calculatedPlural = plural;
    }
  });

  // Update all ingredient-use references on the page
  updateIngredientUses();

  // Update posthof prices based on new amounts
  updateAllPosthofPrices();
}

function updateIngredientUses() {
  document.querySelectorAll('.ingredient-use').forEach(use => {
    const ingredientId = use.dataset.ingredientId;
    const m = parseFloat(use.dataset.m) || 1;
    const b = parseFloat(use.dataset.b) || 0;

    // Find the referenced ingredient
    const ingredient = document.querySelector(`.ingredient[data-ingredient-id="${ingredientId}"]`);
    if (!ingredient) return;

    const calculatedAmount = parseFloat(ingredient.dataset.calculatedAmount) || 0;
    const unit = ingredient.dataset.calculatedUnit || '';
    const name = ingredient.dataset.calculatedName || '';
    const plural = ingredient.dataset.calculatedPlural || name;

    // Apply mx+b formula
    let useAmount = m * calculatedAmount + b;
    let displayUnit = unit;

    // Convert units if needed
    if (unit && useAmount > 0) {
      const converted = convertUnit(useAmount, unit);
      useAmount = converted.amount;
      displayUnit = converted.unit;
    }

    // Update display
    const amountEl = use.querySelector('.use-amount');
    const unitEl = use.querySelector('.use-unit');
    const nameEl = use.querySelector('.use-name');

    if (amountEl) {
      amountEl.textContent = useAmount > 0 ? formatAmount(useAmount) : '';
    }
    if (unitEl) {
      unitEl.textContent = displayUnit;
    }
    if (nameEl) {
      nameEl.textContent = useAmount > 1 ? plural : name;
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

function getStorageKey() {
  return `recipe-servings:${window.location.pathname}`;
}

function saveSelection(container) {
  const input = container.querySelector('.servings-input');
  const select = container.querySelector('.portion-type-select');

  // Collect ingredient choice selections by ID
  const ingredientChoices = {};
  container.querySelectorAll('.ingredient-choice').forEach(choice => {
    const id = choice.dataset.ingredientId;
    const sel = choice.querySelector('.ingredient-select');
    if (id && sel) {
      ingredientChoices[id] = sel.selectedIndex;
    }
  });

  const data = {
    servings: parseInt(input.value) || parseInt(container.dataset.baseServings),
    portionTypeIndex: select ? parseInt(select.value) : 0,
    ingredientChoices: ingredientChoices
  };

  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
  } catch (e) {
    // localStorage not available or full
  }
}

function loadSelection(container) {
  try {
    const saved = localStorage.getItem(getStorageKey());
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    // localStorage not available
  }
  return null;
}

function initIngredients() {
  document.querySelectorAll('.ingredients-container').forEach(container => {
    const input = container.querySelector('.servings-input');
    const decreaseBtn = container.querySelector('[data-action="decrease"]');
    const increaseBtn = container.querySelector('[data-action="increase"]');

    // Parse and build portion type selector
    const portionTypes = getPortionTypes(container);
    buildPortionTypeSelector(container, portionTypes);

    // Load saved selection
    const saved = loadSelection(container);
    if (saved) {
      if (input && saved.servings) {
        input.value = saved.servings;
      }
      const select = container.querySelector('.portion-type-select');
      if (select && saved.portionTypeIndex !== undefined) {
        select.value = saved.portionTypeIndex;
      }
      // Restore ingredient choices by ID
      if (saved.ingredientChoices) {
        container.querySelectorAll('.ingredient-choice').forEach(choice => {
          const id = choice.dataset.ingredientId;
          const sel = choice.querySelector('.ingredient-select');
          if (id && sel && saved.ingredientChoices[id] !== undefined) {
            sel.selectedIndex = saved.ingredientChoices[id];
          }
        });
      }
    }

    // Add event listeners for ingredient choice selects
    container.querySelectorAll('.ingredient-select').forEach(sel => {
      sel.addEventListener('change', () => {
        updateIngredients(container);
        saveSelection(container);
      });
    });

    if (input) {
      input.addEventListener('input', () => {
        let value = parseInt(input.value) || 1;
        value = Math.max(1, Math.min(99, value));
        input.value = value;
        updateIngredients(container);
        saveSelection(container);
      });

      input.addEventListener('blur', () => {
        if (!input.value || parseInt(input.value) < 1) {
          input.value = container.dataset.baseServings;
          updateIngredients(container);
          saveSelection(container);
        }
      });
    }

    if (decreaseBtn) {
      decreaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(input.value) || 1;
        if (currentValue > 1) {
          input.value = currentValue - 1;
          updateIngredients(container);
          saveSelection(container);
        }
      });
    }

    if (increaseBtn) {
      increaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(input.value) || 1;
        if (currentValue < 99) {
          input.value = currentValue + 1;
          updateIngredients(container);
          saveSelection(container);
        }
      });
    }

    // Add save on portion type change
    const select = container.querySelector('.portion-type-select');
    if (select) {
      select.addEventListener('change', () => {
        saveSelection(container);
      });
    }

    // Initial update
    updateIngredients(container);
  });
}

// Posthof Food Coop API integration
const POSTHOF_API_BASE = 'https://api.app.posthof-rendsburg.de/foodcoop/products/';
const posthofCache = new Map();

async function fetchPosthofProduct(productId) {
  if (posthofCache.has(productId)) {
    return posthofCache.get(productId);
  }

  try {
    const response = await fetch(`${POSTHOF_API_BASE}${productId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    posthofCache.set(productId, data);
    return data;
  } catch (error) {
    console.error(`Failed to fetch Posthof product ${productId}:`, error);
    return null;
  }
}

function formatPrice(cents) {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €';
}

function getStockClass(stock) {
  if (stock <= 0) return 'out-of-stock';
  if (stock <= 2) return 'low-stock';
  return 'in-stock';
}

function getStockText(stock, unit) {
  if (stock <= 0) return 'Nicht verfügbar';
  return `${stock} ${unit} verfügbar`;
}

const POSTHOF_APP_BASE = 'https://app.posthof-rendsburg.de/products/';

function getProductImageUrl(productId, imageId) {
  return `${POSTHOF_API_BASE}${productId}/images/${imageId}/preview`;
}

function getProductPageUrl(productId) {
  return `${POSTHOF_APP_BASE}${productId}`;
}

function parsePosthofParam(posthofParam) {
  // Parse format: "id:amount,id:amount,..."
  if (!posthofParam) return [];
  return posthofParam.split(',').map(item => {
    const [id, amount] = item.trim().split(':');
    return { id: id.trim(), amount: parseFloat(amount) || 0 };
  });
}

async function fetchAllProducts(products) {
  const results = [];
  for (const product of products) {
    const data = await fetchPosthofProduct(product.id);
    if (data) {
      results.push({ data, productUnit: product.amount });
    }
  }
  return results;
}

async function findFirstInStock(products) {
  for (const product of products) {
    const data = await fetchPosthofProduct(product.id);
    if (data && data.stock > 0) {
      return { data, productUnit: product.amount };
    }
  }
  // If none in stock, return first one anyway
  if (products.length > 0) {
    const data = await fetchPosthofProduct(products[0].id);
    return { data, productUnit: products[0].amount };
  }
  return { data: null, productUnit: 0 };
}

function renderPosthofInfo(container, data, productUnit, ingredientElement) {
  container.removeAttribute('data-loading');
  container.innerHTML = '';

  if (!data) {
    container.innerHTML = '<span class="posthof-error">Produkt nicht gefunden</span>';
    return;
  }

  const productId = data.id;
  const stock = data.stock || 0;
  const stockUnit = data.stockUnit || 'Stück';
  const pricePerUnit = data.productData?.price?.totalCents;
  const productName = data.productData?.name || '';
  const images = data.productData?.images || [];
  const defaultImage = images.find(img => img.isDefault) || images[0];

  // Store product data on container for price recalculation
  container.posthofData = {
    pricePerUnit,
    productId,
    defaultImage,
    productName,
    stock,
    stockUnit,
    productUnit
  };

  updatePosthofDisplay(container, ingredientElement);
}

function renderMultiplePosthofProducts(container, allProducts, ingredientElement) {
  container.removeAttribute('data-loading');
  container.innerHTML = '';

  if (!allProducts || allProducts.length === 0) {
    container.innerHTML = '<span class="posthof-error">Produkt nicht gefunden</span>';
    return;
  }

  // Check for saved selection
  const ingredientId = ingredientElement.dataset.ingredientId;
  let defaultIndex = loadProductSelection(ingredientId);

  // If no saved selection, find first in-stock product
  if (defaultIndex === undefined || defaultIndex >= allProducts.length) {
    defaultIndex = allProducts.findIndex(p => p.data.stock > 0);
    if (defaultIndex === -1) defaultIndex = 0;
  }

  // Store all products data
  container.allPosthofProducts = allProducts.map(p => {
    const data = p.data;
    return {
      pricePerUnit: data.productData?.price?.totalCents,
      productId: data.id,
      defaultImage: (data.productData?.images || []).find(img => img.isDefault) || (data.productData?.images || [])[0],
      productName: data.productData?.name || '',
      stock: data.stock || 0,
      stockUnit: data.stockUnit || 'Stück',
      productUnit: p.productUnit
    };
  });
  container.selectedProductIndex = defaultIndex;
  container.posthofData = container.allPosthofProducts[defaultIndex];

  updateMultiPosthofDisplay(container, ingredientElement);
}

function updateMultiPosthofDisplay(container, ingredientElement) {
  const allProducts = container.allPosthofProducts;
  if (!allProducts || allProducts.length === 0) return;

  const selectedIndex = container.selectedProductIndex || 0;
  const data = allProducts[selectedIndex];
  const { pricePerUnit, productId, defaultImage, productName, stock, stockUnit, productUnit } = data;
  const calculatedAmount = parseFloat(ingredientElement?.dataset?.calculatedAmount) || 0;

  const stockClass = getStockClass(stock);
  const productUrl = getProductPageUrl(productId);

  // Calculate price based on ingredient amount if productUnit is defined
  let displayPrice = pricePerUnit;
  if (productUnit > 0 && calculatedAmount > 0 && pricePerUnit) {
    displayPrice = Math.round((calculatedAmount / productUnit) * pricePerUnit);
  }

  let html = '';

  // Main product display (clickable link)
  html += `<div class="posthof-multi-wrapper">`;
  html += `<a class="posthof-link" href="${productUrl}" target="_blank" rel="noopener" title="Im Posthof anzeigen">`;
  html += `<div class="posthof-details">`;

  // Price and stock info (left side)
  html += `<div class="price-info">`;
  // Price (top)
  if (displayPrice) {
    html += `<span class="posthof-price">${formatPrice(displayPrice)}</span>`;
  }
  // Stock indicator (bottom)
  html += `<span class="posthof-stock ${stockClass}" title="${getStockText(stock, stockUnit)}">`;
  html += `<span class="posthof-stock-dot"></span>${stock}`;
  html += `</span>`;
  html += `</div>`;

  // Product image (right side)
  if (defaultImage) {
    const imageUrl = getProductImageUrl(productId, defaultImage.id);
    html += `<img class="posthof-image" src="${imageUrl}" alt="${productName}" loading="lazy">`;
  }

  html += `</div></a>`;

  // Hover popup showing selected product details
  const selectedProduct = data;
  html += `<div class="posthof-popup">`;
  html += `<div class="posthof-popup-item selected">`;
  if (defaultImage) {
    const imageUrl = getProductImageUrl(productId, defaultImage.id);
    html += `<img class="posthof-popup-image" src="${imageUrl}" alt="${productName}" loading="lazy">`;
  }
  html += `<div class="posthof-popup-info">`;
  html += `<span class="posthof-popup-name">${productName}</span>`;
  html += `<span class="posthof-popup-meta">`;
  html += `<span class="posthof-stock ${stockClass}"><span class="posthof-stock-dot"></span>${stock} verfügbar</span>`;
  if (displayPrice) {
    html += ` · <span class="posthof-price">${formatPrice(displayPrice)}</span>`;
  }
  html += `</span>`;
  html += `</div>`;
  html += `</div>`;

  // Show other product options if multiple available
  if (allProducts.length > 1) {
    html += `<div class="posthof-popup-divider"></div>`;
    html += `<div class="posthof-popup-alternatives">`;
    allProducts.forEach((p, idx) => {
      if (idx === selectedIndex) return; // Skip selected
      const pStockClass = getStockClass(p.stock);
      const pImage = p.defaultImage;

      let pDisplayPrice = p.pricePerUnit;
      if (p.productUnit > 0 && calculatedAmount > 0 && p.pricePerUnit) {
        pDisplayPrice = Math.round((calculatedAmount / p.productUnit) * p.pricePerUnit);
      }

      html += `<div class="posthof-popup-item clickable" data-index="${idx}">`;
      if (pImage) {
        const pImageUrl = getProductImageUrl(p.productId, pImage.id);
        html += `<img class="posthof-popup-image" src="${pImageUrl}" alt="${p.productName}" loading="lazy">`;
      }
      html += `<div class="posthof-popup-info">`;
      html += `<span class="posthof-popup-name">${p.productName}</span>`;
      html += `<span class="posthof-popup-meta">`;
      html += `<span class="posthof-stock ${pStockClass}"><span class="posthof-stock-dot"></span>${p.stock}</span>`;
      if (pDisplayPrice) {
        html += ` · <span class="posthof-price">${formatPrice(pDisplayPrice)}</span>`;
      }
      html += `</span>`;
      html += `</div>`;
      html += `</div>`;
    });
    html += `</div>`;
  }
  html += `</div>`;

  html += `</div>`;

  container.innerHTML = html;

  // Add click listeners for popup items (only for multi-product)
  if (allProducts.length > 1) {
    container.querySelectorAll('.posthof-popup-item.clickable').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(item.dataset.index);
        container.selectedProductIndex = idx;
        container.posthofData = container.allPosthofProducts[idx];

        // Save selection to storage
        const ingredientId = ingredientElement.dataset.ingredientId;
        if (ingredientId) {
          saveProductSelection(ingredientId, idx);
        }

        updateMultiPosthofDisplay(container, ingredientElement);
        updateTotalPrice();
        updateUsePopups();
      });
    });
  }
}

function getProductStorageKey() {
  return `recipe-products:${window.location.pathname}`;
}

function saveProductSelection(ingredientId, productIndex) {
  try {
    const key = getProductStorageKey();
    const saved = localStorage.getItem(key);
    const data = saved ? JSON.parse(saved) : {};
    data[ingredientId] = productIndex;
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    // localStorage not available
  }
}

function loadProductSelection(ingredientId) {
  try {
    const key = getProductStorageKey();
    const saved = localStorage.getItem(key);
    if (saved) {
      const data = JSON.parse(saved);
      return data[ingredientId];
    }
  } catch (e) {
    // localStorage not available
  }
  return undefined;
}

function updatePosthofDisplay(container, ingredientElement) {
  const data = container.posthofData;
  if (!data) return;

  const { pricePerUnit, productId, defaultImage, productName, stock, stockUnit, productUnit } = data;
  const calculatedAmount = parseFloat(ingredientElement?.dataset?.calculatedAmount) || 0;

  const stockClass = getStockClass(stock);
  const productUrl = getProductPageUrl(productId);

  // Calculate price based on ingredient amount if productUnit is defined
  let displayPrice = pricePerUnit;
  if (productUnit > 0 && calculatedAmount > 0 && pricePerUnit) {
    displayPrice = Math.round((calculatedAmount / productUnit) * pricePerUnit);
  }

  let html = `<a class="posthof-link" href="${productUrl}" target="_blank" rel="noopener" title="Im Posthof anzeigen">`;
  html += `<div class="posthof-details">`;

  // Price and stock info (left side)
  html += `<div class="price-info">`;
  // Price (top)
  if (displayPrice) {
    html += `<span class="posthof-price">${formatPrice(displayPrice)}</span>`;
  }
  // Stock indicator (bottom)
  html += `<span class="posthof-stock ${stockClass}" title="${getStockText(stock, stockUnit)}">`;
  html += `<span class="posthof-stock-dot"></span>${stock}`;
  html += `</span>`;
  html += `</div>`;

  // Product image (right side)
  if (defaultImage) {
    const imageUrl = getProductImageUrl(productId, defaultImage.id);
    html += `<img class="posthof-image" src="${imageUrl}" alt="${productName}" loading="lazy">`;
  }

  html += `</div></a>`;

  container.innerHTML = html;
}

async function updateChoicePosthofInfo(select) {
  const ingredient = select.closest('.ingredient-choice');
  if (!ingredient) return;

  const infoContainer = ingredient.querySelector('.posthof-choice-info');
  if (!infoContainer) return;

  const selectedOption = select.options[select.selectedIndex];
  const posthofParam = selectedOption?.dataset?.posthof;

  if (posthofParam) {
    infoContainer.setAttribute('data-loading', 'true');
    infoContainer.innerHTML = '<span class="posthof-loading">Laden...</span>';
    const products = parsePosthofParam(posthofParam);
    // Always use multi-product rendering (shows popup on hover)
    const allProducts = await fetchAllProducts(products);
    renderMultiplePosthofProducts(infoContainer, allProducts, ingredient);
  } else {
    infoContainer.innerHTML = '';
  }
}

function updateAllPosthofPrices() {
  // Update all posthof displays with current calculated amounts
  document.querySelectorAll('.ingredient[data-posthof]').forEach(ingredient => {
    const infoContainer = ingredient.querySelector('.posthof-info');
    if (infoContainer?.allPosthofProducts) {
      // Multi-product display
      updateMultiPosthofDisplay(infoContainer, ingredient);
    } else if (infoContainer?.posthofData) {
      // Single product display
      updatePosthofDisplay(infoContainer, ingredient);
    }
  });

  // Update manual prices and total
  updateManualPrices();
  updateTotalPrice();
}

function parsePrice(priceStr) {
  // Parse format: "cents:unitAmount" -> {cents, unitAmount}
  if (!priceStr) return null;
  const [cents, unitAmount] = priceStr.split(':');
  return {
    cents: parseFloat(cents) || 0,
    unitAmount: parseFloat(unitAmount) || 0
  };
}

function calculateIngredientPrice(ingredient) {
  const calculatedAmount = parseFloat(ingredient.dataset.calculatedAmount) || 0;
  if (calculatedAmount <= 0) return 0;

  // Check for posthof data first
  const infoContainer = ingredient.querySelector('.posthof-info') || ingredient.querySelector('.posthof-choice-info');
  if (infoContainer?.posthofData) {
    const { pricePerUnit, productUnit } = infoContainer.posthofData;
    if (!pricePerUnit) return 0;

    if (productUnit > 0) {
      return Math.round((calculatedAmount / productUnit) * pricePerUnit);
    } else {
      return pricePerUnit;
    }
  }

  // Check for manual price data
  const priceData = parsePrice(ingredient.dataset.price);
  if (priceData && priceData.cents > 0 && priceData.unitAmount > 0) {
    return Math.round((calculatedAmount / priceData.unitAmount) * priceData.cents);
  }

  return 0;
}

function updateManualPrices() {
  document.querySelectorAll('.ingredient[data-price]').forEach(ingredient => {
    const priceInfo = ingredient.querySelector('.price-info');
    if (!priceInfo) return;

    const calculatedAmount = parseFloat(ingredient.dataset.calculatedAmount) || 0;
    const priceData = parsePrice(ingredient.dataset.price);

    if (priceData && priceData.cents > 0 && priceData.unitAmount > 0 && calculatedAmount > 0) {
      const displayPrice = Math.round((calculatedAmount / priceData.unitAmount) * priceData.cents);
      priceInfo.innerHTML = `<span class="manual-price">${formatPrice(displayPrice)}</span>`;
    } else {
      priceInfo.innerHTML = '';
    }
  });
}

function updateTotalPrice() {
  const priceBox = document.querySelector('.recipe-price-box');
  const priceValue = document.querySelector('.recipe-total-price');
  if (!priceBox || !priceValue) return;

  let totalCents = 0;
  let hasAnyPrice = false;

  // Sum prices from regular ingredients (posthof or manual price)
  document.querySelectorAll('.ingredient[data-posthof], .ingredient[data-price]').forEach(ingredient => {
    const price = calculateIngredientPrice(ingredient);
    if (price > 0) {
      totalCents += price;
      hasAnyPrice = true;
    }
  });

  // Sum prices from ingredient choices (only selected options)
  document.querySelectorAll('.ingredient-choice').forEach(choice => {
    const price = calculateIngredientPrice(choice);
    if (price > 0) {
      totalCents += price;
      hasAnyPrice = true;
    }
  });

  if (hasAnyPrice) {
    priceBox.style.display = '';
    priceValue.textContent = formatPrice(totalCents);
  } else {
    priceBox.style.display = 'none';
  }
}

async function initPosthofProducts() {
  // Regular ingredients with posthof parameter
  const ingredients = document.querySelectorAll('.ingredient[data-posthof]');

  for (const ingredient of ingredients) {
    const posthofParam = ingredient.dataset.posthof;
    const infoContainer = ingredient.querySelector('.posthof-info');

    if (posthofParam && infoContainer) {
      const products = parsePosthofParam(posthofParam);
      // Always use multi-product rendering (shows popup on hover)
      const allProducts = await fetchAllProducts(products);
      renderMultiplePosthofProducts(infoContainer, allProducts, ingredient);
    }
  }

  // Ingredient choices - check selected option for posthof ID
  const choiceSelects = document.querySelectorAll('.ingredient-choice .ingredient-select');
  for (const select of choiceSelects) {
    // Initial load
    await updateChoicePosthofInfo(select);

    // Listen for changes
    select.addEventListener('change', async () => {
      await updateChoicePosthofInfo(select);
      updateTotalPrice();
      updateUsePopups();
    });
  }
}

function updateUsePopups() {
  document.querySelectorAll('.ingredient-use-wrapper').forEach(wrapper => {
    const use = wrapper.querySelector('.ingredient-use');
    const popup = wrapper.querySelector('.use-posthof-popup');
    if (!use || !popup) return;

    const ingredientId = use.dataset.ingredientId;
    const ingredient = document.querySelector(`.ingredient[data-ingredient-id="${ingredientId}"]`);
    if (!ingredient) return;

    // Get posthof data from the ingredient
    const infoContainer = ingredient.querySelector('.posthof-info');
    if (!infoContainer?.posthofData) {
      popup.innerHTML = '';
      return;
    }

    const data = infoContainer.posthofData;
    const { productId, defaultImage, productName, stock, stockUnit } = data;
    const stockClass = getStockClass(stock);
    const productUrl = getProductPageUrl(productId);

    let html = `<a href="${productUrl}" target="_blank" rel="noopener" class="posthof-popup-item selected">`;
    if (defaultImage) {
      const imageUrl = getProductImageUrl(productId, defaultImage.id);
      html += `<img class="posthof-popup-image" src="${imageUrl}" alt="${productName}" loading="lazy">`;
    }
    html += `<div class="posthof-popup-info">`;
    html += `<span class="posthof-popup-name">${productName}</span>`;
    html += `<span class="posthof-popup-meta">`;
    html += `<span class="posthof-stock ${stockClass}"><span class="posthof-stock-dot"></span>${stock} verfügbar</span>`;
    html += `</span>`;
    html += `</div>`;
    html += `</a>`;

    popup.innerHTML = html;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initIngredients();
    initPosthofProducts().then(() => {
      updateManualPrices();
      updateUsePopups();
      updateTotalPrice();
    });
  });
} else {
  initIngredients();
  initPosthofProducts().then(() => {
    updateManualPrices();
    updateUsePopups();
    updateTotalPrice();
  });
}
