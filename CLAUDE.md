# Recipe Collection

This is a Hugo-based recipe collection website using the PaperMod theme.

## Creating Recipes

### Using the Hugo CLI

Create a new recipe with:

```bash
hugo new content recipes/recipe-name.md
```

This uses the archetype at `archetypes/recipes.md`.

### Recipe Structure

Each recipe is a markdown file in `content/recipes/` with this frontmatter:

```toml
+++
date = '2025-12-27'
draft = false
title = 'Recipe Title'
categories = ['Dessert']      # e.g., Dessert, Main Course, Appetizer, Soup, Salad
tags = ['tag1', 'tag2']       # e.g., german, vegetarian, quick, comfort food
prepTime = '10 min'
cookTime = '30 min'

[cover]
image = 'cover.webp'
alt = 'Recipe image description'
+++
```

### Recipe Content Structure

1. **Introduction** - Brief description of the dish
2. **Ingredients** - Use the `ingredients` shortcode
3. **Steps** - Use the `steps` shortcode
4. **Tipps** - Optional tips and variations
5. **Nährwerte** - Optional nutritional info

## Ingredients Shortcode

The ingredients system provides an interactive serving selector that automatically scales amounts and converts units.

### Basic Usage

```markdown
{{</* ingredients servings="4" */>}}
{{</* ingredient amount="250" unit="g" name="Flour" */>}}
{{</* ingredient amount="200" unit="ml" name="Milk" */>}}
{{</* /ingredients */>}}
```

### Ingredients Wrapper Parameters

| Parameter  | Required | Default   | Description                      |
|------------|----------|-----------|----------------------------------|
| `servings` | No       | 4         | Base number of servings          |
| `title`    | No       | "Zutaten" | Section heading                  |

### Ingredient Parameters

| Parameter  | Required | Default        | Description                                           |
|------------|----------|----------------|-------------------------------------------------------|
| `amount`   | No       | 0              | Linear amount (scales with portions)                  |
| `constant` | No       | 0              | Constant amount (does not scale)                      |
| `unit`     | No       | ""             | Unit of measurement (g, ml, kg, L, etc.)              |
| `name`     | Yes      | -              | Ingredient name (singular form)                       |
| `plural`   | No       | name           | Plural form of the name                               |
| `id`       | No       | urlized name   | Unique identifier for referencing in steps            |
| `note`     | No       | ""             | Additional info (e.g., "room temperature", "diced")   |
| `optional` | No       | false          | Mark ingredient as optional                           |

### Amount Formula

Amounts are calculated using: `total = amount × ratio + constant`

- `amount` - scales with portion count and type
- `constant` - fixed amount (e.g., "1 Prise Salz" regardless of portions)

### Examples

```markdown
{{</* ingredients servings="4" */>}}
{{</* ingredient amount="500" unit="g" name="Mehl" */>}}
{{</* ingredient amount="250" unit="ml" name="Milch" */>}}
{{</* ingredient amount="2" name="Ei" plural="Eier" */>}}
{{</* ingredient amount="100" unit="g" name="Butter" note="zimmerwarm" */>}}
{{</* ingredient constant="1" name="Prise Salz" plural="Prisen Salz" */>}}
{{</* ingredient amount="50" unit="g" name="Parmesan" optional="true" */>}}
{{</* /ingredients */>}}
```

## Ingredient Alternatives

Use `ingredient-choice` to offer alternative ingredients:

```markdown
{{</* ingredient-choice id="suesse" */>}}
  {{</* option amount="40" unit="g" name="Zucker" default="true" */>}}
  {{</* option amount="40" unit="g" name="Agavendicksaft" */>}}
{{</* /ingredient-choice */>}}
```

### ingredient-choice Parameters

| Parameter  | Required | Default | Description                    |
|------------|----------|---------|--------------------------------|
| `id`       | Yes      | -       | Unique identifier              |
| `note`     | No       | ""      | Additional info                |
| `optional` | No       | false   | Mark as optional               |

### option Parameters

| Parameter  | Required | Default | Description                    |
|------------|----------|---------|--------------------------------|
| `amount`   | No       | 0       | Linear amount                  |
| `constant` | No       | 0       | Constant amount                |
| `unit`     | No       | ""      | Unit of measurement            |
| `name`     | Yes      | -       | Ingredient name (singular)     |
| `plural`   | No       | name    | Plural form                    |
| `default`  | No       | false   | Set to "true" for default      |

## Portion Types

Define different portion types with multipliers:

```markdown
{{</* ingredients servings="4" */>}}
{{</* portiontype name="Hauptgericht" plural="Hauptgerichte" multiplier="1" default="true" */>}}
{{</* portiontype name="Nachtisch" plural="Nachtische" multiplier="0.66" */>}}
...
{{</* /ingredients */>}}
```

### Portiontype Parameters

| Parameter    | Required | Default | Description                                    |
|--------------|----------|---------|------------------------------------------------|
| `name`       | Yes      | -       | Singular name (shown when count = 1)           |
| `plural`     | Yes      | name    | Plural name (shown when count > 1)             |
| `multiplier` | No       | 1       | Amount multiplier for this portion type        |
| `default`    | No       | false   | Set to "true" for the default selection        |

## Steps Shortcode

Use structured steps with auto-numbering and ingredient references:

```markdown
{{</* steps */>}}
{{</* step */>}}
{{</* use id="butter" */>}} in einem Topf erhitzen.
{{</* /step */>}}
{{</* step */>}}
{{</* use id="mehl" */>}} hinzugeben und umrühren.
{{</* /step */>}}
{{</* step image="step3.jpg" */>}}
Goldbraun backen.
{{</* /step */>}}
{{</* /steps */>}}
```

### step Parameters

| Parameter | Required | Default | Description                    |
|-----------|----------|---------|--------------------------------|
| `image`   | No       | ""      | Optional step image path       |

### use Shortcode

Reference ingredients in steps with automatic amount calculation:

```markdown
{{</* use id="butter" */>}}          <!-- All of the butter -->
{{</* use id="butter" m="0.5" */>}}  <!-- Half of the butter -->
{{</* use id="salz" m="0" b="1" */>}} <!-- Exactly 1 (constant) -->
```

### use Parameters

| Parameter | Required | Default | Description                                      |
|-----------|----------|---------|--------------------------------------------------|
| `id`      | Yes      | -       | Ingredient ID to reference                       |
| `m`       | No       | 1       | Multiplier for ingredient amount                 |
| `b`       | No       | 0       | Constant to add                                  |

The formula is: `useAmount = m × ingredientAmount + b`

Examples:
- `m="1" b="0"` - Use all of the ingredient (default)
- `m="0.5" b="0"` - Use half
- `m="0" b="2"` - Use exactly 2 (ignores scaling)

## Unit Conversions

The system automatically converts units when scaling:

| From   | Converts to | Threshold |
|--------|-------------|-----------|
| g      | kg          | >= 1000g  |
| mg     | g           | >= 1000mg |
| ml     | L           | >= 1000ml |
| cl     | L           | >= 100cl  |

Reverse conversions also work (e.g., 0.5 kg displays as 500 g).

## Nutrition Shortcode

Display a German-style nutrition table (Nährwerttabelle) that updates dynamically based on portion type:

```markdown
{{</* nutrition
  kj="850"
  kcal="200"
  fat="8"
  saturated="5"
  carbs="28"
  sugar="12"
  fiber="0.5"
  protein="5"
  salt="0.2"
*/>}}
```

### Nutrition Parameters

All parameters are optional. Values are per serving at the base portion type.

| Parameter   | Description                          |
|-------------|--------------------------------------|
| `title`     | Section heading (default: "Nährwerte") |
| `kj`        | Energy in kilojoules                 |
| `kcal`      | Energy in kilocalories               |
| `fat`       | Fat in grams                         |
| `saturated` | Saturated fat in grams               |
| `carbs`     | Carbohydrates in grams               |
| `sugar`     | Sugar in grams                       |
| `fiber`     | Fiber in grams                       |
| `protein`   | Protein in grams                     |
| `salt`      | Salt in grams                        |

### Dynamic Updates

The nutrition table automatically updates when the portion type changes:
- Values are multiplied by the portion type's multiplier
- The portion label updates to show the current type name

### Example

For a recipe with two portion types:
```markdown
{{</* ingredients servings="4" */>}}
{{</* portiontype name="Nachtisch" plural="Nachtische" multiplier="1" default="true" */>}}
{{</* portiontype name="Hauptgericht" plural="Hauptgerichte" multiplier="1.5" */>}}
...
{{</* /ingredients */>}}

{{</* nutrition kj="850" kcal="200" fat="8" carbs="28" sugar="12" protein="5" salt="0.2" */>}}
```

When "Nachtisch" is selected: 200 kcal per portion
When "Hauptgericht" is selected: 300 kcal per portion (200 × 1.5)

## LocalStorage

User selections are automatically saved per recipe:
- Serving count
- Portion type
- Ingredient alternatives

## Development

### Local Preview

```bash
hugo server -D
```

Opens at http://localhost:1313

### Build

```bash
hugo
```

Output goes to `public/`

## File Structure

```
.
├── archetypes/
│   └── recipes.md              # Template for new recipes
├── assets/
│   ├── css/
│   │   ├── ingredients.css     # Styling for ingredients and steps
│   │   └── nutrition.css       # Styling for nutrition table
│   └── js/
│       ├── ingredients.js      # Interactive functionality
│       └── nutrition.js        # Nutrition table updates
├── content/
│   └── recipes/                # Recipe page bundles
│       └── recipe-name/
│           ├── index.md        # Recipe content
│           └── cover.webp      # Cover image
├── layouts/
│   ├── partials/
│   │   └── extend_head.html    # Includes CSS/JS
│   └── shortcodes/
│       ├── ingredient.html     # Single ingredient
│       ├── ingredient-choice.html  # Alternative ingredients
│       ├── ingredients.html    # Wrapper with selector
│       ├── nutrition.html      # Nutrition table
│       ├── option.html         # Option for ingredient-choice
│       ├── portiontype.html    # Portion type definition
│       ├── step.html           # Single step
│       ├── steps.html          # Steps wrapper
│       └── use.html            # Ingredient reference in steps
└── hugo.toml                   # Site configuration
```
