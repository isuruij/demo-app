"""Notes admin registration."""
from django.contrib import admin
from .models import Note


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "created_at", "updated_at")
    search_fields = ("title", "description")
    readonly_fields = ("created_at", "updated_at")
