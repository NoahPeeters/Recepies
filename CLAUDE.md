# Recipe Collection

This is a Hugo-based recipe collection website using the PaperMod theme.

## Adding a New Recipe (Step-by-Step)

### Step 1: Create the Recipe Folder

Create a new folder in `content/recipes/` with the recipe name (lowercase, hyphens):

```bash
mkdir content/recipes/recipe-name
```

### Step 2: Add Cover Image

Add a cover image to the recipe folder. Convert to WebP format for best performance:

```bash
cwebp -q 80 source-image.jpg -o content/recipes/recipe-name/cover.webp
```

### Step 3: Check Global Ingredients

**Ingredients are organized hierarchically** in `data/ingredients/` based on Posthof product categories. The folder structure is:

```
data/ingredients/
├── category_index.yaml    # Full category hierarchy reference
├── 01/                    # Frische (1000000)
│   ├── 14/                # Mopro (1140000)
│   │   ├── 01.yaml        # Milch (1140100)
│   │   └── 07.yaml        # Butter (1140700)
│   └── ...
├── 02/                    # Trocken (2000000)
│   ├── 13/                # Backzutaten (2130000)
│   │   ├── 01.yaml        # Zucker (2130100)
│   │   └── ...
│   └── ...
└── 08/                    # Obst, Gemüse (8000000)
    └── 23/                # Pilze (8230000)
        └── 02.yaml        # Kultur-, Speisepilze (8230200)
```

**Reference format**: `{category_id}.{ingredient_key}` (e.g., `8230201.champignons`)

**First, check if the ingredient already exists** by searching the appropriate category file. Use `category_index.yaml` to find the right category.

### Step 3b: Search Posthof Products

For new ingredients, search the Posthof Food Coop database for matching products. Use the MCP tool `mcp__posthof__getProductsTable` with a search query:

```
searchQuery: "Mehl"
```

This returns product IDs, names, prices, and package sizes.

### Step 3c: Add New Ingredients

1. Find the appropriate category ID from `category_index.yaml`
2. Locate the file: category `8230201` → `data/ingredients/08/23/02.yaml`
3. Add the ingredient with the full reference key:

```yaml
# In data/ingredients/08/23/02.yaml
8230201.champignons:
  name: Champignon
  plural: Champignons
  unit: g
  posthof:
    - id: 12345
      unit: 250
  altUnits:
    Stück: 20
  alternatives:                        # optional, auto-creates ingredient choice
    - ref: 8230202.austernpilze        # reference to another ingredient
      factor: 1.0                      # amount multiplier
```

### Global Alternatives

When an ingredient has `alternatives` defined, it automatically renders as an ingredient choice dropdown.

Example in `data/ingredients/02/13/01.yaml`:
```yaml
2130100.zucker:
  name: Zucker
  unit: g
  posthof:
    - id: 50118
      unit: 1000
  alternatives:
    - ref: 2130200.agavendicksaft
      factor: 1.0
    - ref: 2020500.honig
      factor: 0.8
```

When a recipe uses `{{</* ingredient ref="2130100.zucker" amount="100" */>}}`:
- Zucker (100g) - default option
- Agavendicksaft (100g × 1.0 = 100g) - alternative
- Honig (100g × 0.8 = 80g) - alternative

Notes:
- Alternatives are NOT applied recursively (alternatives of alternatives are ignored)
- For `ingredient-choice`, global alternatives are not merged (use manual options)

### Step 4: Check Taxonomy Images

Before creating a recipe, verify that all taxonomy values you'll use have cover images. Check each taxonomy folder:

```bash
ls content/cuisines/
ls content/categories/
ls content/proteins/
ls content/diets/
ls content/methods/
```

For each taxonomy value in your recipe (e.g., `cuisines = ['Deutsch']`), ensure a folder exists with a cover image:

```
content/cuisines/deutsch/
├── _index.md
└── cover.webp
```

If the folder or image is missing, create the folder and download an image:

```bash
# Create folder and _index.md
mkdir -p content/cuisines/neu
echo -e '---\ntitle: "Neu"\n---' > content/cuisines/neu/_index.md

# Download cover image from Unsplash
./scripts/unsplash-image.py download "search term" content/cuisines/neu/cover.webp
```

See [Finding Images on Unsplash](#finding-images-on-unsplash) for more details.

### Step 5: Write the Recipe

Create `content/recipes/recipe-name/index.md`:

```markdown
+++
date = '2025-12-28'
draft = false
title = 'Recipe Title'
categories = ['Dessert']
cuisines = ['Deutsch']
proteins = ['Vegetarisch']
diets = ['Vegetarisch']
methods = ['Backen']
prepTime = 15
cookTime = 30

[cover]
image = 'cover.webp'
alt = 'Description of the dish'
+++

Brief introduction to the dish.

{{</* recipeinfo */>}}

{{</* ingredients servings="4" */>}}
{{</* ingredient ref="1140700.butter" amount="100" */>}}
{{</* ingredient ref="2130100.zucker" amount="50" id="zucker" */>}}
{{</* ingredient ref="1180100.ei" amount="2" */>}}
{{</* /ingredients */>}}

{{</* steps */>}}

{{</* step */>}}
{{</* use id="butter" */>}} schmelzen und {{</* use id="zucker" */>}} einrühren.
{{</* /step */>}}

{{</* step */>}}
Next step instructions...
{{</* /step */>}}

{{</* /steps */>}}

## Tipps

- Optional tips and variations

{{</* nutrition kj="850" fat="8" carbs="28" protein="5" */>}}
```

### Step 6: Using Ingredients

Reference global ingredients with `ref` using the format `{category_id}.{key}`:
```markdown
{{</* ingredient ref="1140700.butter" amount="100" */>}}
```
- Uses `ref` to reference the global definition in `data/ingredients/{l1}/{l2}/{l3}.yaml`
- Inherits name, unit, posthof, altUnits automatically
- Use `id` parameter if the same ingredient appears multiple times

### Step 7: Ingredient Sections

Group ingredients with section headers:

```markdown
{{</* ingredients servings="4" */>}}
{{</* ingredient-section "Teig" */>}}
{{</* ingredient ref="2040202.mehl" amount="500" */>}}
{{</* ingredient ref="1140700.butter" amount="100" id="butter-teig" */>}}
{{</* ingredient-section "Füllung" */>}}
{{</* ingredient ref="2130100.zucker" amount="200" */>}}
{{</* ingredient ref="1140700.butter" amount="50" id="butter-fuellung" */>}}
{{</* /ingredients */>}}
```

---

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
| `note`     | No       | ""             | Preparation info (e.g., "zimmerwarm", "gewürfelt"). **NEVER for amounts** - use `altUnits` instead! |
| `optional` | No       | false          | Mark ingredient as optional                           |
| `posthof`  | No       | ""             | Posthof Food Coop products (see Posthof Integration)  |

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

| Parameter  | Required | Default | Description                                          |
|------------|----------|---------|------------------------------------------------------|
| `amount`   | No       | 0       | Linear amount                                        |
| `constant` | No       | 0       | Constant amount                                      |
| `unit`     | No       | ""      | Unit of measurement                                  |
| `name`     | Yes      | -       | Ingredient name (singular)                           |
| `plural`   | No       | name    | Plural form                                          |
| `default`  | No       | false   | Set to "true" for default                            |
| `posthof`  | No       | ""      | Posthof Food Coop products (see Posthof Integration) |

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

{{</* nutrition kj="850" fat="8" carbs="28" sugar="12" protein="5" salt="0.2" */>}}
```

When "Nachtisch" is selected: 850 kJ per portion
When "Hauptgericht" is selected: 1275 kJ per portion (850 × 1.5)

## LocalStorage

User selections are automatically saved per recipe:
- Serving count
- Portion type
- Ingredient alternatives

## Posthof Food Coop Integration

Ingredients can link to products from the Posthof Food Coop. The integration shows product images, stock status, and calculated prices.

### Parameter Format

The `posthof` parameter accepts a comma-separated list of products in the format `id:amount`:

```
posthof="47293:500"              # Single product, 500g per unit
posthof="47293:500,47294:1000"   # Multiple products (first in stock is used)
posthof="50225"                  # Product without amount (shows base price)
```

### Format Explanation

| Format           | Description                                           |
|------------------|-------------------------------------------------------|
| `id:amount`      | Product ID with unit size for price calculation       |
| `id`             | Product ID only (displays base product price)         |
| `id:a,id:a,...`  | Multiple products; first in-stock product is shown    |

### Price Calculation

When `amount` is specified, the price is calculated based on the ingredient amount:

```
displayPrice = (ingredientAmount / productUnitAmount) × productPrice
```

Example: If a product costs 2€ per 500g package, and you need 250g:
```
displayPrice = (250 / 500) × 200 cents = 100 cents = 1€
```

### Examples

```markdown
{{</* ingredient amount="250" unit="g" name="Milchreis" posthof="47293:500" */>}}
{{</* option amount="4" name="Tropfen Vanilleextrakt" posthof="50225" */>}}
```

## Taxonomy Cover Images

Taxonomy terms (cuisines, categories, etc.) can have cover images displayed as card backgrounds.

### Folder Structure

Each taxonomy term with an image needs to be a folder with `_index.md` and `cover.webp`:

```
content/cuisines/deutsch/
├── _index.md
└── cover.webp
```

The `_index.md` contains:
```yaml
---
title: "Deutsch"
description: "Traditionelle deutsche Küche"
---
```

### Finding Images on Unsplash

Unsplash provides free images. Use the helper script to search and download:

#### Using the Script (Recommended)

```bash
# Search for images by keyword
./scripts/unsplash-image.py search schnitzel

# Search with more results
./scripts/unsplash-image.py search curry --limit 10

# Download first result directly to WebP
./scripts/unsplash-image.py download pasta content/cuisines/italienisch/cover.webp

# Download a specific URL
./scripts/unsplash-image.py download --url "https://images.unsplash.com/photo-xxx" output.webp
```

#### Manual Method (curl)

1. **Search by topic**:
   ```bash
   curl -s "https://unsplash.com/napi/search/photos?query=curry&per_page=5" | \
     python3 -c "import sys,json; d=json.load(sys.stdin); [print(r['urls']['raw'].split('?')[0] + '?w=800&q=80') for r in d['results'][:5]]"
   ```

2. **Download and convert**:
   ```bash
   curl -L -o /tmp/image.jpg "https://images.unsplash.com/photo-PHOTO_ID?w=800&q=80"
   cwebp -q 80 /tmp/image.jpg -o content/cuisines/deutsch/cover.webp
   ```

#### Known Working Photo IDs

- Schnitzel: `photo-1599921841143-819065a55cc6`
- Burger: `photo-1568901346375-23c9450c58cd`
- Curry/Indian: `photo-1585937421612-70a008356fbe`
- Meatballs/Nordic: `photo-1529042410759-befb1204b468`

### Image Guidelines

- Use landscape orientation (wider than tall)
- Food images work best with the gradient overlay
- Aim for ~800px width for good quality without large file sizes
- WebP format provides best compression

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
├── data/
│   └── ingredients/            # Hierarchical ingredient definitions
│       ├── category_index.yaml # Full category hierarchy
│       ├── 01/                 # Frische (1000000)
│       │   └── 14/             # Mopro (1140000)
│       │       └── 01.yaml     # Milch (1140100) - contains 1140100.milch
│       ├── 02/                 # Trocken (2000000)
│       └── 08/                 # Obst, Gemüse (8000000)
│           └── 23/             # Pilze (8230000)
│               └── 02.yaml     # Kultur-Speisepilze - contains 8230201.champignons
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
