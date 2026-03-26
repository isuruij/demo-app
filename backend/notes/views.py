"""Notes views – CRUD + standalone S3 file upload."""
import uuid
import boto3
from botocore.exceptions import ClientError
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Note
from .serializers import NoteSerializer


class NoteViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for Notes (no file field).

    list:   GET  /api/notes/
    create: POST /api/notes/
    read:   GET  /api/notes/{id}/
    update: PUT/PATCH /api/notes/{id}/
    delete: DELETE /api/notes/{id}/
    """
    queryset = Note.objects.all()
    serializer_class = NoteSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]


class S3UploadView(APIView):
    """
    POST /api/upload/
    Upload a file directly to S3 and return its public URL.
    Accepts multipart/form-data with a 'file' field.
    """
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response(
                {"error": "No file provided. Send a 'file' field."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Build a unique S3 key
        ext = uploaded_file.name.rsplit(".", 1)[-1] if "." in uploaded_file.name else "bin"
        s3_key = f"uploads/{uuid.uuid4()}.{ext}"

        try:
            s3 = boto3.client(
                "s3",
                region_name=settings.AWS_S3_REGION_NAME,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
            s3.upload_fileobj(
                uploaded_file,
                settings.AWS_STORAGE_BUCKET_NAME,
                s3_key,
                ExtraArgs={"ContentType": uploaded_file.content_type},
            )

            file_url = (
                f"https://{settings.AWS_STORAGE_BUCKET_NAME}"
                f".s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{s3_key}"
            )
            return Response(
                {
                    "url": file_url,
                    "key": s3_key,
                    "filename": uploaded_file.name,
                    "size": uploaded_file.size,
                },
                status=status.HTTP_201_CREATED,
            )

        except ClientError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
