from functools import lru_cache

import anthropic

from app.config import Settings


@lru_cache
def get_claude_client() -> anthropic.Anthropic:
    """Return a configured Anthropic client instance.

    Uses the ANTHROPIC_API_KEY from application settings.

    Returns:
        Configured Anthropic client.

    Raises:
        ValueError: If API key is not configured.
    """
    settings = Settings()
    if not settings.ANTHROPIC_API_KEY:
        raise ValueError(
            "ANTHROPIC_API_KEY is not set. Configure it in .env or environment variables."
        )
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
