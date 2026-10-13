
from django.db import models


class Student(models.Model):
    name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)

    def __str__(self):
        return self.name


class Job(models.Model):
    title = models.CharField(max_length=200)
    company = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    location = models.CharField(max_length=100)
    salary = models.CharField(max_length=100)
    job_type = models.CharField(max_length=50)

    def __str__(self):
        return self.title


class Application(models.Model):
    student_name = models.CharField(max_length=150)
    student_email = models.EmailField()
    job = models.ForeignKey(Job, on_delete=models.CASCADE)
    resume = models.FileField(
        upload_to="resumes/",
        blank=True,
        null=True
    )
    applied_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50, default="Pending")

    def __str__(self):
        return f"{self.student_name} - {self.job.title}"
