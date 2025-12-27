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
servings = '4'
+++
```

### Recipe Content Structure

1. **Introduction** - Brief description of the dish
2. **Ingredients** - Use the `ingredients` shortcode (see below)
3. **Zubereitung/Instructions** - Numbered steps
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

| Parameter  | Required | Default    | Description                                           |
|------------|----------|------------|-------------------------------------------------------|
| `amount`   | No       | 0          | Numeric amount (use base unit, e.g., 1000 for 1L)     |
| `unit`     | No       | ""         | Unit of measurement (g, ml, kg, L, etc.)              |
| `name`     | Yes      | -          | Ingredient name (singular form)                       |
| `plural`   | No       | name       | Plural form of the name                               |
| `note`     | No       | ""         | Additional info (e.g., "room temperature", "diced")   |
| `optional` | No       | false      | Mark ingredient as optional                           |
| `scalable` | No       | "true"     | Set to "false" for items that don't scale (e.g., salt)|

### Examples

```markdown
{{</* ingredients servings="4" */>}}
{{</* ingredient amount="500" unit="g" name="Mehl" */>}}
{{</* ingredient amount="250" unit="ml" name="Milch" */>}}
{{</* ingredient amount="2" name="Ei" plural="Eier" */>}}
{{</* ingredient amount="100" unit="g" name="Butter" note="zimmerwarm" */>}}
{{</* ingredient amount="1" name="Prise Salz" plural="Prisen Salz" scalable="false" */>}}
{{</* ingredient amount="50" unit="g" name="Parmesan" optional="true" */>}}
{{</* /ingredients */>}}
```

### Unit Conversions

The system automatically converts units when scaling:

| From   | Converts to | Threshold |
|--------|-------------|-----------|
| g      | kg          | >= 1000g  |
| mg     | g           | >= 1000mg |
| ml     | L           | >= 1000ml |
| cl     | L           | >= 100cl  |

Reverse conversions also work (e.g., 0.5 kg displays as 500 g).

### Tips for Using Ingredients

1. **Use base units**: Enter `1000` ml instead of `1` L - the system converts automatically
2. **Singular/Plural**: Always provide `plural` for items where it differs (Ei/Eier)
3. **Non-scaling items**: Use `scalable="false"` for things like "1 Prise Salz"
4. **Notes**: Use `note` for preparation state (gehackt, gewürfelt, zimmerwarm)

## Portion Types

Recipes can define different portion types (e.g., "Nachtisch" vs "Hauptgericht") with different multipliers. This allows users to select how they want to serve the dish.

### Portiontype Shortcode

Add `portiontype` entries inside the `ingredients` block to define available portion types:

```markdown
{{</* ingredients servings="4" */>}}
{{</* portiontype name="Nachtisch" plural="Nachtische" multiplier="1" default="true" */>}}
{{</* portiontype name="Hauptgericht" plural="Hauptgerichte" multiplier="1.5" */>}}
{{</* ingredient amount="250" unit="g" name="Reis" */>}}
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

### How It Works

- A dropdown appears before the serving count when portion types are defined
- Selecting a portion type applies its multiplier to all scalable ingredients
- The label after the number shows the correct singular/plural form
- Example: "4 Nachtische" or "1 Hauptgericht"

### Example Use Cases

**Milchreis (Rice Pudding):**
- As dessert (Nachtisch): multiplier 1.0
- As main course (Hauptgericht): multiplier 1.5

**Salad:**
- As side dish (Beilage): multiplier 1.0
- As main course (Hauptgericht): multiplier 2.0

**Soup:**
- As starter (Vorspeise): multiplier 0.5
- As main course (Hauptgericht): multiplier 1.0

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
│   └── recipes.md          # Template for new recipes
├── assets/
│   ├── css/
│   │   └── ingredients.css # Ingredient styling
│   └── js/
│       └── ingredients.js  # Serving selector logic
├── content/
│   └── recipes/            # Recipe markdown files
├── layouts/
│   ├── partials/
│   │   └── extend_head.html # Includes CSS/JS
│   └── shortcodes/
│       ├── ingredient.html   # Single ingredient
│       ├── ingredients.html  # Wrapper with selector
│       └── portiontype.html  # Portion type definition
└── hugo.toml               # Site configuration
```
