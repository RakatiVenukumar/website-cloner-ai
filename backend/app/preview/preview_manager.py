import os
import subprocess
import logging
import socket
import time
import atexit
from typing import Dict, Optional, Tuple

logger = logging.getLogger("preview_manager")

class PreviewManager:
    def __init__(self):
        # Maps project_id -> (subprocess.Popen, port)
        self.active_processes: Dict[str, Tuple[subprocess.Popen, int]] = {}
        self.starting_port = 3001

    def _is_port_available(self, port: int) -> bool:
        """Checks if a local port is available for binding."""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) != 0

    def _find_available_port(self) -> int:
        """Finds an unused port starting from self.starting_port."""
        port = self.starting_port
        while not self._is_port_available(port):
            port += 1
        return port

    def start_preview(self, project_id: str, project_dir: str) -> int:
        """
        Runs npm install (if needed) and launches Next.js development server
        for the given project on a dynamically allocated port.
        """
        # If already running, return the active port
        if project_id in self.active_processes:
            _, port = self.active_processes[project_id]
            logger.info(f"Preview server for project {project_id} already running on port {port}")
            return port

        logger.info(f"Initializing preview server for project {project_id} in {project_dir}")

        # 1. Check/Install node_modules
        node_modules_path = os.path.join(project_dir, "node_modules")
        if not os.path.exists(node_modules_path):
            logger.info(f"node_modules not found. Running 'npm install' in {project_dir}...")
            try:
                # Use shell=True for Windows compatibility
                subprocess.run(
                    "npm install",
                    cwd=project_dir,
                    shell=True,
                    check=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                logger.info("npm install completed successfully.")
            except subprocess.CalledProcessError as e:
                logger.error(f"npm install failed in {project_dir}: {str(e)}")
                raise Exception("Failed to install project dependencies. Make sure Node.js and npm are installed.")

        # 2. Find an available port
        port = self._find_available_port()
        logger.info(f"Allocated port {port} for project {project_id}")

        # 3. Start Next.js dev server
        # We run it using npx next dev -p {port} to ensure it runs correctly
        cmd = f"npx next dev -p {port}"
        try:
            process = subprocess.Popen(
                cmd,
                cwd=project_dir,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait a short moment to check if process failed immediately
            time.sleep(2)
            if process.poll() is not None:
                _, err = process.communicate()
                raise Exception(f"Dev server terminated immediately with error: {err}")
                
            self.active_processes[project_id] = (process, port)
            logger.info(f"Started Next.js dev server for project {project_id} on port {port}")
            
            # Keep track of starting ports to avoid quick recycling
            self.starting_port = port + 1
            return port
            
        except Exception as e:
            logger.error(f"Failed to start dev server: {str(e)}")
            raise e

    def stop_preview(self, project_id: str) -> bool:
        """Stops the running dev server for the specified project."""
        if project_id in self.active_processes:
            process, port = self.active_processes.pop(project_id)
            logger.info(f"Stopping preview server for project {project_id} on port {port}...")
            try:
                if os.name == 'nt':
                    # Windows process tree termination
                    subprocess.run(
                        f"taskkill /F /T /PID {process.pid}",
                        shell=True,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL
                    )
                else:
                    # Unix termination
                    process.terminate()
                    process.wait(timeout=5)
                logger.info(f"Preview server for project {project_id} terminated successfully.")
                return True
            except Exception as e:
                logger.warning(f"Error terminating preview server process: {str(e)}")
                # Force kill if needed
                try:
                    process.kill()
                except:
                    pass
                return True
        return False

    def get_preview_port(self, project_id: str) -> Optional[int]:
        if project_id in self.active_processes:
            _, port = self.active_processes[project_id]
            return port
        return None

    def cleanup_all(self):
        """Terminates all active preview processes on exit."""
        if self.active_processes:
            logger.info("Cleaning up all active preview servers...")
            project_ids = list(self.active_processes.keys())
            for pid in project_ids:
                self.stop_preview(pid)

preview_manager = PreviewManager()

# Register shutdown hook
atexit.register(preview_manager.cleanup_all)
