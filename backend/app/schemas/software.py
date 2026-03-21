from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SoftwareBase(BaseModel):
    name: str
    version: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    license_type: Optional[str] = None
    license_key: Optional[str] = None
    vendor: Optional[str] = None
    url: Optional[str] = None
    installed_on: Optional[str] = None
    status: str = "active"
    notes: Optional[str] = None


class SoftwareCreate(SoftwareBase):
    pass


class SoftwareUpdate(BaseModel):
    name: Optional[str] = None
    version: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    license_type: Optional[str] = None
    license_key: Optional[str] = None
    vendor: Optional[str] = None
    url: Optional[str] = None
    installed_on: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class SoftwareResponse(SoftwareBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SoftwareListResponse(BaseModel):
    items: list[SoftwareResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class SubscriptionBase(BaseModel):
    name: str
    provider: Optional[str] = None
    description: Optional[str] = None
    cost: Optional[float] = None
    billing_cycle: str = "monthly"
    start_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    auto_renew: int = 1
    category: Optional[str] = None
    url: Optional[str] = None
    status: str = "active"
    notes: Optional[str] = None


class SubscriptionCreate(SubscriptionBase):
    pass


class SubscriptionUpdate(BaseModel):
    name: Optional[str] = None
    provider: Optional[str] = None
    description: Optional[str] = None
    cost: Optional[float] = None
    billing_cycle: Optional[str] = None
    start_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    auto_renew: Optional[int] = None
    category: Optional[str] = None
    url: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class SubscriptionResponse(SubscriptionBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SubscriptionListResponse(BaseModel):
    items: list[SubscriptionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
