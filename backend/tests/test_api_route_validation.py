from fastapi.testclient import TestClient

from app import app
import api.api_route as route_module


client = TestClient(app)
URL = "/api/route"


# --------------------------------------------------
# 1. Valid distance matrix
# --------------------------------------------------

def test_valid_matrix():
    data = {
        "matrix": [
            [0, 10, 20],
            [10, 0, 15],
            [20, 15, 0]
        ],
        "labels": ["A", "B", "C"]
    }

    response = client.post(URL, json=data)

    assert response.status_code == 200
    result = response.json()

    assert result["status"] == "optimal"
    assert result["answer"]["cost"] >= 0
    assert len(result["answer"]["tour"]) == 4


# --------------------------------------------------
# 2. Negative weights
# --------------------------------------------------

def test_negative_weights():
    data = {
        "matrix": [
            [0, -10],
            [10, 0]
        ],
        "labels": ["A", "B"]
    }

    response = client.post(URL, json=data)

    assert response.status_code == 422


# --------------------------------------------------
# 3. Non-square matrix
# --------------------------------------------------

def test_non_square_matrix():
    data = {
        "matrix": [
            [0, 10, 20],
            [10, 0, 15]
        ],
        "labels": ["A", "B", "C"]
    }

    response = client.post(URL, json=data)

    assert response.status_code == 422


# --------------------------------------------------
# 4. Matrix size does not match labels
# --------------------------------------------------

def test_matrix_size_mismatch():
    data = {
        "matrix": [
            [0, 10],
            [10, 0]
        ],
        "labels": ["A", "B", "C"]
    }

    response = client.post(URL, json=data)

    assert response.status_code == 422


# --------------------------------------------------
# 5. Missing labels
# --------------------------------------------------

def test_missing_labels():
    data = {
        "matrix": [
            [0, 10],
            [10, 0]
        ]
    }

    response = client.post(URL, json=data)

    assert response.status_code == 422


# --------------------------------------------------
# 6. Duplicate labels
# --------------------------------------------------

def test_duplicate_labels():
    data = {
        "matrix": [
            [0, 10],
            [10, 0]
        ],
        "labels": ["A", "A"]
    }

    response = client.post(URL, json=data)

    assert response.status_code == 422


# --------------------------------------------------
# 7. Empty labels
# --------------------------------------------------

def test_empty_labels():
    data = {
        "matrix": [
            [0, 10],
            [10, 0]
        ],
        "labels": ["", "B"]
    }

    response = client.post(URL, json=data)

    assert response.status_code == 422


# --------------------------------------------------
# 8. Only one node
# --------------------------------------------------

def test_single_node():
    data = {
        "matrix": [[0]],
        "labels": ["A"]
    }

    response = client.post(URL, json=data)

    assert response.status_code == 422


# --------------------------------------------------
# 9. Neither input provided
# --------------------------------------------------

def test_neither_input():
    response = client.post(URL, json={})

    assert response.status_code == 422


# --------------------------------------------------
# 10. Both matrix and points provided
# --------------------------------------------------

def test_both_inputs():
    data = {
        "matrix": [
            [0, 10],
            [10, 0]
        ],
        "labels": ["A", "B"],
        "points": {
            "A": [0, 0],
            "B": [1, 1]
        }
    }

    response = client.post(URL, json=data)

    assert response.status_code == 422


# --------------------------------------------------
# 11. Non-numeric matrix entry
# --------------------------------------------------

def test_non_numeric_matrix_entry():
    data = {
        "matrix": [
            [0, "hello"],
            [10, 0]
        ],
        "labels": ["A", "B"]
    }

    response = client.post(URL, json=data)

    assert response.status_code == 422


# --------------------------------------------------
# 12. NaN matrix entry
# --------------------------------------------------

def test_nan_matrix_entry():
    data = (
        '{"matrix": [[0, NaN], [10, 0]], '
        '"labels": ["A", "B"]}'
    )

    response = client.post(
        URL,
        content=data,
        headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 422


# --------------------------------------------------
# 13. Infinite matrix entry
# --------------------------------------------------

def test_infinite_matrix_entry():
    data = (
        '{"matrix": [[0, Infinity], [10, 0]], '
        '"labels": ["A", "B"]}'
    )

    response = client.post(
        URL,
        content=data,
        headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 422


# --------------------------------------------------
# 14. Coordinates with incorrect dimensions
# --------------------------------------------------

def test_coordinate_with_wrong_dimensions():
    data = {
        "points": {
            "Base": [0, 0],
            "C1": [1, 2, 3]
        }
    }

    response = client.post(URL, json=data)

    assert response.status_code == 422


# --------------------------------------------------
# 15. Valid coordinates
# --------------------------------------------------

def test_valid_coordinates(monkeypatch):
    def mock_time_matrix(points, labels):
        return [
            [0, 10],
            [10, 0]
        ]

    monkeypatch.setattr(
        route_module,
        "time_matrix",
        mock_time_matrix
    )

    data = {
        "points": {
            "Base": [0, 0],
            "C1": [3, 4]
        }
    }

    response = client.post(URL, json=data)

    assert response.status_code == 200

    result = response.json()

    assert result["status"] == "optimal"
    assert result["answer"]["cost"] == 20


def test_real_points_path_with_demo_coordinates(scenario):
    """POST demo coordinates directly without mocking time_matrix, exercising M4 to M5 link."""
    response = client.post(URL, json={"points": scenario["nodes"]})
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "optimal"
    assert result["answer"]["cost"] == 70
    assert result["answer"]["nearest_neighbour"]["cost"] == 80
    assert result["answer"]["tour"][0] == result["answer"]["tour"][-1] == "Base"