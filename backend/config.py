from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = "placeholder"
    coder_url: str = "http://localhost:3001"
    coder_token: str = "placeholder"
    coder_org_id: str = "77a1659a-5dfa-4d6d-a3a0-b116691039c3"
    coder_template_name: str = "coding-agent"
    github_token: str = "placeholder"
    autonomous_mode: bool = False
    max_plan_steps: int = 20

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
