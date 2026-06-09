import os

class NextJsGenerator:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir

    def generate_project(self, project_name: str, scraped_data: dict, text_blocks: list) -> str:
        """
        Creates a runnable Next.js 15 template inside output_dir.
        Injects the cloned CSS and parsed components, configured to load text from a JSON file.
        Returns the absolute path to the generated project root.
        """
        project_path = os.path.join(self.output_dir, project_name)
        os.makedirs(project_path, exist_ok=True)
        
        # SKELETON: Write a simple static file representing a Next.js directory structure
        package_json = os.path.join(project_path, "package.json")
        with open(package_json, "w", encoding="utf-8") as f:
            f.write('{"name": "' + project_name + '", "version": "0.1.0", "scripts": {"dev": "echo Running Dev Server"}}')
            
        return project_path
