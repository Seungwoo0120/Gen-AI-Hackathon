from fastapi.testclient import TestClient

from app.interactions import DATASET_VERSION
from app.main import app

client = TestClient(app)
PARACETAMOL_SUMMARY = (
    "These products both contain paracetamol, which can lead to an accidental overdose and "
    "serious liver damage. Check with a doctor or pharmacist before using them together."
)
PARACETAMOL_SOURCE_TITLE = (
    "FDA: Acetaminophen — avoid more than one acetaminophen-containing product"
)


def test_check_route_returns_camel_case_contract_shape() -> None:
    response = client.post(
        "/interactions/check",
        json={"medications": ["Panadol", "Panadol Cold & Flu", "Unknown"]},
    )

    assert response.status_code == 200
    assert response.json() == {
        "warnings": [
            {
                "kind": "duplicate_ingredient",
                "severity": "major",
                "medications": ["Panadol", "Panadol Cold & Flu"],
                "ingredient": "paracetamol",
                "summary": {"en": PARACETAMOL_SUMMARY},
                "sources": [
                    {
                        "title": PARACETAMOL_SOURCE_TITLE,
                        "url": "https://www.fda.gov/drugs/safe-use-over-counter-pain-relievers-and-fever-reducers/acetaminophen",
                    }
                ],
            }
        ],
        "unrecognized": ["Unknown"],
        "datasetVersion": DATASET_VERSION,
    }


def test_check_route_rejects_an_empty_medication_list() -> None:
    response = client.post("/interactions/check", json={"medications": []})

    assert response.status_code == 422


def test_blank_medication_name_is_rejected() -> None:
    response = client.post("/interactions/check", json={"medications": ["  ", "Panadol"]})
    assert response.status_code == 422
