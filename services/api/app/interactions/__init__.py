"""Curated drug interaction dataset and checker. Every entry cites a source."""

from app.interactions.checker import check_interactions
from app.interactions.dataset import DATASET_VERSION, load_dataset

__all__ = ["DATASET_VERSION", "check_interactions", "load_dataset"]
