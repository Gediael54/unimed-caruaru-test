from __future__ import annotations

import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
SRC_DIR = BASE_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from report_pipeline.app import *  # noqa: F401,F403
from report_pipeline.app import main


if __name__ == "__main__":
    raise SystemExit(main())
