from typing import Optional

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_current_user, get_settings

router = APIRouter(prefix="/ai", tags=["ai"])


class SuggestRequest(BaseModel):
    field_name: str  # e.g. "description", "notes"
    current_value: str = ""  # what user has typed so far
    context: dict = {}  # other form fields for context
    entity_type: str = ""  # e.g. "component", "tool", "machine"


class SuggestResponse(BaseModel):
    suggestion: str


@router.post("/suggest", response_model=SuggestResponse)
async def suggest_text(
    req: SuggestRequest,
    _user=Depends(get_current_user),
    settings=Depends(get_settings),
):
    """Use AI to suggest or autocomplete a text field value."""
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=400, detail="ANTHROPIC_API_KEY is not configured")

    # Build context string from other form fields
    context_lines = []
    for k, v in req.context.items():
        if v and str(v).strip():
            context_lines.append(f"- {k}: {v}")
    context_str = "\n".join(context_lines) if context_lines else "No other fields filled yet."

    entity = req.entity_type or "item"
    field = req.field_name.replace("_", " ")

    if req.current_value.strip():
        instruction = (
            f"The user is editing the \"{field}\" field for a {entity}. "
            f"They have written so far:\n\"{req.current_value}\"\n\n"
            f"Improve, expand, or complete what they wrote. Keep the same intent."
        )
    else:
        instruction = (
            f"The user needs to fill in the \"{field}\" field for a {entity}. "
            f"Generate a concise, useful value for this field."
        )

    prompt = (
        f"{instruction}\n\n"
        f"Other form fields for context:\n{context_str}\n\n"
        f"Rules:\n"
        f"- Return ONLY the field value text, no quotes, no explanations, no prefixes.\n"
        f"- Be concise and professional.\n"
        f"- For descriptions: 1-3 sentences max.\n"
        f"- For notes: brief and relevant.\n"
        f"- Use the context fields to make the suggestion relevant."
    )

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        suggestion = message.content[0].text.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI suggestion failed: {str(e)}")

    return SuggestResponse(suggestion=suggestion)
