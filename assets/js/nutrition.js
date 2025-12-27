function formatNutritionValue(value) {
  if (value < 0.1) {
    return value.toFixed(2);
  }
  if (value < 1) {
    return value.toFixed(1);
  }
  if (value < 10) {
    return value.toFixed(1).replace(/\.0$/, '');
  }
  return Math.round(value).toString();
}

function updateNutrition() {
  const nutritionContainer = document.querySelector('.nutrition-container');
  if (!nutritionContainer) return;

  // Find the ingredients container to get the current portion multiplier
  const ingredientsContainer = document.querySelector('.ingredients-container');
  if (!ingredientsContainer) return;

  // Get portion type multiplier
  const portionTypeSelect = ingredientsContainer.querySelector('.portion-type-select');
  const portionTypes = ingredientsContainer.portionTypes || [];
  let portionMultiplier = 1;
  let portionTypeName = 'Portion';

  if (portionTypeSelect && portionTypes.length > 0) {
    const selectedIndex = parseInt(portionTypeSelect.value) || 0;
    const currentPortionType = portionTypes[selectedIndex];
    if (currentPortionType) {
      portionMultiplier = currentPortionType.multiplier;
      portionTypeName = currentPortionType.name;
    }
  }

  // Update portion label
  const portionLabel = nutritionContainer.querySelector('.nutrition-portion-label');
  if (portionLabel) {
    portionLabel.textContent = portionTypeName;
  }

  // Update all nutrition values
  nutritionContainer.querySelectorAll('.nutrition-row').forEach(row => {
    const amountEl = row.querySelector('.nutrition-amount');
    if (amountEl) {
      const baseAmount = parseFloat(row.dataset.base) || 0;
      amountEl.textContent = formatNutritionValue(baseAmount * portionMultiplier);
    }
  });
}

function initNutrition() {
  // Initial update
  updateNutrition();

  // Listen for changes on ingredients container
  const ingredientsContainer = document.querySelector('.ingredients-container');
  if (ingredientsContainer) {
    // Watch for portion type changes
    const portionTypeSelect = ingredientsContainer.querySelector('.portion-type-select');
    if (portionTypeSelect) {
      portionTypeSelect.addEventListener('change', updateNutrition);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNutrition);
} else {
  initNutrition();
}
