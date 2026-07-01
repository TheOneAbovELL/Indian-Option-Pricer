"""
pytest configuration — adds backend/ to sys.path so tests
can import `app.*` without needing an editable install.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
