from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    """Base for every request/response model.

    Python code uses snake_case; JSON uses camelCase as openapi.yaml requires.
    Return these models from routes (FastAPI serializes by alias).
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
