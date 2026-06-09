import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class PreviewManager:
    def __init__(self):
        # Maps project_id -> subprocess or mock port
        self.active_processes: Dict[str, int] = {}
        self.port_counter = 3001

    def start_preview(self, project_id: str, project_dir: str) -> int:
        """
        Starts a development server for the specified Next.js project on a dynamic port.
        Returns the port number.
        """
        if project_id in self.active_processes:
            return self.active_processes[project_id]

        port = self.port_counter
        self.port_counter += 1
        self.active_processes[project_id] = port
        logger.info(f"Started mock preview server for project {project_id} on port {port}")
        return port

    def stop_preview(self, project_id: str) -> bool:
        """
        Stops the running dev server for the specified project.
        """
        if project_id in self.active_processes:
            port = self.active_processes.pop(project_id)
            logger.info(f"Stopped mock preview server on port {port}")
            return True
        return False

    def get_preview_port(self, project_id: str) -> Optional[int]:
        return self.active_processes.get(project_id)

preview_manager = PreviewManager()
