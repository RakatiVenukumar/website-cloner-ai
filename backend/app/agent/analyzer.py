import logging
import json
from bs4 import BeautifulSoup
from typing import List, Dict
from openai import OpenAI

logger = logging.getLogger("analyzer")

class WebsiteAnalyzer:
    def __init__(self, api_key: str = ""):
        self.api_key = api_key
        self.client = OpenAI(api_key=api_key) if api_key else None

    async def analyze_layout(self, html_path: str) -> List[Dict]:
        """
        Reads HTML file, extracts text elements, and maps them to structural sections
        using OpenAI (or a heuristic local parser fallback if no API key is provided).
        """
        logger.info(f"Analyzing layout of HTML file: {html_path}")
        
        if not os.path.exists(html_path):
            raise FileNotFoundError(f"HTML file not found: {html_path}")
            
        with open(html_path, "r", encoding="utf-8") as f:
            html_content = f.read()
            
        soup = BeautifulSoup(html_content, "html.parser")
        
        # 1. Gather candidate text nodes
        candidates = self._extract_candidate_elements(soup)
        
        if not candidates:
            logger.warning("No candidate text elements extracted.")
            return []
            
        # 2. Use OpenAI if api_key is available, otherwise use local heuristics
        if self.client:
            try:
                refined_blocks = await self._analyze_with_llm(candidates)
                if refined_blocks:
                    return refined_blocks
            except Exception as e:
                logger.error(f"OpenAI analysis failed, falling back to local heuristics: {str(e)}")
                
        # Fallback local heuristic mapping
        return self._analyze_with_heuristics(candidates)

    def _extract_candidate_elements(self, soup: BeautifulSoup) -> List[Dict]:
        """Extracts candidate editable text elements with unique selectors."""
        candidates = []
        tags_to_extract = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "a", "button"]
        
        for index, el in enumerate(soup.find_all(tags_to_extract)):
            # Clean text
            text = el.get_text().strip()
            if not text or len(text) < 2:
                continue
                
            # Skip script/style parent content
            if el.parent and el.parent.name in ["script", "style", "head", "title", "meta"]:
                continue
                
            # Generate a unique css selector path for replacement
            selector = self._get_css_selector(el)
            
            candidates.append({
                "tag_type": el.name,
                "selector": selector,
                "original_value": text,
                "current_value": text,
                "parent_name": el.parent.name if el.parent else ""
            })
            
        return candidates

    def _get_css_selector(self, element) -> str:
        """Generates a unique CSS selector for a given element."""
        path = []
        current = element
        while current and current.name != "[document]":
            name = current.name
            
            # Use id if present and valid
            element_id = current.get("id")
            if element_id:
                path.insert(0, f"#{element_id}")
                break
                
            # Calculate index sibling position
            siblings = current.find_previous_siblings(name)
            idx = len(siblings) + 1
            if idx > 1 or current.find_next_siblings(name):
                name += f":nth-of-type({idx})"
                
            # Check for classnames to make it more precise
            classes = current.get("class")
            if classes:
                name += "." + ".".join(classes)
                
            path.insert(0, name)
            current = current.parent
            
        return " > ".join(path)

    async def _analyze_with_llm(self, candidates: List[Dict]) -> List[Dict]:
        """Sends candidate details to OpenAI to obtain semantic labeling and group by sections."""
        logger.info(f"Sending {len(candidates)} elements to OpenAI for semantic classification...")
        
        # Prepare small context payload to fit model window
        payload = []
        for i, c in enumerate(candidates):
            payload.append({
                "index": i,
                "tag": c["tag_type"],
                "text": c["original_value"][:150] # limit size
            })
            
        system_prompt = (
            "You are a UX designer and expert web crawler. You are given list of text elements from a website.\n"
            "Group each text element into a logical section: 'Navigation', 'Hero', 'Features', 'Pricing', 'Footer', or 'General'.\n"
            "Assign each element a unique camel_case translation key prefixing its section, e.g., 'hero_title', 'features_bullet_1', 'footer_copyright'.\n"
            "Return a JSON array containing objects with: 'index' (the input index), 'section', and 'key'."
        )
        
        response = self.client.chat.completions.create(
            model="gpt-3.5-turbo",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps({"elements": payload})}
            ],
            temperature=0.1
        )
        
        content = response.choices[0].message.content
        result = json.loads(content)
        mappings = result.get("elements", [])
        
        # Merge results back
        refined = []
        mapping_dict = {m["index"]: m for m in mappings if "index" in m}
        
        for idx, c in enumerate(candidates):
            mapping = mapping_dict.get(idx, {})
            refined.append({
                "section": mapping.get("section", self._guess_section(c)),
                "selector": c["selector"],
                "key": mapping.get("key", f"text_{idx}"),
                "tag_type": c["tag_type"],
                "original_value": c["original_value"],
                "current_value": c["current_value"]
            })
            
        return refined

    def _analyze_with_heuristics(self, candidates: List[Dict]) -> List[Dict]:
        """Local heuristic parser to categorize components without third-party APIs."""
        logger.info("Using local heuristic mapping...")
        refined = []
        for index, c in enumerate(candidates):
            section = self._guess_section(c)
            key = f"{section.lower()}_{c['tag_type']}_{index}"
            refined.append({
                "section": section,
                "selector": c["selector"],
                "key": key,
                "tag_type": c["tag_type"],
                "original_value": c["original_value"],
                "current_value": c["current_value"]
            })
        return refined

    def _guess_section(self, element: Dict) -> str:
        """Determines element section category based on selectors/tags."""
        selector = element["selector"].lower()
        parent = element["parent_name"].lower()
        tag = element["tag_type"].lower()
        text = element["original_value"].lower()
        
        if "nav" in selector or "header" in selector or parent in ["nav", "header"]:
            return "Navigation"
        elif "footer" in selector or parent in ["footer"]:
            return "Footer"
        elif "price" in selector or "pricing" in selector or "$" in text:
            return "Pricing"
        elif tag in ["h1"] or "hero" in selector:
            return "Hero"
        elif "feature" in selector or "grid" in selector:
            return "Features"
            
        return "General"

import os
# Ensure os is imported for settings path resolution
