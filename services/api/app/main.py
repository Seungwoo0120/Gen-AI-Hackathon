from fastapi import FastAPI

app = FastAPI(title="HK Health Companion API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
