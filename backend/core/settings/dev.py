"""
Development settings – uses PostgreSQL via Docker Compose, DEBUG=True.
Both dev and prod use the same S3 bucket for file uploads (configured in base.py).
"""
from .base import *  # noqa

DEBUG = True

CORS_ALLOW_ALL_ORIGINS = True

# Django REST Framework – enable browsable API in dev
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # type: ignore[name-defined]  # noqa: F405
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}
