"""Repo-relative locations for scenario data and shared fixtures."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
FIXTURES_DIR = ROOT / "fixtures"
SCENARIO_PATH = DATA_DIR / "scenario.json"
TIME_MATRIX_PATH = DATA_DIR / "time_matrix.json"
