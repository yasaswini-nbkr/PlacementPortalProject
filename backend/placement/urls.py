
from django.urls import path
from . import views

urlpatterns = [
    path("jobs/", views.job_list, name="job-list"),
    path("register/", views.register_student, name="register-student"),
    path("login/", views.login_student, name="login-student"),
    path("apply/", views.apply_job, name="apply-job"),
    path("my-applications/", views.my_applications, name="my-applications"),
]
