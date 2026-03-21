import base64
import json
import os
from typing import Any

import anthropic


async def parse_invoice_pdf(file_path: str, api_key: str) -> dict[str, Any]:
    """Parse an invoice PDF using Claude to extract structured data.

    Sends the PDF content to Claude and asks it to extract invoice details
    including line items with part numbers, quantities, and prices.

    Args:
        file_path: Path to the invoice PDF file.
        api_key: Anthropic API key.

    Returns:
        Dict with extracted invoice data including:
        - invoice_number
        - supplier
        - total_amount
        - currency
        - items: list of dicts with description, part_number, quantity, unit_price, total_price
    """
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY is not configured")

    with open(file_path, "rb") as f:
        pdf_bytes = f.read()

    pdf_base64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")

    client = anthropic.Anthropic(api_key=api_key)

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": "application/pdf",
                            "data": pdf_base64,
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            "Extract the following information from this invoice and return it as JSON only "
                            "(no markdown, no explanation):\n\n"
                            "{\n"
                            '  "invoice_number": "string or null",\n'
                            '  "supplier": "string or null",\n'
                            '  "invoice_date": "YYYY-MM-DD or null",\n'
                            '  "total_amount": number_or_null,\n'
                            '  "currency": "USD",\n'
                            '  "items": [\n'
                            "    {\n"
                            '      "description": "string",\n'
                            '      "part_number": "string or null",\n'
                            '      "quantity": number,\n'
                            '      "unit_price": number_or_null,\n'
                            '      "total_price": number_or_null\n'
                            "    }\n"
                            "  ]\n"
                            "}"
                        ),
                    },
                ],
            }
        ],
    )

    response_text = message.content[0].text.strip()

    # Try to parse JSON from the response, handling possible markdown wrapping
    if response_text.startswith("```"):
        lines = response_text.split("\n")
        json_lines = []
        in_block = False
        for line in lines:
            if line.startswith("```") and not in_block:
                in_block = True
                continue
            elif line.startswith("```") and in_block:
                break
            elif in_block:
                json_lines.append(line)
        response_text = "\n".join(json_lines)

    try:
        parsed: dict[str, Any] = json.loads(response_text)
    except json.JSONDecodeError:
        parsed = {
            "invoice_number": None,
            "supplier": None,
            "total_amount": None,
            "currency": "USD",
            "items": [],
            "raw_response": response_text,
        }

    return parsed
