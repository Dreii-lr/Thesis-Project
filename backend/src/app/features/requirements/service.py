"""
service.py — Business domain orchestrator for the Requirements Master Catalog.
Strictly respects the Unit of Work pattern: never calls uow.commit() or uow.rollback().
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
import uuid

import httpx

from app.core.constants import constants

from app.core.exceptions import (
    DomainEntityAlreadyExistsException,
    DomainEntityNotFoundException,
    DomainValidationDomainException,
    ForbiddenException,
)
from app.core.database import async_session_factory
from app.core.unit_of_work import AbstractUnitOfWork
from app.features.requirements.models import (
    Requirement,
    StudentRequirement,
    StudentDocumentUploadAttempt,
    utc_now,
)

from app.features.requirements.schemas import (
    RequirementCreateSchema,
    RequirementListResponseSchema,
    RequirementReadSchema,
    RequirementReorderSchema,
    RequirementStatsSchema,
    RequirementUpdateSchema,
    RequirementUploadResultSchema,
    RequirementVerificationSchema,
    StudentRequirementListResponseSchema,
    StudentRequirementReadSchema,
    StudentRequirementReviewSchema,
)
from app.features.users.schemas import UserRead
from app.shared.schema import AdditionalData, SuccessfulResponseSchema
from app.shared.utils import validate_document_file

logger = logging.getLogger(__name__)

MAX_DAILY_GEMINI_ATTEMPTS: int = 3

AI_VERIFIABLE_KEYWORDS = {
    # PSA
    "psa", "birth", "live birth", "nso",
    # Police Clearance
    "police", "clearance", "nbi",
    # Valid ID
    "valid id", "government id", "national id", "philsys", "passport",
    "driver", "license", "umid", "sss", "postal id", "voter", "prc", "id",
    "identification", "identity",
}


def is_gemini_verifiable_document(
    document_type: Optional[str],
    requirement_code: Optional[str] = None,
) -> bool:
    """
    Determines if the document type or requirement code triggers Gemini Vision AI identity verification.
    Only Valid IDs, PSA Birth Certificates, and Police Clearances trigger Gemini.
    All other documents (RPL, Form 137, ALS forms) bypass Gemini and are reviewed manually.
    """
    if requirement_code:
        code_clean = requirement_code.strip().lower()
        if code_clean in ("psa_police_clearance", "birth", "identity", "valid_id"):
            return True
    if document_type:
        doc_lower = document_type.strip().lower()
        return any(kw in doc_lower for kw in AI_VERIFIABLE_KEYWORDS)
    return False


async def _record_attempt_isolated(
    user_id: str,
    requirement_code: Optional[str] = None,
    document_type: Optional[str] = None,
    is_gemini_verified: bool = True,
    is_successful: bool = False,
    error_message: Optional[str] = None,
) -> None:
    """
    Records a document upload attempt in an isolated database session.
    Committed immediately so that failures in the parent request transaction
    do not roll back or erase the student's attempt history.
    """
    try:
        async with async_session_factory() as session:
            attempt = StudentDocumentUploadAttempt(
                user_id=user_id,
                requirement_code=requirement_code,
                document_type=document_type,
                is_gemini_verified=is_gemini_verified,
                is_successful=is_successful,
                error_message=error_message,
            )
            session.add(attempt)
            await session.commit()
    except Exception as exc:
        logger.error("Failed to record upload attempt for user %s: %s", user_id, exc)


def _dump_model(data: Any) -> Any:
    """Recursively converts Pydantic models to JSON-compatible dictionaries."""
    if hasattr(data, "model_dump"):
        return data.model_dump(mode="json")
    if isinstance(data, list):
        return [_dump_model(item) for item in data]
    if isinstance(data, dict):
        return {k: _dump_model(v) for k, v in data.items()}
    return data


class RequirementService:
    def __init__(self, uow: AbstractUnitOfWork) -> None:
        self.uow = uow

    async def create_requirement(self, data: RequirementCreateSchema) -> SuccessfulResponseSchema:
        clean_code = data.code.strip().lower()

        existing = await self.uow.requirements.get_by_code(clean_code)
        if existing:
            raise DomainEntityAlreadyExistsException(f"Requirement with code '{clean_code}' already exists.")

        requirement = Requirement(
            code=clean_code,
            title=data.title.strip(),
            description=data.description.strip() if data.description else None,
            guidance=data.guidance.strip() if data.guidance else None,
            accepted_document_types=data.accepted_document_types,
            is_required=data.is_required,
            is_conditional=data.is_conditional,
            allow_assistance=data.allow_assistance,
            sample_document_url=data.sample_document_url,
            order_index=data.order_index,
            is_active=data.is_active,
        )

        await self.uow.requirements.create(requirement)
        read_dto = RequirementReadSchema.model_validate(requirement)

        return SuccessfulResponseSchema(
            message="Requirement created successfully.",
            message_status="SUCCESS_CREATED",
            status_code=201,
            data=AdditionalData(resources=_dump_model(read_dto)),
        )

    async def get_requirement(self, id_or_code: str) -> SuccessfulResponseSchema:
        req = await self.uow.requirements.get_by_id_or_code(id_or_code)
        if not req:
            raise DomainEntityNotFoundException(f"Requirement '{id_or_code}' not found.")

        read_dto = RequirementReadSchema.model_validate(req)
        return SuccessfulResponseSchema(
            message="Successfully retrieved requirement.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=_dump_model(read_dto)),
        )

    async def list_requirements(
        self,
        is_required: Optional[bool] = None,
        include_inactive: bool = False,
        offset: int = 0,
        limit: int = 100,
    ) -> SuccessfulResponseSchema:
        items, total = await self.uow.requirements.list(
            is_required=is_required,
            include_inactive=include_inactive,
            offset=offset,
            limit=limit,
        )

        dtos = [RequirementReadSchema.model_validate(item) for item in items]
        response_dto = RequirementListResponseSchema(
            requirements=dtos,
            total=total,
            offset=offset,
            limit=limit,
        )

        return SuccessfulResponseSchema(
            message="Successfully retrieved requirements.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=_dump_model(response_dto)),
        )

    async def update_requirement(
        self,
        requirement_id: str,
        data: RequirementUpdateSchema,
    ) -> SuccessfulResponseSchema:
        req = await self.uow.requirements.get_by_id(requirement_id)
        if not req:
            raise DomainEntityNotFoundException(f"Requirement '{requirement_id}' not found.")

        update_dict: Dict[str, Any] = {}

        # Check code uniqueness if changing code
        if data.code is not None:
            clean_code = data.code.strip().lower()
            if clean_code != req.code:
                existing = await self.uow.requirements.get_by_code(clean_code)
                if existing and existing.requirement_id != req.requirement_id:
                    raise DomainEntityAlreadyExistsException(f"Requirement with code '{clean_code}' already exists.")
                update_dict["code"] = clean_code

        if data.title is not None:
            update_dict["title"] = data.title.strip()
        if data.description is not None:
            update_dict["description"] = data.description.strip() if data.description else None
        if data.guidance is not None:
            update_dict["guidance"] = data.guidance.strip() if data.guidance else None
        if data.accepted_document_types is not None:
            update_dict["accepted_document_types"] = data.accepted_document_types
        if data.is_required is not None:
            update_dict["is_required"] = data.is_required
        if data.is_conditional is not None:
            update_dict["is_conditional"] = data.is_conditional
        if data.allow_assistance is not None:
            update_dict["allow_assistance"] = data.allow_assistance
        if data.sample_document_url is not None:
            update_dict["sample_document_url"] = data.sample_document_url.strip() if data.sample_document_url else None
        if data.order_index is not None:
            update_dict["order_index"] = data.order_index
        if data.is_active is not None:
            update_dict["is_active"] = data.is_active

        update_dict["updated_at"] = utc_now()
        updated_req = await self.uow.requirements.update(requirement_id, update_dict)
        read_dto = RequirementReadSchema.model_validate(updated_req or req)

        return SuccessfulResponseSchema(
            message="Requirement updated successfully.",
            message_status="SUCCESS_UPDATED",
            status_code=200,
            data=AdditionalData(resources=_dump_model(read_dto)),
        )

    async def delete_requirement(
        self,
        requirement_id: str,
        permanent: bool = False,
    ) -> SuccessfulResponseSchema:
        req = await self.uow.requirements.get_by_id(requirement_id)
        if not req:
            raise DomainEntityNotFoundException(f"Requirement '{requirement_id}' not found.")

        if permanent:
            await self.uow.requirements.delete(req)
            msg = "Requirement permanently deleted."
        else:
            req.is_active = False
            req.updated_at = utc_now()
            msg = "Requirement archived successfully."

        return SuccessfulResponseSchema(
            message=msg,
            message_status="SUCCESS_DELETED",
            status_code=200,
        )

    async def toggle_status(self, requirement_id: str) -> SuccessfulResponseSchema:
        req = await self.uow.requirements.get_by_id(requirement_id)
        if not req:
            raise DomainEntityNotFoundException(f"Requirement '{requirement_id}' not found.")

        req.is_active = not req.is_active
        req.updated_at = utc_now()
        action_word = "activated" if req.is_active else "deactivated"
        read_dto = RequirementReadSchema.model_validate(req)

        return SuccessfulResponseSchema(
            message=f"Requirement {action_word} successfully.",
            message_status="SUCCESS_UPDATED",
            status_code=200,
            data=AdditionalData(resources=_dump_model(read_dto)),
        )

    async def reorder_requirements(self, data: RequirementReorderSchema) -> SuccessfulResponseSchema:
        tuples = [(item.requirement_id, item.order_index) for item in data.items]
        await self.uow.requirements.bulk_update_order(tuples)

        return SuccessfulResponseSchema(
            message="Requirements reordered successfully.",
            message_status="SUCCESS_UPDATED",
            status_code=200,
        )

    async def get_default_requirements(self) -> SuccessfulResponseSchema:
        """
        Publicly retrieve active default student requirements directly from the database.
        Zero hardcoded or static data.
        """
        items, total = await self.uow.requirements.list(include_inactive=False)
        dtos = [RequirementReadSchema.model_validate(item) for item in items]
        response_dto = RequirementListResponseSchema(
            requirements=dtos,
            total=total,
            offset=0,
            limit=len(dtos),
        )

        return SuccessfulResponseSchema(
            message="Successfully retrieved default requirements from database.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=_dump_model(response_dto)),
        )

    async def seed_default_requirements(self) -> SuccessfulResponseSchema:
        """
        Validates default requirements in the database.
        Queries the database directly without hardcoded static data.
        """
        items, total = await self.uow.requirements.list(include_inactive=False)
        return SuccessfulResponseSchema(
            message=f"Default requirements verified from database ({total} active).",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources={"active_count": total}),
        )

    async def get_requirements_stats(self) -> SuccessfulResponseSchema:
        stats = await self.uow.requirements.get_stats()
        dto = RequirementStatsSchema(**stats)

        return SuccessfulResponseSchema(
            message="Requirements statistics retrieved successfully.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=_dump_model(dto)),
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Student Requirement Submissions Business Logic
    # ─────────────────────────────────────────────────────────────────────────

    def _resolve_public_file_url(self, file_url: Optional[str], storage_key: Optional[str]) -> Optional[str]:
        """Ensures that requirement document links point to the public view/download endpoint on document-processing-ms
        instead of the private secured Cloudflare R2 S3 endpoint.
        """
        if not file_url:
            return None
        if ("r2.cloudflarestorage.com" in file_url or not file_url.startswith("http")) and storage_key:
            base_ms = constants.DOCS_PROCESSING_SERVICE_URL.rstrip('/')
            clean_key = storage_key.lstrip('/')
            return f"{base_ms}/api/v1/document-processor/requirements/file/{clean_key}"
        return file_url

    def _map_student_requirement_dto(
        self,
        submission: StudentRequirement,
        catalog_req: Optional[Requirement] = None,
        student: Optional[Any] = None,
    ) -> StudentRequirementReadSchema:
        req = catalog_req or submission.__dict__.get("requirement")
        title = req.title if req else None

        stud = student or submission.__dict__.get("student")
        if stud:
            account_id = getattr(stud, "account_id", None)
            first = getattr(stud, "first_name", "") or ""
            last = getattr(stud, "last_name", "") or ""
            name = f"{first} {last}".strip() or None
            cat = getattr(stud, "user_category", None)
            student_category = getattr(cat, "value", str(cat)) if cat else None
        else:
            account_id = submission.account_id
            name = submission.student_name
            student_category = submission.student_category

        mapped_versions = []
        for v in (submission.versions_payload or []):
            if isinstance(v, dict):
                v_copy = dict(v)
                v_copy["file_url"] = self._resolve_public_file_url(v_copy.get("file_url"), v_copy.get("storage_key"))
                mapped_versions.append(v_copy)
            else:
                mapped_versions.append(v)

        return StudentRequirementReadSchema(
            submission_id=submission.submission_id,
            user_id=submission.user_id,
            requirement_id=submission.requirement_id,
            requirement_code=submission.requirement_code,
            requirement_title=title,
            document_type=submission.document_type,
            status=submission.status,
            file_url=self._resolve_public_file_url(submission.file_url, submission.storage_key),
            file_name=submission.file_name,
            file_size_bytes=submission.file_size_bytes,
            mime_type=submission.mime_type,
            storage_key=submission.storage_key,
            student_remarks=submission.student_remarks,

            teacher_feedback=submission.teacher_feedback,
            reviewed_by=submission.reviewed_by,
            reviewed_at=submission.reviewed_at,
            is_conditional=submission.is_conditional,
            requested_assistance=submission.requested_assistance,
            student_name=name,
            account_id=account_id,
            student_category=student_category,
            versions_payload=mapped_versions,
            created_at=submission.created_at,
            updated_at=submission.updated_at,
        )

    async def upload_requirement_file(
        self,
        user_id: str,
        file: Any,
        document_type: Optional[str] = None,
        requirement_code: Optional[str] = None,
        student: Optional[Any] = None,
    ) -> SuccessfulResponseSchema:
        """
        Uploads a student requirement document to Cloudflare R2 via document-processing-ms
        under requirements/{first_name}_{last_name}/ and performs Gemini Vision AI verification
        for AI-verifiable documents (Valid ID, PSA, Police Clearance).
        Limits AI-verified document upload attempts to 3 per day.
        """
        if not file or not getattr(file, "filename", None):
            raise DomainValidationDomainException("A valid document file is required for upload.")

        file_bytes = await file.read()
        validate_document_file(file, file_bytes=file_bytes)

        is_ai_doc = is_gemini_verifiable_document(document_type, requirement_code)
        attempts_today = 0
        if is_ai_doc:
            attempts_today = await self.uow.student_requirements.count_daily_gemini_attempts(user_id)
            if attempts_today >= MAX_DAILY_GEMINI_ATTEMPTS:
                raise DomainValidationDomainException(
                    f"You have reached the maximum limit of {MAX_DAILY_GEMINI_ATTEMPTS} upload attempts for today on your Valid ID. Please try again tomorrow to avoid API rate limits."
                )

        resolved_student = student or await self.uow.users.get_by_id(user_id)
        first_name = (resolved_student.first_name if resolved_student else "") or "Student"
        last_name = (resolved_student.last_name if resolved_student else "") or "Learner"
        middle_name = (resolved_student.middle_name if resolved_student else "") or ""
        dob_str = ""
        gender_str = ""
        if resolved_student and getattr(resolved_student, "personal_details", None):
            p_details = resolved_student.personal_details
            if getattr(p_details, "birth_date", None):
                dob_str = str(p_details.birth_date)
            if getattr(p_details, "gender", None):
                gender_str = str(p_details.gender)

        target_url = f"{constants.DOCS_PROCESSING_SERVICE_URL.rstrip('/')}/api/v1/document-processor/requirements/upload"
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                upload_res = await client.post(
                    target_url,
                    files={"file": (file.filename, file_bytes, getattr(file, "content_type", None) or "application/octet-stream")},
                    data={
                        "first_name": first_name,
                        "last_name": last_name,
                        "middle_name": middle_name,
                        "date_of_birth": dob_str,
                        "gender": gender_str,
                        "document_type": document_type or "",
                    },
                )
                if upload_res.status_code in (200, 201):
                    if is_ai_doc:
                        await _record_attempt_isolated(
                            user_id=user_id,
                            requirement_code=requirement_code,
                            document_type=document_type,
                            is_gemini_verified=True,
                            is_successful=True,
                        )
                    res_data = upload_res.json()
                    verification_dict = res_data.get("verification") or {}
                    raw_file_url = res_data.get("file_url") or ""
                    storage_key = res_data.get("storage_key") or f"requirements/{first_name}_{last_name}/{file.filename}"
                    public_file_url = self._resolve_public_file_url(raw_file_url, storage_key) or raw_file_url
                    upload_result = RequirementUploadResultSchema(
                        file_url=public_file_url,
                        file_name=res_data.get("file_name") or file.filename,
                        file_size_bytes=res_data.get("file_size_bytes") or len(file_bytes),
                        mime_type=res_data.get("mime_type") or getattr(file, "content_type", None) or "application/octet-stream",
                        storage_key=storage_key,
                        folder_name=res_data.get("folder_name") or f"{first_name}_{last_name}",
                        verification=RequirementVerificationSchema(
                            is_auto_verified=verification_dict.get("is_auto_verified", False),
                            suggested_status=verification_dict.get("suggested_status", "review"),
                            confidence_score=verification_dict.get("confidence_score", 0.0),
                            first_name_match=verification_dict.get("first_name_match", False),
                            last_name_match=verification_dict.get("last_name_match", False),
                            dob_match=verification_dict.get("dob_match"),
                            mismatch_reasons=verification_dict.get("mismatch_reasons", []),
                            verification_notes=verification_dict.get("verification_notes", ""),
                        ),
                    )
                    return SuccessfulResponseSchema(
                        message="Requirement document uploaded and verified successfully.",
                        message_status="SUCCESS_CREATED",
                        status_code=201,
                        data=AdditionalData(resources=_dump_model(upload_result)),
                    )
                else:
                    error_msg = "Document verification or upload failed."
                    try:
                        err_json = upload_res.json()
                        if isinstance(err_json, dict) and "detail" in err_json:
                            error_msg = err_json["detail"]
                    except Exception:
                        if upload_res.text:
                            error_msg = upload_res.text
                    logger.error("Doc processor returned error %d: %s", upload_res.status_code, error_msg)
                    if is_ai_doc:
                        await _record_attempt_isolated(
                            user_id=user_id,
                            requirement_code=requirement_code,
                            document_type=document_type,
                            is_gemini_verified=True,
                            is_successful=False,
                            error_message=error_msg,
                        )
                        attempt_num = attempts_today + 1
                        raise DomainValidationDomainException(
                            f"{error_msg} (Attempt {attempt_num} of {MAX_DAILY_GEMINI_ATTEMPTS} used today.)"
                        )
                    else:
                        raise DomainValidationDomainException(f"{error_msg}")
        except DomainValidationDomainException:
            raise
        except Exception as exc:
            if is_ai_doc:
                await _record_attempt_isolated(
                    user_id=user_id,
                    requirement_code=requirement_code,
                    document_type=document_type,
                    is_gemini_verified=True,
                    is_successful=False,
                    error_message=str(exc),
                )
            logger.error(
                "Could not connect to document-processing-ms at %s: %s",
                target_url,
                exc,
            )
            raise DomainValidationDomainException(
                f"Document processing service is currently unavailable: {str(exc)}"
            )

    async def submit_student_requirement(
        self,
        user_id: str,
        requirement_code: str,
        document_type: str,
        file: Optional[Any] = None,
        file_url: Optional[str] = None,
        file_name: Optional[str] = None,
        file_size_bytes: Optional[int] = 0,
        mime_type: Optional[str] = None,
        storage_key: Optional[str] = None,
        student_remarks: Optional[str] = None,
        is_conditional: bool = False,
        requested_assistance: bool = False,
        current_user: Optional[UserRead] = None,
    ) -> SuccessfulResponseSchema:
        """
        Processes a student's document requirement submission or re-submission.
        Uploads document files to Cloudflare R2 via document-processing-ms (under requirements/{first_name}_{last_name}/),
        persists the R2 metadata directly in the database, and archives previous versions on re-submission.
        """
        clean_code = requirement_code.strip().lower()
        catalog_req = await self.uow.requirements.get_by_code(clean_code)

        existing = await self.uow.student_requirements.get_by_student_and_code(user_id, clean_code)

        # Resolve student user object once for verification, metadata directory, and DTO mapping
        student = current_user or await self.uow.users.get_by_id(user_id)

        verification_status = "review"
        verification_feedback = None

        if file and getattr(file, "filename", None):
            upload_response = await self.upload_requirement_file(
                user_id=user_id,
                file=file,
                document_type=document_type,
                requirement_code=clean_code,
                student=student,
            )
            upload_data = upload_response.data.resources if upload_response.data else {}
            file_url = upload_data.get("file_url")
            file_name = upload_data.get("file_name")
            file_size_bytes = upload_data.get("file_size_bytes")
            mime_type = upload_data.get("mime_type")
            storage_key = upload_data.get("storage_key")
            verification = upload_data.get("verification") or {}
            if verification.get("is_auto_verified"):
                verification_status = "verified"
                verification_feedback = f"Auto-verified by AI: {verification.get('verification_notes', 'All identity fields verified.')}"
            elif verification.get("verification_notes"):
                verification_feedback = f"AI Pre-check: {verification.get('verification_notes')}"
        elif file_url:
            file_name = file_name or "document.pdf"
            file_size_bytes = file_size_bytes or 0
            mime_type = mime_type or "application/pdf"
            storage_key = storage_key or None
        elif existing:
            file_url = existing.file_url
            file_name = existing.file_name
            file_size_bytes = existing.file_size_bytes or 0
            mime_type = existing.mime_type
            storage_key = existing.storage_key

        if existing:
            # If a new file or new file_url was uploaded, archive previous version
            if (file_url and existing.file_url and file_url != existing.file_url) or (file and getattr(file, "filename", None) and existing.file_url):
                version_entry = {
                    "file_url": existing.file_url,
                    "file_name": existing.file_name,
                    "file_size_bytes": existing.file_size_bytes,
                    "mime_type": existing.mime_type,
                    "storage_key": existing.storage_key,
                    "document_type": existing.document_type,
                    "student_remarks": existing.student_remarks,
                    "submitted_at": (
                        existing.updated_at.isoformat()
                        if existing.updated_at
                        else existing.created_at.isoformat()
                    ),
                }
                existing.versions_payload = [*existing.versions_payload, version_entry]

            existing.document_type = document_type
            existing.status = verification_status
            if verification_feedback:
                existing.teacher_feedback = verification_feedback
            existing.file_url = file_url
            existing.file_name = file_name
            existing.file_size_bytes = file_size_bytes
            existing.mime_type = mime_type
            existing.storage_key = storage_key
            existing.student_remarks = student_remarks
            existing.is_conditional = is_conditional
            existing.requested_assistance = requested_assistance
            existing.updated_at = utc_now()

            read_dto = self._map_student_requirement_dto(existing, catalog_req, student=student)
            action_msg = "Requirement resubmitted and auto-verified successfully by AI." if verification_status == "verified" else "Requirement resubmitted successfully."
            return SuccessfulResponseSchema(
                message=action_msg,
                message_status="SUCCESS_UPDATED",
                status_code=200,
                data=AdditionalData(resources=_dump_model(read_dto)),
            )

        # Create new submission
        new_submission = StudentRequirement(
            user_id=user_id,
            requirement_id=catalog_req.requirement_id if catalog_req else None,
            requirement_code=clean_code,
            document_type=document_type,
            status=verification_status,
            teacher_feedback=verification_feedback,
            file_url=file_url,
            file_name=file_name,
            file_size_bytes=file_size_bytes,
            mime_type=mime_type,
            storage_key=storage_key,
            student_remarks=student_remarks,
            is_conditional=is_conditional,
            requested_assistance=requested_assistance,
            versions_payload=[],
        )

        await self.uow.student_requirements.create(new_submission)
        read_dto = self._map_student_requirement_dto(new_submission, catalog_req, student=student)
        action_msg = "Requirement submitted and auto-verified successfully by AI." if verification_status == "verified" else "Requirement submitted successfully."

        return SuccessfulResponseSchema(
            message=action_msg,
            message_status="SUCCESS_CREATED",
            status_code=201,
            data=AdditionalData(resources=_dump_model(read_dto)),
        )

    async def get_my_submissions(self, user_id: str) -> SuccessfulResponseSchema:
        """
        Retrieves all requirements submitted by the currently authenticated student.
        """
        items = await self.uow.student_requirements.list_by_student(user_id)
        student = await self.uow.users.get_by_id(user_id)
        dtos = [self._map_student_requirement_dto(item, student=student) for item in items]

        return SuccessfulResponseSchema(
            message="Successfully retrieved student submissions.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources={"submissions": _dump_model(dtos), "total": len(dtos)}),
        )

    async def list_submissions(
        self,
        category: Optional[str] = None,
        status: Optional[str] = None,
        requirement_code: Optional[str] = None,
        search: Optional[str] = None,
        offset: int = 0,
        limit: int = 50,
    ) -> SuccessfulResponseSchema:
        """
        Teacher & Admin view: Query submitted student documents filtered by ALS category,
        review status, requirement slug, or search term.
        """
        items, total = await self.uow.student_requirements.list_submissions(
            category=category,
            status=status,
            requirement_code=requirement_code,
            search=search,
            offset=offset,
            limit=limit,
        )

        dtos = [self._map_student_requirement_dto(item) for item in items]
        response_dto = StudentRequirementListResponseSchema(
            submissions=dtos,
            total=total,
            offset=offset,
            limit=limit,
        )

        return SuccessfulResponseSchema(
            message="Successfully retrieved requirement submissions.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=_dump_model(response_dto)),
        )

    async def get_submission_by_id(
        self,
        submission_id: str,
        current_user: UserRead,
    ) -> SuccessfulResponseSchema:
        """
        Retrieves a single submission by its ID.
        Ensures students can only view their own submissions.
        """
        submission = await self.uow.student_requirements.get_by_id(submission_id)
        if not submission:
            raise DomainEntityNotFoundException(f"Submission '{submission_id}' not found.")

        # Non-admin/non-teacher callers can only view their own submissions
        user_role = getattr(current_user.role, "value", str(current_user.role)).upper()
        if user_role not in ("ADMIN", "TEACHER") and submission.user_id != current_user.user_id:
            raise ForbiddenException("You do not have permission to view this submission.")

        read_dto = self._map_student_requirement_dto(submission)
        return SuccessfulResponseSchema(
            message="Successfully retrieved requirement submission.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=_dump_model(read_dto)),
        )

    async def review_submission(
        self,
        submission_id: str,
        reviewer_user_id: str,
        data: StudentRequirementReviewSchema,
    ) -> SuccessfulResponseSchema:
        """
        Teacher or Admin review mutation: sets verification status ('verified', 'correction',
        'exempted', 'review') and feedback notes, recording an audit event.
        """
        submission = await self.uow.student_requirements.get_by_id(submission_id)
        if not submission:
            raise DomainEntityNotFoundException(f"Submission '{submission_id}' not found.")

        update_dict = {
            "status": data.status,
            "teacher_feedback": data.teacher_feedback.strip() if data.teacher_feedback else None,
            "reviewed_by": reviewer_user_id,
            "reviewed_at": utc_now(),
            "updated_at": utc_now(),
        }
        await self.uow.student_requirements.update(submission_id, update_dict)

        updated = await self.uow.student_requirements.get_by_id(submission_id)
        if not updated:
            raise DomainEntityNotFoundException(f"Submission '{submission_id}' not found.")

        read_dto = self._map_student_requirement_dto(updated)
        return SuccessfulResponseSchema(
            message=f"Submission status updated to '{data.status}'.",
            message_status="SUCCESS_UPDATED",
            status_code=200,
            data=AdditionalData(resources=_dump_model(read_dto)),
        )

    async def delete_submission(
        self,
        submission_id: str,
        current_user: UserRead,
    ) -> SuccessfulResponseSchema:
        """
        Deletes a student submission. Students can delete their own; Admins can delete any.
        """
        submission = await self.uow.student_requirements.get_by_id(submission_id)
        if not submission:
            raise DomainEntityNotFoundException(f"Submission '{submission_id}' not found.")

        user_role = getattr(current_user.role, "value", str(current_user.role)).upper()
        if user_role != "ADMIN" and submission.user_id != current_user.user_id:
            raise ForbiddenException("You do not have permission to delete this submission.")

        await self.uow.student_requirements.delete(submission)

        return SuccessfulResponseSchema(
            message="Submission deleted successfully.",
            message_status="SUCCESS_DELETED",
            status_code=200,
        )

    async def get_my_upload_attempts(self, user_id: str) -> SuccessfulResponseSchema:
        """
        Retrieves the student's daily upload attempts status for Gemini AI verified documents.
        """
        summary = await self.uow.student_requirements.get_daily_attempt_summary(
            user_id=user_id,
            max_daily_attempts=MAX_DAILY_GEMINI_ATTEMPTS,
        )
        return SuccessfulResponseSchema(
            message="Daily upload attempt summary retrieved successfully.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=summary),
        )



