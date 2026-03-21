import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.audit_log import AuditLog
from app.models.system_settings import SystemSetting
from app.models.user import User
from app.schemas.user import (
    ChangePasswordRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from app.services.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    request: Request = None,
):
    """Authenticate user and return access + refresh tokens."""
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    # Update last_login
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    # Create audit log
    audit = AuditLog(
        user_id=user.id,
        action="login",
        entity_type="user",
        entity_id=user.id,
        ip_address=request.client.host if request and request.client else None,
    )
    db.add(audit)
    db.commit()

    access_token = create_access_token(data={"sub": user.username})
    refresh_token = create_refresh_token(data={"sub": user.username})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    request: Request = None,
):
    """Register a new user. Allowed if no users exist or registration is enabled."""
    user_count = db.query(User).count()

    if user_count > 0:
        # Check if registration is enabled
        reg_setting = (
            db.query(SystemSetting)
            .filter(SystemSetting.key == "general.registration_enabled")
            .first()
        )
        if not reg_setting or reg_setting.value != "true":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Registration is disabled",
            )

    # Check for duplicate username
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists",
        )
    # Check for duplicate email
    if user_data.email:
        if db.query(User).filter(User.email == user_data.email).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists",
            )

    # First user becomes admin; subsequent registrations are always "user"
    role = "admin" if user_count == 0 else "user"

    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create audit log
    audit = AuditLog(
        user_id=new_user.id,
        action="create",
        entity_type="user",
        entity_id=new_user.id,
        details=json.dumps({"username": new_user.username, "role": new_user.role}),
        ip_address=request.client.host if request and request.client else None,
    )
    db.add(audit)
    db.commit()

    access_token = create_access_token(data={"sub": new_user.username})
    refresh_token = create_refresh_token(data={"sub": new_user.username})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user),
    )


@router.post("/refresh", response_model=dict)
def refresh_token(body: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Exchange a refresh token for a new access token."""
    from jose import JWTError

    try:
        payload = decode_token(body.refresh_token)
        username: str = payload.get("sub")
        token_type: str = payload.get("type")
        if username is None or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    new_access_token = create_access_token(data={"sub": user.username})
    return {"access_token": new_access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the current authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
def update_me(
    updates: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's own profile (full_name, email only)."""
    if updates.full_name is not None:
        current_user.full_name = updates.full_name
    if updates.email is not None:
        # Check for duplicate email
        existing = db.query(User).filter(User.email == updates.email, User.id != current_user.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already in use",
            )
        current_user.email = updates.email
    # Don't allow self role/is_active changes via this endpoint
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.put("/me/password")
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change the current user's password."""
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    current_user.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"detail": "Password changed successfully"}


@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None,
):
    """Log out the current user. Creates an audit log entry. Token invalidation is client-side."""
    audit = AuditLog(
        user_id=current_user.id,
        action="logout",
        entity_type="user",
        entity_id=current_user.id,
        ip_address=request.client.host if request and request.client else None,
    )
    db.add(audit)
    db.commit()
    return {"detail": "Logged out successfully"}
