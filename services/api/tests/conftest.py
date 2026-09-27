import os

# Tests must never touch the developer's database, .env values or live sources.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["DATA_SOURCE"] = "mock"
