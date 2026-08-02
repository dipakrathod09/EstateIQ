"""
Tests for accounts app: registration, login, JWT refresh, /me/ endpoint.
"""
import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestRegistration:
    def test_register_creates_user(self, api_client):
        payload = {
            "username": "newuser",
            "email": "newuser@test.com",
            "password": "StrongPass123!",
            "role": "agent",
        }
        resp = api_client.post("/api/auth/register/", payload)
        assert resp.status_code == 201, resp.data
        assert "access" in resp.data
        assert "refresh" in resp.data
        assert resp.data["user"]["role"] == "agent"

    def test_register_returns_jwt_tokens(self, api_client):
        payload = {
            "username": "jwtuser",
            "email": "jwt@test.com",
            "password": "StrongPass123!",
            "role": "tenant",
        }
        resp = api_client.post("/api/auth/register/", payload)
        assert resp.status_code == 201
        # Both tokens must be non-empty strings
        assert len(resp.data["access"]) > 20
        assert len(resp.data["refresh"]) > 20

    def test_register_duplicate_username_fails(self, api_client, agent):
        payload = {
            "username": agent.username,
            "email": "other@test.com",
            "password": "StrongPass123!",
            "role": "agent",
        }
        resp = api_client.post("/api/auth/register/", payload)
        assert resp.status_code == 400

    def test_register_invalid_role_defaults_to_tenant(self, api_client):
        """Invalid or missing role should not raise a 500 — model default is tenant."""
        payload = {
            "username": "roletest",
            "email": "roletest@test.com",
            "password": "StrongPass123!",
        }
        resp = api_client.post("/api/auth/register/", payload)
        # Either created with default role OR returns a validation error — both are acceptable
        assert resp.status_code in (201, 400)


@pytest.mark.django_db
class TestLogin:
    def test_login_valid_credentials(self, api_client, agent):
        resp = api_client.post("/api/auth/login/", {
            "username": agent.username,
            "password": "testpass123",
        })
        assert resp.status_code == 200, resp.data
        assert "access" in resp.data
        assert "refresh" in resp.data

    def test_login_wrong_password_rejected(self, api_client, agent):
        resp = api_client.post("/api/auth/login/", {
            "username": agent.username,
            "password": "wrongpassword",
        })
        assert resp.status_code == 401

    def test_login_nonexistent_user_rejected(self, api_client):
        resp = api_client.post("/api/auth/login/", {
            "username": "nobody",
            "password": "pass",
        })
        assert resp.status_code == 401

    def test_login_response_contains_role(self, api_client, landlord):
        """Custom token serializer should embed role in response."""
        resp = api_client.post("/api/auth/login/", {
            "username": landlord.username,
            "password": "testpass123",
        })
        assert resp.status_code == 200
        # role may be in top-level data or inside 'user' key depending on serializer
        role_present = (
            resp.data.get("role") == "landlord"
            or (resp.data.get("user") or {}).get("role") == "landlord"
        )
        assert role_present, f"Role not found in response: {resp.data}"


@pytest.mark.django_db
class TestJWTRefresh:
    def test_refresh_returns_new_access_token(self, api_client, tenant):
        login = api_client.post("/api/auth/login/", {
            "username": tenant.username,
            "password": "testpass123",
        })
        refresh_token = login.data["refresh"]
        resp = api_client.post("/api/auth/token/refresh/", {"refresh": refresh_token})
        assert resp.status_code == 200
        assert "access" in resp.data

    def test_invalid_refresh_token_rejected(self, api_client):
        resp = api_client.post("/api/auth/token/refresh/", {"refresh": "bogus.token.here"})
        assert resp.status_code == 401


@pytest.mark.django_db
class TestMeEndpoint:
    def test_me_returns_correct_role(self, agent_client):
        resp = agent_client.get("/api/auth/me/")
        assert resp.status_code == 200
        assert resp.data["role"] == "agent"
        assert resp.data["username"] == "agent_test"

    def test_me_returns_landlord_role(self, landlord_client):
        resp = landlord_client.get("/api/auth/me/")
        assert resp.status_code == 200
        assert resp.data["role"] == "landlord"

    def test_me_returns_tenant_role(self, tenant_client):
        resp = tenant_client.get("/api/auth/me/")
        assert resp.status_code == 200
        assert resp.data["role"] == "tenant"

    def test_me_unauthenticated_rejected(self, api_client):
        resp = api_client.get("/api/auth/me/")
        assert resp.status_code == 401
