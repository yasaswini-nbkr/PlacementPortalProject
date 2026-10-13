
import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from django.contrib.auth.hashers import make_password, check_password

from .models import Student, Job, Application


def read_json(request):
    try:
        data = json.loads(request.body)
        return data if isinstance(data, dict) else None
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


# REGISTER STUDENT
@csrf_exempt
@require_POST
def register_student(request):
    data = read_json(request)

    if data is None:
        return JsonResponse(
            {"error": "Invalid request data."},
            status=400
        )

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")

    if not isinstance(password, str):
        return JsonResponse({"error": "Invalid password."}, status=400)

    if not name or not email or not password:
        return JsonResponse(
            {"error": "Please fill in all fields."},
            status=400
        )

    if len(password) < 6:
        return JsonResponse(
            {"error": "Password must be at least 6 characters."},
            status=400
        )

    if Student.objects.filter(email__iexact=email).exists():
        return JsonResponse(
            {"error": "Email already registered. Please sign in."},
            status=400
        )

    student = Student.objects.create(
        name=name,
        email=email,
        password=make_password(password)
    )

    return JsonResponse({
        "message": "Registration successful. Please sign in.",
        "name": student.name,
        "email": student.email
    }, status=201)


# LOGIN STUDENT
@csrf_exempt
@require_POST
def login_student(request):
    data = read_json(request)

    if data is None:
        return JsonResponse(
            {"error": "Invalid request data."},
            status=400
        )

    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")

    if not email or not isinstance(password, str) or not password:
        return JsonResponse(
            {"error": "Enter your email and password."},
            status=400
        )

    student = Student.objects.filter(email__iexact=email).first()

    if not student or not check_password(password, student.password):
        return JsonResponse(
            {"error": "Invalid email or password."},
            status=401
        )

    return JsonResponse({
        "message": "Login successful.",
        "name": student.name,
        "email": student.email
    })


# LIST ALL JOBS
@require_GET
def job_list(request):
    jobs = Job.objects.all().order_by("id")

    results = []

    for job in jobs:
        results.append({
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "category": job.category,
            "location": job.location,
            "salary": job.salary,
            "job_type": job.job_type
        })

    return JsonResponse(results, safe=False)


# APPLY FOR A JOB WITHOUT A RESUME
@csrf_exempt
@require_POST
def apply_job(request):
    data = read_json(request)

    if data is None:
        return JsonResponse(
            {"error": "Invalid request data."},
            status=400
        )

    name = str(data.get("student_name", "")).strip()
    email = str(data.get("student_email", "")).strip().lower()
    job_id = data.get("job_id")

    if not name or not email or job_id is None:
        return JsonResponse(
            {"error": "Student details and job ID are required."},
            status=400
        )

    student = Student.objects.filter(
        email__iexact=email
    ).first()

    if not student or student.name != name:
        return JsonResponse(
            {"error": "Please sign in with your registered account."},
            status=401
        )

    try:
        job = Job.objects.get(id=int(job_id))
    except (Job.DoesNotExist, ValueError, TypeError):
        return JsonResponse(
            {"error": "Job not found."},
            status=404
        )

    if Application.objects.filter(
        student_email__iexact=email,
        job=job
    ).exists():
        return JsonResponse(
            {"error": "You have already applied for this job."},
            status=400
        )

    application = Application.objects.create(
        student_name=student.name,
        student_email=student.email,
        job=job,
        status="Pending"
    )

    return JsonResponse({
        "message": "Application submitted successfully.",
        "application_id": application.id,
        "status": application.status
    }, status=201)


# VIEW MY APPLICATIONS
@require_GET
def my_applications(request):
    email = request.GET.get("email", "").strip().lower()

    if not email:
        return JsonResponse(
            {"error": "Email is required."},
            status=400
        )

    applications = (
        Application.objects
        .filter(student_email__iexact=email)
        .select_related("job")
        .order_by("-applied_at")
    )

    results = []

    for app in applications:
        results.append({
            "id": app.id,
            "job_title": app.job.title,
            "company": app.job.company,
            "location": app.job.location,
            "applied_at": app.applied_at.isoformat(),
            "status": app.status
        })

    return JsonResponse(results, safe=False)
