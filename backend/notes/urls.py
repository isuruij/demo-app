"""Notes URL routing."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NoteViewSet, S3UploadView

router = DefaultRouter()
router.register(r"notes", NoteViewSet, basename="note")

urlpatterns = [
    path("", include(router.urls)),
    path("upload/", S3UploadView.as_view(), name="s3-upload"),
]
