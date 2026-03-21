from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class InvoiceItemBase(BaseModel):
    description: Optional[str] = None
    part_number: Optional[str] = None
    quantity: int = 1
    unit_price: Optional[float] = None
    total_price: Optional[float] = None


class InvoiceItemCreate(InvoiceItemBase):
    invoice_id: int
    component_id: Optional[int] = None


class InvoiceItemResponse(InvoiceItemBase):
    id: int
    invoice_id: int
    component_id: Optional[int] = None
    matched: int = 0
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class InvoiceBase(BaseModel):
    invoice_number: Optional[str] = None
    supplier: Optional[str] = None
    total_amount: Optional[float] = None
    currency: str = "USD"
    invoice_date: Optional[datetime] = None


class InvoiceCreate(InvoiceBase):
    pass


class InvoiceResponse(InvoiceBase):
    id: int
    file_path: Optional[str] = None
    status: str = "uploaded"
    raw_text: Optional[str] = None
    parsed_data: Optional[str] = None
    items: list[InvoiceItemResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class InvoiceListResponse(BaseModel):
    items: list[InvoiceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class InvoiceUploadResponse(BaseModel):
    invoice_id: int
    file_path: str
    status: str
