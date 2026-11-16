"""Moved to backend/screening/synthetic_cohort.py; re-exported for the evaluation scripts."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from screening.synthetic_cohort import *  # noqa: F401,F403
from screening.synthetic_cohort import _logit  # noqa: F401
