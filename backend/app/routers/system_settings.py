import json
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db, require_admin
from app.models.audit_log import AuditLog
from app.models.system_settings import SystemSetting
from app.models.user import User
from app.schemas.system_settings import (
    SystemSettingBulkUpdate,
    SystemSettingResponse,
    SystemSettingUpdate,
)

router = APIRouter(prefix="/settings", tags=["settings"])

DEFAULT_SETTINGS = [
    {
        "key": "general.app_name",
        "value": "HomeLab Manager",
        "value_type": "string",
        "category": "general",
        "description": "Application display name",
    },
    {
        "key": "general.app_description",
        "value": "Manage your homelab inventory and infrastructure",
        "value_type": "string",
        "category": "general",
        "description": "Application description",
    },
    {
        "key": "general.registration_enabled",
        "value": "false",
        "value_type": "boolean",
        "category": "general",
        "description": "Allow new user registration",
    },
    {
        "key": "general.default_user_role",
        "value": "user",
        "value_type": "string",
        "category": "general",
        "description": "Default role for new users",
    },
    {
        "key": "appearance.theme",
        "value": "dark",
        "value_type": "string",
        "category": "appearance",
        "description": "UI theme (dark or light)",
    },
    {
        "key": "appearance.accent_color",
        "value": "emerald",
        "value_type": "string",
        "category": "appearance",
        "description": "UI accent color",
    },
    {
        "key": "appearance.sidebar_collapsed",
        "value": "false",
        "value_type": "boolean",
        "category": "appearance",
        "description": "Whether the sidebar is collapsed by default",
    },
    {
        "key": "integrations.anthropic_api_key",
        "value": "",
        "value_type": "string",
        "category": "integrations",
        "description": "Anthropic API key for invoice parsing",
    },
    {
        "key": "integrations.proxmox_enabled",
        "value": "true",
        "value_type": "boolean",
        "category": "integrations",
        "description": "Enable Proxmox integration",
    },
    {
        "key": "integrations.bambulab_enabled",
        "value": "true",
        "value_type": "boolean",
        "category": "integrations",
        "description": "Enable BambuLab integration",
    },
    {
        "key": "notifications.low_stock_alerts",
        "value": "true",
        "value_type": "boolean",
        "category": "notifications",
        "description": "Enable low stock alert notifications",
    },
    {
        "key": "notifications.maintenance_reminders",
        "value": "true",
        "value_type": "boolean",
        "category": "notifications",
        "description": "Enable maintenance reminder notifications",
    },
    {
        "key": "notifications.subscription_expiry_days",
        "value": "30",
        "value_type": "integer",
        "category": "notifications",
        "description": "Days before subscription expiry to send reminder",
    },
]


def init_default_settings(db: Session) -> None:
    """Initialize default settings, creating any that don't already exist."""
    existing_keys = {
        row.key for row in db.query(SystemSetting.key).all()
    }
    added = False
    for s in DEFAULT_SETTINGS:
        if s["key"] not in existing_keys:
            db.add(SystemSetting(**s))
            added = True
    if added:
        db.commit()


@router.get("", response_model=dict)
def list_settings(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List all settings grouped by category. Requires auth."""
    settings = db.query(SystemSetting).order_by(SystemSetting.category, SystemSetting.key).all()
    grouped: dict[str, list] = defaultdict(list)
    for s in settings:
        category = s.category or "other"
        grouped[category].append(SystemSettingResponse.model_validate(s).model_dump())
    return dict(grouped)


@router.get("/{key}", response_model=SystemSettingResponse)
def get_setting(
    key: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get a single setting by key."""
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setting not found")
    return SystemSettingResponse.model_validate(setting)


@router.put("/bulk")
def bulk_update_settings(
    body: SystemSettingBulkUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Update multiple settings at once (admin only)."""
    updated = []
    for item in body.settings:
        setting = db.query(SystemSetting).filter(SystemSetting.key == item.key).first()
        if setting:
            old_value = setting.value
            setting.value = item.value
            setting.updated_by_id = admin.id
            updated.append(item.key)

            audit = AuditLog(
                user_id=admin.id,
                action="settings_change",
                entity_type="settings",
                details=json.dumps({"key": item.key, "old_value": old_value, "new_value": item.value}),
            )
            db.add(audit)

    db.commit()
    return {"detail": f"Updated {len(updated)} settings", "updated_keys": updated}


@router.put("/{key}", response_model=SystemSettingResponse)
def update_setting(
    key: str,
    body: SystemSettingUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Update a single setting value (admin only). Creates an audit log."""
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setting not found")

    old_value = setting.value
    setting.value = body.value
    setting.updated_by_id = admin.id

    audit = AuditLog(
        user_id=admin.id,
        action="settings_change",
        entity_type="settings",
        details=json.dumps({"key": key, "old_value": old_value, "new_value": body.value}),
    )
    db.add(audit)
    db.commit()
    db.refresh(setting)
    return SystemSettingResponse.model_validate(setting)
