
from django.urls import path
from . import views

urlpatterns = [
    path("", views.api_home, name="api_home"),
    path("register/", views.register_student, name="register_student"),
    path("login/", views.login_student, name="login_student"),
    path("jobs/", views.job_list, name="job_list"),
    path("apply/", views.apply_job, name="apply_job"),
    path("my-applications/", views.my_applications, name="my_applications"),
]
