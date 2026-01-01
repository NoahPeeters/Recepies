#!/usr/bin/env python3
"""
Lint script for recipe validation:
- Verifies ingredient refs point to valid ingredients in data files
- Checks that use shortcodes reference defined ingredients
- Validates that all taxonomy values have cover images
"""

import os
import re
import sys
from pathlib import Path


def parse_yaml_keys(content: str) -> set[str]:
    """Extract top-level keys from YAML content (simple parser)."""
    keys = set()
    for line in content.split('\n'):
        # Match lines that start with a key (no leading whitespace)
        match = re.match(r'^(\d+\.[a-z0-9-]+):', line)
        if match:
            keys.add(match.group(1))
    return keys


def parse_alternative_refs(content: str) -> list[str]:
    """Extract alternative refs from YAML content."""
    refs = []
    for match in re.finditer(r'ref:\s*(\d+\.[a-z0-9-]+)', content):
        refs.append(match.group(1))
    return refs


def get_file_path_for_ref(ref: str, data_dir: Path) -> Path | None:
    """Convert ref like '8230201.champignons' to file path."""
    parts = ref.split('.')
    if len(parts) != 2:
        return None

    try:
        cat_id = int(parts[0])
    except ValueError:
        return None

    l1 = cat_id // 1000000
    l2 = (cat_id // 10000) % 100
    l3 = (cat_id // 100) % 100

    return data_dir / f"{l1:02d}" / f"{l2:02d}" / f"{l3:02d}.yaml"


def get_expected_path_parts(cat_id: int) -> tuple[str, str, str]:
    """Get expected l1/l2/l3 path parts from category ID."""
    l1 = cat_id // 1000000
    l2 = (cat_id // 10000) % 100
    l3 = (cat_id // 100) % 100
    return f"{l1:02d}", f"{l2:02d}", f"{l3:02d}"


def load_all_ingredients(data_dir: Path) -> tuple[set[str], list[tuple[Path, str, str]], list[tuple[Path, str]]]:
    """
    Load all valid ingredient refs from data files.
    Returns (valid_ingredients, misplaced_errors, alternative_refs).
    """
    ingredients = set()
    misplaced = []
    alternative_refs = []

    for yaml_file in data_dir.rglob("*.yaml"):
        if yaml_file.name == "category_index.yaml":
            continue

        try:
            content = yaml_file.read_text(encoding='utf-8')
            keys = parse_yaml_keys(content)

            # Get actual path parts from file location
            rel_path = yaml_file.relative_to(data_dir)
            parts = rel_path.parts
            if len(parts) != 3:
                continue

            actual_l1, actual_l2, actual_l3 = parts[0], parts[1], parts[2].replace('.yaml', '')

            for key in keys:
                ingredients.add(key)

                # Verify key belongs in this file
                key_parts = key.split('.')
                if len(key_parts) == 2:
                    try:
                        cat_id = int(key_parts[0])
                        expected_l1, expected_l2, expected_l3 = get_expected_path_parts(cat_id)

                        if (actual_l1, actual_l2, actual_l3) != (expected_l1, expected_l2, expected_l3):
                            expected_path = f"{expected_l1}/{expected_l2}/{expected_l3}.yaml"
                            misplaced.append((yaml_file, key, expected_path))
                    except ValueError:
                        pass

            # Collect alternative refs for later validation
            alt_refs = parse_alternative_refs(content)
            for ref in alt_refs:
                alternative_refs.append((yaml_file, ref))

        except Exception as e:
            print(f"Warning: Could not read {yaml_file}: {e}", file=sys.stderr)

    return ingredients, misplaced, alternative_refs


def find_refs_in_file(filepath: Path) -> list[tuple[int, str]]:
    """Find all ingredient refs in a markdown file."""
    refs = []
    content = filepath.read_text(encoding='utf-8')

    # Match ref="..." in shortcodes
    for i, line in enumerate(content.split('\n'), 1):
        for match in re.finditer(r'ref="([^"]+)"', line):
            refs.append((i, match.group(1)))

    return refs


TAXONOMIES = ["cuisines", "categories", "proteins", "diets", "methods", "carbs"]


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug."""
    text = text.lower()
    replacements = {
        "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss",
        "Ä": "ae", "Ö": "oe", "Ü": "ue"
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    return text.strip('-')


def extract_taxonomy_values(recipe_path: Path) -> dict[str, set[str]]:
    """Extract taxonomy values from a recipe's frontmatter."""
    content = recipe_path.read_text(encoding='utf-8')

    match = re.search(r'\+\+\+(.+?)\+\+\+', content, re.DOTALL)
    if not match:
        return {}

    frontmatter = match.group(1)
    values = {tax: set() for tax in TAXONOMIES}

    for taxonomy in TAXONOMIES:
        pattern = rf"{taxonomy}\s*=\s*\[([^\]]+)\]"
        match = re.search(pattern, frontmatter)
        if match:
            items = re.findall(r"'([^']+)'", match.group(1))
            values[taxonomy].update(items)

    return values


def check_taxonomy_images(content_dir: Path) -> list[tuple[str, str, str, Path]]:
    """
    Check all taxonomy values used in recipes have cover images.
    Returns list of (taxonomy, value, slug, expected_path) for missing images.
    """
    recipes_dir = content_dir / "recipes"
    all_values = {tax: set() for tax in TAXONOMIES}

    # Collect all taxonomy values from recipes
    for recipe_dir in recipes_dir.iterdir():
        if not recipe_dir.is_dir():
            continue
        index_file = recipe_dir / "index.md"
        if not index_file.exists():
            continue

        values = extract_taxonomy_values(index_file)
        for tax, vals in values.items():
            all_values[tax].update(vals)

    # Check for missing cover images
    missing = []
    for taxonomy, values in all_values.items():
        for value in values:
            slug = slugify(value)
            cover_path = content_dir / taxonomy / slug / "cover.webp"
            if not cover_path.exists():
                missing.append((taxonomy, value, slug, cover_path))

    return missing


def find_use_errors_in_file(filepath: Path, verbose: bool = False) -> list[tuple[int, str]]:
    """
    Find use shortcode errors in a markdown file.
    Returns list of (line_number, use_id) for undefined uses.
    """
    content = filepath.read_text(encoding='utf-8')
    lines = content.split('\n')

    # Collect all defined ingredient IDs
    defined_ids = set()

    for line in lines:
        # Explicit id on ingredient: id="butter-teig"
        for match in re.finditer(r'ingredient[^>]*\s+id="([^"]+)"', line):
            defined_ids.add(match.group(1))

        # Implicit id from ref: ref="1140700.butter" -> id="1140700.butter" (full ref)
        for match in re.finditer(r'ingredient\s+ref="([^"]+)"(?![^>]*\s+id=")', line):
            ref = match.group(1)
            defined_ids.add(ref)

        # ingredient-choice id: ingredient-choice id="suesse"
        for match in re.finditer(r'ingredient-choice\s+id="([^"]+)"', line):
            defined_ids.add(match.group(1))

    if verbose:
        print(f"    Defined IDs: {sorted(defined_ids)}")

    # Find all use references
    errors = []
    for i, line in enumerate(lines, 1):
        for match in re.finditer(r'use\s+id="([^"]+)"', line):
            use_id = match.group(1)
            if use_id not in defined_ids:
                errors.append((i, use_id))
            elif verbose:
                print(f"    Line {i}: use id=\"{use_id}\" ✓")

    return errors


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Lint ingredient references')
    parser.add_argument('-v', '--verbose', action='store_true', help='Show detailed output')
    args = parser.parse_args()

    # Determine paths
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    data_dir = project_dir / "data" / "ingredients"
    content_dir = project_dir / "content" / "recipes"

    if not data_dir.exists():
        print(f"Error: Data directory not found: {data_dir}", file=sys.stderr)
        sys.exit(1)

    if not content_dir.exists():
        print(f"Error: Content directory not found: {content_dir}", file=sys.stderr)
        sys.exit(1)

    # Load all valid ingredients
    print("Loading ingredients...")
    valid_ingredients, misplaced_ingredients, alternative_refs = load_all_ingredients(data_dir)
    print(f"Found {len(valid_ingredients)} ingredients in data files")

    has_errors = False

    # Check for misplaced ingredients
    if misplaced_ingredients:
        has_errors = True
        print(f"\n❌ Found {len(misplaced_ingredients)} misplaced ingredient(s):\n")
        for filepath, key, expected_path in misplaced_ingredients:
            rel_path = filepath.relative_to(project_dir)
            print(f"  {rel_path}")
            print(f"    {key} - should be in data/ingredients/{expected_path}")
            print()

    # Check alternative refs in ingredient files
    invalid_alt_refs = []
    for filepath, ref in alternative_refs:
        if ref not in valid_ingredients:
            invalid_alt_refs.append((filepath, ref))

    if invalid_alt_refs:
        has_errors = True
        print(f"\n❌ Found {len(invalid_alt_refs)} invalid alternative ref(s):\n")
        for filepath, ref in invalid_alt_refs:
            rel_path = filepath.relative_to(project_dir)
            print(f"  {rel_path}")
            print(f"    ref: {ref} - ingredient not found")
            expected_file = get_file_path_for_ref(ref, data_dir)
            if expected_file:
                rel_expected = expected_file.relative_to(project_dir)
                print(f"    Expected in: {rel_expected}")
            print()

    # Check all recipes
    print("Checking recipes...")
    ref_errors = []
    use_errors = []

    for md_file in content_dir.rglob("*.md"):
        relative_path = md_file.relative_to(project_dir)

        if args.verbose:
            print(f"\n  {relative_path}")

        # Check ingredient refs
        refs = find_refs_in_file(md_file)
        for line_num, ref in refs:
            if ref not in valid_ingredients:
                ref_errors.append((relative_path, line_num, ref))

        # Check use shortcodes
        uses = find_use_errors_in_file(md_file, verbose=args.verbose)
        for line_num, use_id in uses:
            use_errors.append((relative_path, line_num, use_id))

    # Report ref errors
    if ref_errors:
        has_errors = True
        print(f"\n❌ Found {len(ref_errors)} invalid ingredient ref(s):\n")
        for filepath, line_num, ref in ref_errors:
            print(f"  {filepath}:{line_num}")
            print(f"    ref=\"{ref}\" - ingredient not found")

            # Suggest where it should be
            expected_file = get_file_path_for_ref(ref, data_dir)
            if expected_file:
                rel_expected = expected_file.relative_to(project_dir)
                print(f"    Expected in: {rel_expected}")
            print()

    # Report use errors
    if use_errors:
        has_errors = True
        print(f"\n❌ Found {len(use_errors)} invalid use shortcode(s):\n")
        for filepath, line_num, use_id in use_errors:
            print(f"  {filepath}:{line_num}")
            print(f"    use id=\"{use_id}\" - no ingredient with this id defined in recipe")
            print()

    # Check taxonomy cover images
    print("Checking taxonomy images...")
    missing_images = check_taxonomy_images(project_dir / "content")

    if missing_images:
        has_errors = True
        print(f"\n❌ Found {len(missing_images)} missing taxonomy cover image(s):\n")
        for taxonomy, value, slug, expected_path in missing_images:
            rel_path = expected_path.relative_to(project_dir)
            print(f"  {taxonomy}/{slug} (\"{value}\")")
            print(f"    Missing: {rel_path}")
            print(f"    Fix: ./scripts/unsplash-image.py download \"{value}\" {rel_path}")
            print()

    if has_errors:
        sys.exit(1)
    else:
        print(f"\n✅ All checks passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()
