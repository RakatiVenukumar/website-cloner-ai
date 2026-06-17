import os
import re
import logging
import urllib.parse
from playwright.async_api import async_playwright
import httpx

logger = logging.getLogger("scraper")

class WebsiteScraper:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        self.assets_dir = os.path.join(self.output_dir, "assets")
        self.images_dir = os.path.join(self.assets_dir, "images")
        self.css_dir = os.path.join(self.assets_dir, "css")
        self.js_dir = os.path.join(self.assets_dir, "js")
        
        # Ensure target subdirectories exist
        os.makedirs(self.images_dir, exist_ok=True)
        os.makedirs(self.css_dir, exist_ok=True)
        os.makedirs(self.js_dir, exist_ok=True)

    async def _download_asset(self, url: str, dest_path: str):
        """Downloads an asset from URL to local destination path."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=10.0, follow_redirects=True)
                if response.status_code == 200:
                    with open(dest_path, "wb") as f:
                        f.write(response.content)
                    return True
        except Exception as e:
            logger.warning(f"Failed to download asset {url}: {str(e)}")
        return False

    async def clone_website(self, url: str) -> dict:
        """
        Clones website contents using Playwright.
        Saves index.html and assets in output_dir.
        """
        logger.info(f"Cloning website: {url}")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = await context.new_page()
            
            # Navigate to the target website
            try:
                await page.goto(url, wait_until="networkidle", timeout=30000)
            except Exception as e:
                logger.warning(f"Networkidle wait timed out, continuing: {str(e)}")
                # Try waiting for load event as fallback
                try:
                    await page.goto(url, wait_until="load", timeout=15000)
                except Exception as e_inner:
                    raise Exception(f"Failed to load URL {url}: {str(e_inner)}")
            
            # Extract basic metadata
            title = await page.title()
            
            # Fetch hydrated page HTML
            html_content = await page.content()
            
            # Locate all images, stylesheets, and script URLs to replace/download
            # We'll use BeautifulSoup or simple regex to find assets and replace them.
            # A simple BeautifulSoup approach is cleaner. Let's write resource parser.
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html_content, "html.parser")
            
            # 1. Download stylesheets
            css_files = []
            for link in soup.find_all("link", rel="stylesheet"):
                href = link.get("href")
                if href:
                    abs_href = urllib.parse.urljoin(url, href)
                    filename = os.path.basename(urllib.parse.urlparse(abs_href).path) or "style.css"
                    # Append hash to prevent collisions
                    filename = f"{hash(abs_href) & 0xffffffff}_{filename}"
                    if not filename.endswith(".css"):
                        filename += ".css"
                    
                    local_path = os.path.join(self.css_dir, filename)
                    relative_path = f"assets/css/{filename}"
                    
                    success = await self._download_asset(abs_href, local_path)
                    if success:
                        link["href"] = relative_path
                        css_files.append(relative_path)
            
            # 2. Remove all scripts and noscript to prevent runtime logic execution
            for script in soup.find_all(["script", "noscript"]):
                script.decompose()
                
            # Remove preload, prefetch, modulepreload for scripts
            for link in soup.find_all("link"):
                rel_attr = link.get("rel", [])
                if isinstance(rel_attr, str):
                    rel_attr = rel_attr.split()
                if any(r in rel_attr for r in ["modulepreload", "prefetch"]):
                    link.decompose()
                elif "preload" in rel_attr and link.get("as") == "script":
                    link.decompose()
            
            # 3. Download images
            for img in soup.find_all("img"):
                src = img.get("src")
                if src:
                    abs_src = urllib.parse.urljoin(url, src)
                    # Skip data URLs
                    if abs_src.startswith("data:"):
                        continue
                        
                    filename = os.path.basename(urllib.parse.urlparse(abs_src).path) or "image.png"
                    filename = f"{hash(abs_src) & 0xffffffff}_{filename}"
                    
                    local_path = os.path.join(self.images_dir, filename)
                    relative_path = f"assets/images/{filename}"
                    
                    success = await self._download_asset(abs_src, local_path)
                    if success:
                        img["src"] = relative_path
                        
                    # Handle srcset
                    srcset = img.get("srcset")
                    if srcset:
                        # For simple cloning, clear srcset so it defaults to the main src we downloaded
                        del img["srcset"]
            
            # 4. Handle inline style background images
            # Scan for background-image: url(...) in style tags/attributes
            style_tags = soup.find_all("style")
            for tag in style_tags:
                if tag.string:
                    tag.string = await self._process_css_urls(tag.string, url)
                    
            for el in soup.find_all(style=True):
                style_attr = el.get("style")
                if style_attr:
                    processed_style = await self._process_css_urls(style_attr, url)
                    el["style"] = processed_style

            # Save modified HTML
            html_path = os.path.join(self.output_dir, "index.html")
            with open(html_path, "w", encoding="utf-8") as f:
                f.write(str(soup))
                
            await browser.close()
            
            return {
                "html_path": html_path,
                "title": title,
                "css_files": css_files
            }

    async def _process_css_urls(self, css_text: str, base_url: str) -> str:
        """Helper to find url(...) in CSS, download them, and replace with relative paths."""
        url_pattern = re.compile(r'url\([\'"]?(.*?)[\'"]?\)')
        matches = url_pattern.findall(css_text)
        
        for match in matches:
            if match.startswith("data:") or match.startswith("http://localhost") or match.startswith("https://localhost"):
                continue
            abs_url = urllib.parse.urljoin(base_url, match)
            filename = os.path.basename(urllib.parse.urlparse(abs_url).path) or "bg_image.png"
            filename = f"{hash(abs_url) & 0xffffffff}_{filename}"
            local_path = os.path.join(self.images_dir, filename)
            relative_path = f"../images/{filename}" # background is in assets/css/ so go up one directory
            
            success = await self._download_asset(abs_url, local_path)
            if success:
                # Replace url(...) with the relative path
                css_text = css_text.replace(match, relative_path)
                
        return css_text
