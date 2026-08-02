"""
Tests for ML service integration:
- Success path: correct fields forwarded, response returned to client
- Failure path: connection error / timeout → graceful "unavailable" response (no 500)
- Deal tag computation path verified via mock
"""
import pytest
from unittest.mock import patch, MagicMock
import requests as req_lib


ML_SUCCESS_RESPONSE = {
    "predicted_price": 8400000.0,
    "currency": "INR",
    "confidence_score": 0.94,
    "based_on": "blended_xgboost_100k",
    "deal_tag": "Good Deal",
    "status": "success",
    "model_version": "v2.0-xgboost-100k",
}

ML_OVERPRICED_RESPONSE = {
    "predicted_price": 5000000.0,
    "currency": "INR",
    "confidence_score": 0.91,
    "based_on": "blended_xgboost_100k",
    "deal_tag": "Overpriced",
    "status": "success",
    "model_version": "v2.0-xgboost-100k",
}


# ---------------------------------------------------------------------------
# Unit tests for get_price_prediction() service function
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestGetPricePredictionService:
    @patch("properties.ml_client.requests.post")
    def test_success_returns_prediction_dict(self, mock_post, property_obj):
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = ML_SUCCESS_RESPONSE

        from properties.ml_client import get_price_prediction
        result = get_price_prediction(property_obj)

        assert result is not None
        assert result["predicted_price"] == 8400000.0
        assert result["deal_tag"] == "Good Deal"
        assert result["confidence_score"] == 0.94

    @patch("properties.ml_client.requests.post")
    def test_correct_payload_sent_to_ml_service(self, mock_post, property_obj):
        """Verifies all required fields are forwarded to the ML service."""
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = ML_SUCCESS_RESPONSE

        from properties.ml_client import get_price_prediction
        get_price_prediction(property_obj)

        assert mock_post.called
        call_kwargs = mock_post.call_args
        payload = call_kwargs[1].get("json") or call_kwargs[0][1]

        required_fields = [
            "city", "sub_market", "locality", "property_type", "bhk",
            "area_sqft", "floor", "total_floors", "age_years", "furnishing",
            "facing", "dist_metro_km", "dist_school_km", "dist_hospital_km",
            "dist_it_hub_km", "has_gym", "has_pool", "has_clubhouse",
            "has_security", "has_power_backup", "has_parking", "has_lift",
            "rera_approved", "listed_price",
        ]
        for field in required_fields:
            assert field in payload, f"Missing field in ML payload: {field}"

    @patch("properties.ml_client.requests.post")
    def test_connection_error_returns_none(self, mock_post):
        """Connection refused → function returns None (not raises)."""
        mock_post.side_effect = ConnectionError("Connection refused")

        from properties.ml_client import get_price_prediction
        result = get_price_prediction({
            "city": "Ahmedabad", "bhk": 2, "area_sqft": 1200.0,
            "listed_price": 6500000.0,
        })
        assert result is None

    @patch("properties.ml_client.requests.post")
    def test_timeout_returns_none(self, mock_post):
        """Timeout → function returns None (not raises)."""
        mock_post.side_effect = req_lib.exceptions.Timeout("Request timed out")

        from properties.ml_client import get_price_prediction
        result = get_price_prediction({
            "city": "Mumbai", "bhk": 3, "area_sqft": 1800.0,
            "listed_price": 20000000.0,
        })
        assert result is None

    @patch("properties.ml_client.requests.post")
    def test_http_error_returns_none(self, mock_post):
        """ML service 500 → function returns None."""
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        mock_resp.text = "Internal Server Error"
        mock_post.return_value = mock_resp

        from properties.ml_client import get_price_prediction
        result = get_price_prediction({"city": "Bangalore", "bhk": 2, "area_sqft": 1000.0})
        assert result is None

    @patch("properties.ml_client.requests.post")
    def test_dict_input_works_same_as_instance(self, mock_post):
        """Service function should accept both a dict and a model instance."""
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = ML_SUCCESS_RESPONSE

        from properties.ml_client import get_price_prediction
        result = get_price_prediction({
            "city": "Ahmedabad",
            "sub_market": "West",
            "locality": "Satellite",
            "property_type": "Apartment",
            "bhk": 2,
            "area_sqft": 1100.0,
            "floor": 3,
            "total_floors": 10,
            "age_years": 2,
            "furnishing": "Semi-Furnished",
            "facing": "East",
            "dist_metro_km": 1.5,
            "dist_school_km": 1.0,
            "dist_hospital_km": 2.0,
            "dist_it_hub_km": 3.0,
            "has_gym": False, "has_pool": False, "has_clubhouse": False,
            "has_security": True, "has_power_backup": True,
            "has_parking": True, "has_lift": True, "rera_approved": True,
            "listed_price": 5500000.0,
        })
        assert result is not None
        assert result["predicted_price"] == 8400000.0


# ---------------------------------------------------------------------------
# API endpoint tests: GET /api/properties/<id>/price-prediction/
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestPricePredictionEndpointIntegration:
    @patch("properties.ml_client.requests.post")
    def test_endpoint_returns_available_true_on_success(self, mock_post, api_client, property_obj):
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = ML_SUCCESS_RESPONSE

        resp = api_client.get(f"/api/properties/{property_obj.id}/price-prediction/")
        assert resp.status_code == 200
        assert resp.data["available"] is True
        assert resp.data["predicted_price"] == 8400000.0
        assert resp.data["deal_tag"] == "Good Deal"
        assert resp.data["confidence_score"] == 0.94

    @patch("properties.ml_client.requests.post")
    def test_endpoint_overpriced_deal_tag(self, mock_post, api_client, property_obj):
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = ML_OVERPRICED_RESPONSE

        resp = api_client.get(f"/api/properties/{property_obj.id}/price-prediction/")
        assert resp.status_code == 200
        assert resp.data["deal_tag"] == "Overpriced"

    @patch("properties.ml_client.requests.post")
    def test_endpoint_returns_available_false_on_connection_error(
        self, mock_post, api_client, property_obj
    ):
        """Critical: ML service down → 200 with available=False, NOT a 500."""
        mock_post.side_effect = ConnectionError("Connection refused")

        resp = api_client.get(f"/api/properties/{property_obj.id}/price-prediction/")
        # Must be 200, never 500
        assert resp.status_code == 200
        assert resp.data["available"] is False
        assert "message" in resp.data

    @patch("properties.ml_client.requests.post")
    def test_endpoint_returns_available_false_on_timeout(
        self, mock_post, api_client, property_obj
    ):
        mock_post.side_effect = req_lib.exceptions.Timeout("Timeout")

        resp = api_client.get(f"/api/properties/{property_obj.id}/price-prediction/")
        assert resp.status_code == 200
        assert resp.data["available"] is False

    def test_endpoint_nonexistent_property_returns_404(self, api_client):
        resp = api_client.get("/api/properties/99999/price-prediction/")
        assert resp.status_code == 404

    @patch("properties.ml_client.requests.post")
    def test_create_property_stores_ml_predicted_price(
        self, mock_post, agent_client
    ):
        """When creating a property, the ML-predicted price should be stored."""
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = ML_SUCCESS_RESPONSE

        from tests.conftest import PROPERTY_PAYLOAD
        resp = agent_client.post("/api/properties/", PROPERTY_PAYLOAD, format="json")
        assert resp.status_code == 201
        assert resp.data.get("predicted_price") == 8400000.0
        assert resp.data.get("deal_tag") == "Good Deal"
