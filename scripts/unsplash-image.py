#!/usr/bin/env python3
"""
Search and download images from Unsplash by keyword.

Usage:
    ./scripts/unsplash-image.py search <keyword> [--limit N]
    ./scripts/unsplash-image.py download <keyword> <output_path>
    ./scripts/unsplash-image.py download --url <url> <output_path>

Examples:
    # Search for schnitzel images
    ./scripts/unsplash-image.py search schnitzel

    # Search with more results
    ./scripts/unsplash-image.py search curry --limit 10

    # Download first result for "pasta" to a taxonomy folder
    ./scripts/unsplash-image.py download pasta content/cuisines/italienisch/cover.webp

    # Download a specific URL
    ./scripts/unsplash-image.py download --url "https://images.unsplash.com/photo-xxx" /tmp/image.webp
"""

import argparse
import json
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path


UNSPLASH_SEARCH_URL = "https://unsplash.com/napi/search/photos"


def search_images(keyword: str, limit: int = 5) -> list[dict]:
    """Search Unsplash for images matching keyword."""
    encoded_keyword = urllib.parse.quote(keyword)
    url = f"{UNSPLASH_SEARCH_URL}?query={encoded_keyword}&per_page={limit}"

    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching from Unsplash: {e}", file=sys.stderr)
        sys.exit(1)

    results = []
    for item in data.get("results", [])[:limit]:
        raw_url = item.get("urls", {}).get("raw", "")
        if raw_url:
            # Strip query params and add our preferred size
            base_url = raw_url.split("?")[0]
            results.append({
                "id": item.get("id"),
                "url": f"{base_url}?w=800&q=80",
                "description": item.get("description") or item.get("alt_description") or "No description",
                "photographer": item.get("user", {}).get("name", "Unknown"),
            })

    return results


def download_image(url: str, output_path: Path) -> bool:
    """Download image from URL and convert to WebP if needed."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Download to temp file
    temp_path = Path("/tmp/unsplash_download.jpg")

    try:
        print(f"Downloading from {url}...")
        urllib.request.urlretrieve(url, temp_path)
    except Exception as e:
        print(f"Error downloading image: {e}", file=sys.stderr)
        return False

    # Convert to WebP if output is .webp
    if output_path.suffix.lower() == ".webp":
        try:
            result = subprocess.run(
                ["cwebp", "-q", "80", str(temp_path), "-o", str(output_path)],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                print(f"Error converting to WebP: {result.stderr}", file=sys.stderr)
                print("Make sure cwebp is installed (brew install webp)", file=sys.stderr)
                return False
            temp_path.unlink()  # Clean up temp file
        except FileNotFoundError:
            print("cwebp not found. Install with: brew install webp", file=sys.stderr)
            return False
    else:
        # Just move/copy the file
        temp_path.rename(output_path)

    print(f"Saved to {output_path}")
    return True


def cmd_search(args):
    """Handle search command."""
    results = search_images(args.keyword, args.limit)

    if not results:
        print(f"No images found for '{args.keyword}'", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(results)} images for '{args.keyword}':\n")

    for i, img in enumerate(results, 1):
        print(f"{i}. {img['description'][:60]}...")
        print(f"   Photographer: {img['photographer']}")
        print(f"   URL: {img['url']}")
        print()


def cmd_download(args):
    """Handle download command."""
    if args.url:
        url = args.url
    else:
        results = search_images(args.keyword, 1)
        if not results:
            print(f"No images found for '{args.keyword}'", file=sys.stderr)
            sys.exit(1)
        url = results[0]["url"]
        print(f"Using first result: {results[0]['description'][:60]}...")

    success = download_image(url, args.output)
    sys.exit(0 if success else 1)


def main():
    parser = argparse.ArgumentParser(
        description="Search and download images from Unsplash",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Search command
    search_parser = subparsers.add_parser("search", help="Search for images")
    search_parser.add_argument("keyword", help="Search keyword")
    search_parser.add_argument("--limit", "-n", type=int, default=5, help="Number of results (default: 5)")
    search_parser.set_defaults(func=cmd_search)

    # Download command
    download_parser = subparsers.add_parser("download", help="Download an image")
    download_parser.add_argument("keyword", nargs="?", help="Search keyword (uses first result)")
    download_parser.add_argument("output", type=Path, help="Output file path (.webp recommended)")
    download_parser.add_argument("--url", "-u", help="Direct URL to download (skips search)")
    download_parser.set_defaults(func=cmd_download)

    args = parser.parse_args()

    if args.command == "download" and not args.url and not args.keyword:
        parser.error("Either keyword or --url is required for download")

    args.func(args)


if __name__ == "__main__":
    main()
