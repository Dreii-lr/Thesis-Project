"""
test_assessments.py — Unit and integration tests for the Assessment Subsystem.
Tests cover:
- Teacher authoring of Activities & Multi-Category Quizzes/Exams.
- DepEd ALS UserCategory targeting & filtering.
- In-place PUT editing of question pools and configurations.
- Student attempt session start, random question sampling, anti-cheat answer key stripping.
- Objective auto-grading of Multiple Choice, True/False, and Matching Type questions.
- Subjective Activity submission and teacher manual grading.
- RBAC authorization checks.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.features.assessments.models import TaskStatus, TaskType
from app.core.dependencies import get_current_active_user
from app.features.users.models import UserCategory, UserRole, UserStatus
from app.features.users.schemas import UserRead
from app.main import app


# ── Mock User Fixtures ─────────────────────────────────────────────────────────

def teacher_user() -> UserRead:
    return UserRead(
        user_id="teacher-uuid-als",
        employee_id="EMP-ALS-001",
        email="teacher.als@deped.gov.ph",
        role=UserRole.TEACHER,
        status=UserStatus.ACTIVE,
        first_name="Maria",
        last_name="Santos",
    )


def student_junior_user() -> UserRead:
    return UserRead(
        user_id="student-junior-uuid",
        student_id="ALS-JHS-001",
        email="junior.student@als.edu.ph",
        role=UserRole.STUDENT,
        user_category=UserCategory.SECONDARY,  # "junior"
        status=UserStatus.ACTIVE,
        first_name="Juan",
        last_name="Dela Cruz",
    )


def student_elementary_user() -> UserRead:
    return UserRead(
        user_id="student-elem-uuid",
        student_id="ALS-ELEM-001",
        email="elem.student@als.edu.ph",
        role=UserRole.STUDENT,
        user_category=UserCategory.ELEMENTARY,  # "elementary"
        status=UserStatus.ACTIVE,
        first_name="Pedro",
        last_name="Penduko",
    )


# ── Sample Multi-Category Quiz Payload ────────────────────────────────────────

def sample_quiz_payload() -> dict:
    return {
        "title": "ALS LS1 Communication Skills Mastery Quiz",
        "description": "Comprehensive quiz covering vocabulary, grammar, and reading comprehension.",
        "subject_code": "LS1",
        "target_category": "junior",  # UserCategory.SECONDARY
        "assessment_type": "QUIZ",
        "status": "ACTIVE",
        "grace_period_minutes": 10,
        "duration_minutes": 30,
        "categories_data": [
            {
                "category_id": "cat-mc-1",
                "type": "Multiple Choice",
                "pool_size": 3,
                "required_count": 2,
                "points_per_item": 5.0,
                "is_expanded": True,
                "questions": [
                    {
                        "id": "mc-q1",
                        "text": "What is the primary function of a noun?",
                        "options": ["To name a person, place, or thing", "To describe an action", "To connect clauses"],
                        "correct_answer": "To name a person, place, or thing",
                    },
                    {
                        "id": "mc-q2",
                        "text": "Which word is an antonym for 'expand'?",
                        "options": ["Contract", "Grow", "Widen"],
                        "correct_answer": "Contract",
                    },
                    {
                        "id": "mc-q3",
                        "text": "Identify the conjunction in: 'I wanted to go, but it rained.'",
                        "options": ["wanted", "but", "rained"],
                        "correct_answer": "but",
                    },
                ],
            },
            {
                "category_id": "cat-tf-1",
                "type": "True/False",
                "pool_size": 2,
                "required_count": 1,
                "points_per_item": 2.5,
                "is_expanded": True,
                "questions": [
                    {
                        "id": "tf-q1",
                        "text": "A sentence must always end with a punctuation mark.",
                        "options": ["True", "False"],
                        "correct_answer": "True",
                    },
                    {
                        "id": "tf-q2",
                        "text": "Synonyms are words with opposite meanings.",
                        "options": ["True", "False"],
                        "correct_answer": "False",
                    },
                ],
            },
            {
                "category_id": "cat-mt-1",
                "type": "Matching Type",
                "pool_size": 2,
                "required_count": 2,
                "points_per_item": 2.5,
                "is_expanded": True,
                "questions": [
                    {
                        "id": "mt-q1",
                        "premise": "Simile",
                        "match": "Comparison using like or as",
                    },
                    {
                        "id": "mt-q2",
                        "premise": "Metaphor",
                        "match": "Direct comparison without like or as",
                    },
                ],
            },
        ],
    }


# ── Test Cases ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_teacher_create_and_update_assessment(client: AsyncClient):
    """
    Teacher creates a multi-category Quiz, verifies score computation,
    and performs an in-place PUT update.
    """
    app.dependency_overrides[get_current_active_user] = teacher_user

    try:
        # 1. Create Quiz
        payload = sample_quiz_payload()
        res = await client.post("/api/v1/assessments/", json=payload)
        assert res.status_code == 201
        data = res.json()["data"]["resources"]

        assessment_id = data["assessment_id"]
        assert data["title"] == payload["title"]
        assert data["target_category"] == "junior"
        assert data["status"] == "ACTIVE"
        # Computed max_score = (2 * 5.0) + (1 * 2.5) + (2 * 2.5) = 10.0 + 2.5 + 5.0 = 17.5
        assert data["max_score"] == 17.5
        assert len(data["categories_data"]) == 3

        # 2. In-place PUT update: modify title and question pool
        update_payload = {
            "title": "ALS LS1 Updated Quiz 2026",
            "duration_minutes": 45,
            "categories_data": [
                {
                    "category_id": "cat-mc-1",
                    "type": "Multiple Choice",
                    "pool_size": 1,
                    "required_count": 1,
                    "points_per_item": 10.0,
                    "is_expanded": True,
                    "questions": [
                        {
                            "id": "mc-q1-updated",
                            "text": "What is an adverb?",
                            "options": ["Modifies a verb", "A naming word"],
                            "correct_answer": "Modifies a verb",
                        }
                    ],
                }
            ],
        }
        put_res = await client.put(f"/api/v1/assessments/{assessment_id}", json=update_payload)
        assert put_res.status_code == 200
        put_data = put_res.json()["data"]["resources"]
        assert put_data["title"] == "ALS LS1 Updated Quiz 2026"
        assert put_data["duration_minutes"] == 45
        assert put_data["max_score"] == 10.0
        assert len(put_data["categories_data"]) == 1
        assert put_data["categories_data"][0]["questions"][0]["id"] == "mc-q1-updated"

        # 3. Teacher list endpoint
        list_res = await client.get("/api/v1/assessments/teacher/list")
        assert list_res.status_code == 200
        items = list_res.json()["data"]["resources"]
        assert any(item["id"] == assessment_id for item in items)

    finally:
        app.dependency_overrides.pop(get_current_active_user, None)


@pytest.mark.asyncio
async def test_student_category_targeting(client: AsyncClient):
    """
    Junior High student sees junior-targeted assessments; Elementary student does NOT.
    Both see universal (target_category=None) assessments.
    """
    # 1. As Teacher, create 1 Junior-specific and 1 Universal assessment
    app.dependency_overrides[get_current_active_user] = teacher_user

    try:
        junior_task = {
            "title": "Junior High English Exercise",
            "subject_code": "LS1",
            "target_category": "junior",
            "assessment_type": "ACTIVITY",
            "status": "ACTIVE",
        }
        res1 = await client.post("/api/v1/assessments/", json=junior_task)
        assert res1.status_code == 201
        junior_id = res1.json()["data"]["resources"]["assessment_id"]

        universal_task = {
            "title": "General Orientation Activity",
            "subject_code": "LS4",
            "target_category": None,
            "assessment_type": "ACTIVITY",
            "status": "ACTIVE",
        }
        res2 = await client.post("/api/v1/assessments/", json=universal_task)
        assert res2.status_code == 201
        universal_id = res2.json()["data"]["resources"]["assessment_id"]
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)

    # 2. As Junior Student, list tasks -> should see BOTH
    app.dependency_overrides[get_current_active_user] = student_junior_user
    try:
        j_res = await client.get("/api/v1/assessments/student/my-tasks")
        assert j_res.status_code == 200
        j_ids = [t["assessment_id"] for t in j_res.json()["data"]["resources"]]
        assert junior_id in j_ids
        assert universal_id in j_ids
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)

    # 3. As Elementary Student, list tasks -> should see ONLY universal
    app.dependency_overrides[get_current_active_user] = student_elementary_user
    try:
        e_res = await client.get("/api/v1/assessments/student/my-tasks")
        assert e_res.status_code == 200
        e_ids = [t["assessment_id"] for t in e_res.json()["data"]["resources"]]
        assert junior_id not in e_ids
        assert universal_id in e_ids

        # Attempting to start junior-targeted task raises 403 Forbidden
        start_res = await client.post(f"/api/v1/assessments/{junior_id}/start")
        assert start_res.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)


@pytest.mark.asyncio
async def test_student_quiz_attempt_and_auto_grading(client: AsyncClient):
    """
    Test student starting attempt:
    - Random sampling from pool
    - Answer key stripped (correct_answer and match hidden)
    - Shuffled matching pool created
    - Objective auto-grading computes score accurately
    """
    # 1. Teacher creates multi-category Quiz
    app.dependency_overrides[get_current_active_user] = teacher_user
    try:
        payload = sample_quiz_payload()
        res = await client.post("/api/v1/assessments/", json=payload)
        assessment_id = res.json()["data"]["resources"]["assessment_id"]
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)

    # 2. Junior student starts attempt
    app.dependency_overrides[get_current_active_user] = student_junior_user
    try:
        start_res = await client.post(f"/api/v1/assessments/{assessment_id}/start")
        assert start_res.status_code == 200
        delivery = start_res.json()["data"]["resources"]

        questions = delivery["questions"]
        # Required counts: 2 MC + 1 TF + 2 MT = 5 questions delivered
        assert len(questions) == 5

        # Anti-Cheating Verifications:
        for q in questions:
            assert "correct_answer" not in q or q.get("correct_answer") is None
            if q["category_type"] == "Matching Type":
                # Direct match is stripped
                assert q.get("match") is None
                # Matching pool (shuffled Column B) is present
                assert q.get("matching_pool") is not None
                assert len(q["matching_pool"]) == 2

        # Verify idempotency: calling start again yields identical questions
        start2_res = await client.post(f"/api/v1/assessments/{assessment_id}/start")
        assert start2_res.status_code == 200
        delivered_ids_1 = [q["id"] for q in questions]
        delivered_ids_2 = [q["id"] for q in start2_res.json()["data"]["resources"]["questions"]]
        assert delivered_ids_1 == delivered_ids_2

        # 3. Student submits answers
        # Prepare correct answers according to answer key
        answer_lookup = {
            "mc-q1": "To name a person, place, or thing",
            "mc-q2": "Contract",
            "mc-q3": "but",
            "tf-q1": "True",
            "tf-q2": "False",
            "mt-q1": "Comparison using like or as",
            "mt-q2": "Direct comparison without like or as",
        }

        # Answer all delivered questions correctly EXCEPT the first one
        student_answers = []
        for i, q in enumerate(questions):
            qid = q["id"]
            if i == 0:
                ans = "Wrong answer deliberate"
            else:
                ans = answer_lookup.get(qid, "")
            student_answers.append({"question_id": qid, "student_answer": ans})

        submit_payload = {
            "answers": student_answers,
            "time_spent_seconds": 320,
        }
        submit_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit", json=submit_payload)
        assert submit_res.status_code == 200
        sub_data = submit_res.json()["data"]["resources"]

        assert sub_data["status"] == "GRADED"
        assert sub_data["student_id"] == "student-junior-uuid"
        assert sub_data["student_category"] == "junior"
        # First question was worth points depending on category, auto_score should be > 0 and < max_score
        assert 0.0 < sub_data["auto_score"] < delivery["max_score"]
        assert sub_data["final_score"] == sub_data["auto_score"]

        # 4. Student views result
        result_res = await client.get(f"/api/v1/assessments/{assessment_id}/my-result")
        assert result_res.status_code == 200
        res_data = result_res.json()["data"]["resources"]
        assert res_data["submission_id"] == sub_data["submission_id"]
        assert res_data["status"] == "GRADED"

        # 5. Submitting again raises error
        dup_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit", json=submit_payload)
        assert dup_res.status_code == 400

    finally:
        app.dependency_overrides.pop(get_current_active_user, None)


@pytest.mark.asyncio
async def test_subjective_activity_submission_and_manual_grading(client: AsyncClient):
    """
    Test subjective Activity lifecycle:
    - Teacher creates Activity with attached guide materials.
    - Student submits activity with file attachments.
    - Status is SUBMITTED, awaiting teacher evaluation.
    - Teacher grades submission with manual score and feedback.
    """
    # 1. Teacher creates Activity
    app.dependency_overrides[get_current_active_user] = teacher_user
    try:
        activity_payload = {
            "title": "Community Life Story Essay",
            "description": "Write a 500-word essay about your life journey in the ALS program.",
            "subject_code": "LS1",
            "target_category": None,
            "assessment_type": "ACTIVITY",
            "status": "ACTIVE",
            "max_score": 50.0,
            "materials": [
                {
                    "file_name": "essay_rubric.pdf",
                    "file_url": "https://storage.als.edu.ph/materials/essay_rubric.pdf",
                    "file_type": "application/pdf",
                    "file_size_bytes": 102400,
                }
            ],
        }
        res = await client.post("/api/v1/assessments/", json=activity_payload)
        assert res.status_code == 201
        activity_id = res.json()["data"]["resources"]["assessment_id"]
        assert len(res.json()["data"]["resources"]["materials"]) == 1
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)

    # 2. Student submits activity
    app.dependency_overrides[get_current_active_user] = student_junior_user
    try:
        submit_payload = {
            "attachments": [
                {
                    "file_name": "my_life_story_juan.docx",
                    "file_url": "https://storage.als.edu.ph/submissions/my_life_story_juan.docx",
                    "file_size_bytes": 45000,
                }
            ],
            "time_spent_seconds": 1800,
        }
        sub_res = await client.post(f"/api/v1/assessments/{activity_id}/submit", json=submit_payload)
        assert sub_res.status_code == 200
        sub_data = sub_res.json()["data"]["resources"]
        submission_id = sub_data["submission_id"]
        assert sub_data["status"] == "SUBMITTED"
        assert sub_data["auto_score"] == 0.0
        assert sub_data["final_score"] == 0.0
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)

    # 3. Teacher views submissions and grades it
    app.dependency_overrides[get_current_active_user] = teacher_user
    try:
        list_subs_res = await client.get(f"/api/v1/assessments/{activity_id}/submissions")
        assert list_subs_res.status_code == 200
        subs = list_subs_res.json()["data"]["resources"]
        assert len(subs) == 1
        assert subs[0]["submission_id"] == submission_id
        assert subs[0]["status"] == "SUBMITTED"

        # Grade the submission
        grade_payload = {
            "manual_score": 48.0,
            "feedback": "Outstanding reflection and well-structured arguments. Keep up the great work!",
        }
        grade_res = await client.post(
            f"/api/v1/assessments/{activity_id}/submissions/{submission_id}/grade",
            json=grade_payload,
        )
        assert grade_res.status_code == 200
        graded_data = grade_res.json()["data"]["resources"]
        assert graded_data["status"] == "GRADED"
        assert graded_data["manual_score"] == 48.0
        assert graded_data["final_score"] == 48.0
        assert graded_data["feedback"] == grade_payload["feedback"]
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)

    # 4. Student checks updated result
    app.dependency_overrides[get_current_active_user] = student_junior_user
    try:
        result_res = await client.get(f"/api/v1/assessments/{activity_id}/my-result")
        assert result_res.status_code == 200
        student_view = result_res.json()["data"]["resources"]
        assert student_view["status"] == "GRADED"
        assert student_view["final_score"] == 48.0
        assert student_view["feedback"] == "Outstanding reflection and well-structured arguments. Keep up the great work!"
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)


@pytest.mark.asyncio
async def test_rbac_restrictions(client: AsyncClient):
    """Verify students cannot author assessments and teachers cannot submit as students."""
    # Student cannot create assessment
    app.dependency_overrides[get_current_active_user] = student_junior_user
    try:
        res = await client.post("/api/v1/assessments/", json={"title": "Hack Attempt", "subject_code": "LS1", "assessment_type": "QUIZ"})
        assert res.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)

    # Teacher cannot call student start endpoint
    app.dependency_overrides[get_current_active_user] = teacher_user
    try:
        res = await client.post("/api/v1/assessments/any-id/start")
        assert res.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)


@pytest.mark.asyncio
async def test_three_categories_with_matching_distractors(client: AsyncClient):
    """
    Test quiz with all 3 categories (Multiple Choice, True/False, and Matching Type with distractors).
    Verifies:
    - 3-category creation and dynamic score calculation.
    - Anti-cheating answer stripping for all categories.
    - Matching pool generation combining correct matches with category distractors.
    - Auto-grading awarding 0 points for distractor selections.
    """
    # 1. Teacher creates Quiz with all 3 categories
    app.dependency_overrides[get_current_active_user] = teacher_user
    try:
        payload = {
            "title": "Comprehensive ICT & Computer Systems Exam",
            "subject_code": "ICT-101",
            "target_category": "junior",
            "assessment_type": "QUIZ",
            "status": "ACTIVE",
            "duration_minutes": 30,
            "categories_data": [
                {
                    "category_id": "cat_mcq",
                    "type": "Multiple Choice",
                    "pool_size": 2,
                    "required_count": 2,
                    "points_per_item": 5.0,
                    "questions": [
                        {
                            "id": "mcq-1",
                            "text": "What does CPU stand for?",
                            "options": ["Central Processing Unit", "Computer Power Utility"],
                            "correct_answer": "Central Processing Unit",
                        },
                        {
                            "id": "mcq-2",
                            "text": "Which memory is volatile?",
                            "options": ["RAM", "ROM"],
                            "correct_answer": "RAM",
                        },
                    ],
                },
                {
                    "category_id": "cat_tf",
                    "type": "True/False",
                    "pool_size": 2,
                    "required_count": 2,
                    "points_per_item": 2.5,
                    "questions": [
                        {
                            "id": "tf-1",
                            "text": "An operating system is an example of hardware.",
                            "correct_answer": "False",
                        },
                        {
                            "id": "tf-2",
                            "text": "SSDs use flash memory without moving mechanical parts.",
                            "correct_answer": "True",
                        },
                    ],
                },
                {
                    "category_id": "cat_mt",
                    "type": "Matching Type",
                    "pool_size": 2,
                    "required_count": 2,
                    "points_per_item": 5.0,
                    "distractors": ["Motherboard", "Power Supply Unit (PSU)"],
                    "questions": [
                        {
                            "id": "mt-1",
                            "premise": "Interprets instructions and manages calculations as the computer brain",
                            "match": "CPU",
                        },
                        {
                            "id": "mt-2",
                            "premise": "Non-volatile permanent storage for programs and user files",
                            "match": "Solid State Drive",
                        },
                    ],
                },
            ],
        }

        res = await client.post("/api/v1/assessments/", json=payload)
        assert res.status_code == 201
        data = res.json()["data"]["resources"]
        assessment_id = data["assessment_id"]
        # Expected max score: (2 * 5.0) + (2 * 2.5) + (2 * 5.0) = 10.0 + 5.0 + 10.0 = 25.0
        assert data["max_score"] == 25.0
        assert len(data["categories_data"]) == 3
        # Verify distractors are saved in categories_data
        mt_cat = next(c for c in data["categories_data"] if c["type"] == "Matching Type")
        assert len(mt_cat["distractors"]) == 2
        assert "Motherboard" in mt_cat["distractors"]
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)

    # 2. Junior student starts attempt
    app.dependency_overrides[get_current_active_user] = student_junior_user
    try:
        start_res = await client.post(f"/api/v1/assessments/{assessment_id}/start")
        assert start_res.status_code == 200
        delivery = start_res.json()["data"]["resources"]
        assert len(delivery["questions"]) == 6  # 2 MC + 2 TF + 2 MT

        # Verify Matching Type delivered pool includes matches AND distractors (2 + 2 = 4 total)
        mt_questions = [q for q in delivery["questions"] if q["category_type"] == "Matching Type"]
        assert len(mt_questions) == 2
        pool = mt_questions[0]["matching_pool"]
        assert len(pool) == 4
        assert "CPU" in pool
        assert "Solid State Drive" in pool
        assert "Motherboard" in pool
        assert "Power Supply Unit (PSU)" in pool
        # Anti-cheat verification
        assert mt_questions[0].get("match") is None

        # 3. Student submits answers:
        # MC: 2 correct (10.0 pts)
        # TF: 2 correct (5.0 pts)
        # MT: mt-1 correct (5.0 pts), mt-2 deliberately chooses distractor 'Motherboard' (0.0 pts)
        student_answers = [
            {"question_id": "mcq-1", "student_answer": "Central Processing Unit"},
            {"question_id": "mcq-2", "student_answer": "RAM"},
            {"question_id": "tf-1", "student_answer": "False"},
            {"question_id": "tf-2", "student_answer": "True"},
            {"question_id": "mt-1", "student_answer": "CPU"},
            {"question_id": "mt-2", "student_answer": "Motherboard"},  # Distractor chosen!
        ]

        submit_payload = {"answers": student_answers, "time_spent_seconds": 600}
        sub_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit", json=submit_payload)
        assert sub_res.status_code == 200
        sub_data = sub_res.json()["data"]["resources"]

        assert sub_data["status"] == "GRADED"
        # Total points: 5.0 + 5.0 + 2.5 + 2.5 + 5.0 + 0.0 = 20.0
        assert sub_data["auto_score"] == 20.0
        assert sub_data["final_score"] == 20.0

        # Verify item breakdown in submission
        graded_items = sub_data["answers_payload"]["answers"]
        mt_distractor_item = next(item for item in graded_items if item["question_id"] == "mt-2")
        assert mt_distractor_item["is_correct"] is False
        assert mt_distractor_item["points_awarded"] == 0.0
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)


@pytest.mark.asyncio
async def test_hybrid_quiz_with_essay_lifecycle(client: AsyncClient):
    """
    Test full hybrid assessment lifecycle:
    1. Teacher creates Quiz with 1 Multiple Choice item (5.0 pts) and 1 Essay item (10.0 pts).
    2. Student starts attempt; verify Essay prompt and rubric are delivered.
    3. Student submits answers; verify MC is auto-graded (5.0), Essay is flagged for review,
       and submission status remains SUBMITTED (not immediately GRADED).
    4. Teacher views submission in grading queue and manually grades the essay with 9.0 pts.
    5. Verify final_score is combined: 5.0 (auto) + 9.0 (manual) = 14.0 pts, and status is GRADED.
    """
    # 1. Teacher creates hybrid Quiz
    app.dependency_overrides[get_current_active_user] = teacher_user
    try:
        hybrid_payload = {
            "title": "ALS LS6 Digital Security with Essay",
            "subject_code": "LS6",
            "target_category": "junior",
            "assessment_type": "QUIZ",
            "status": "ACTIVE",
            "duration_minutes": 45,
            "categories_data": [
                {
                    "category_id": "cat_mc_hybrid",
                    "type": "Multiple Choice",
                    "pool_size": 1,
                    "required_count": 1,
                    "points_per_item": 5.0,
                    "questions": [
                        {
                            "id": "mc-hybrid-1",
                            "text": "What does 2FA stand for?",
                            "options": ["Two-Factor Authentication", "Two-File Access", "Terminal Format Array"],
                            "correct_answer": "Two-Factor Authentication",
                        }
                    ],
                },
                {
                    "category_id": "cat_essay_hybrid",
                    "type": "Essay",
                    "pool_size": 1,
                    "required_count": 1,
                    "points_per_item": 10.0,
                    "questions": [
                        {
                            "id": "essay-hybrid-1",
                            "text": "Explain why Two-Factor Authentication is critical for protecting online accounts.",
                            "premise": "Rubric: Definition (4 pts), Practical Benefit (6 pts)",
                        }
                    ],
                },
            ],
        }
        create_res = await client.post("/api/v1/assessments/", json=hybrid_payload)
        assert create_res.status_code == 201
        res_data = create_res.json()["data"]["resources"]
        assessment_id = res_data["assessment_id"]
        assert res_data["max_score"] == 15.0  # 5.0 + 10.0
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)

    # 2. Student starts attempt
    app.dependency_overrides[get_current_active_user] = student_junior_user
    try:
        start_res = await client.post(f"/api/v1/assessments/{assessment_id}/start")
        assert start_res.status_code == 200
        delivery = start_res.json()["data"]["resources"]
        assert len(delivery["questions"]) == 2

        # Verify delivered Essay question
        essay_q = next(q for q in delivery["questions"] if q["category_type"] == "Essay")
        assert essay_q["text"] == "Explain why Two-Factor Authentication is critical for protecting online accounts."
        assert essay_q["premise"] == "Rubric: Definition (4 pts), Practical Benefit (6 pts)"
        assert essay_q.get("options") is None
        assert essay_q.get("correct_answer") is None

        # 3. Student submits attempt
        submit_payload = {
            "answers": [
                {"question_id": "mc-hybrid-1", "student_answer": "Two-Factor Authentication"},
                {
                    "question_id": "essay-hybrid-1",
                    "student_answer": "Two-Factor Authentication adds an extra security layer beyond just passwords by requiring a second verification method like an OTP code.",
                },
            ],
            "time_spent_seconds": 900,
        }
        sub_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit", json=submit_payload)
        assert sub_res.status_code == 200
        sub_data = sub_res.json()["data"]["resources"]
        submission_id = sub_data["submission_id"]

        # Crucial check: status MUST be SUBMITTED because essay requires teacher review!
        assert sub_data["status"] == "SUBMITTED"
        assert sub_data["auto_score"] == 5.0
        assert sub_data["manual_score"] == 0.0
        assert sub_data["final_score"] == 5.0  # Provisional objective score

        # Check answers breakdown
        answers_list = sub_data["answers_payload"]["answers"]
        essay_answer_item = next(item for item in answers_list if item["question_id"] == "essay-hybrid-1")
        assert essay_answer_item["type"] == "Essay"
        assert essay_answer_item["needs_teacher_review"] is True
        assert essay_answer_item["points_awarded"] == 0.0
        assert essay_answer_item["question_text"] == "Explain why Two-Factor Authentication is critical for protecting online accounts."
        assert essay_answer_item["guidelines"] == "Rubric: Definition (4 pts), Practical Benefit (6 pts)"
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)

    # 4. Teacher views submissions and grades essay
    app.dependency_overrides[get_current_active_user] = teacher_user
    try:
        # View submissions
        list_res = await client.get(f"/api/v1/assessments/{assessment_id}/submissions")
        assert list_res.status_code == 200
        subs = list_res.json()["data"]["resources"]
        assert len(subs) == 1
        assert subs[0]["submission_id"] == submission_id
        assert subs[0]["status"] == "SUBMITTED"

        # Grade the submission (award 9.0 out of 10 for the essay)
        grade_payload = {
            "manual_score": 9.0,
            "feedback": "Excellent definition and clear explanation of OTP as a second factor.",
        }
        grade_res = await client.post(
            f"/api/v1/assessments/{assessment_id}/submissions/{submission_id}/grade",
            json=grade_payload,
        )
        assert grade_res.status_code == 200
        graded_data = grade_res.json()["data"]["resources"]

        # Verify combined score and GRADED status
        assert graded_data["status"] == "GRADED"
        assert graded_data["auto_score"] == 5.0
        assert graded_data["manual_score"] == 9.0
        assert graded_data["final_score"] == 14.0  # 5.0 auto + 9.0 manual!
        assert graded_data["feedback"] == grade_payload["feedback"]
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)


@pytest.mark.asyncio
async def test_exam_with_essay_hybrid_and_route_aliases(client: AsyncClient):
    """
    Test universal route handling and EXAM with hybrid Essay:
    1. Teacher creates an EXAM with True/False (5.0 pts) and Essay (15.0 pts).
    2. Route alias GET /api/v1/assessments/teacher/my-tasks retrieves teacher exams.
    3. Student starts exam, submits correct TF answer + Essay text.
    4. Submission status is SUBMITTED, auto_score == 5.0.
    5. Teacher calls single submission route GET /api/v1/assessments/{id}/submissions/{sub_id}.
    6. Teacher grades the submission with 14.0 manual points -> final_score is 19.0 (5 + 14).
    """
    # 1. Teacher creates Exam
    app.dependency_overrides[get_current_active_user] = teacher_user
    try:
        exam_payload = {
            "title": "ALS Midterm Comprehensive Examination",
            "subject_code": "LS1",
            "target_category": "junior",
            "assessment_type": "EXAM",
            "status": "ACTIVE",
            "duration_minutes": 120,
            "categories_data": [
                {
                    "category_id": "cat_tf_exam",
                    "type": "True/False",
                    "pool_size": 1,
                    "required_count": 1,
                    "points_per_item": 5.0,
                    "questions": [
                        {
                            "id": "tf-exam-1",
                            "text": "An essay must have an introduction, body, and conclusion.",
                            "options": ["True", "False"],
                            "correct_answer": "True",
                        }
                    ],
                },
                {
                    "category_id": "cat_essay_exam",
                    "type": "Essay",
                    "pool_size": 1,
                    "required_count": 1,
                    "points_per_item": 15.0,
                    "questions": [
                        {
                            "id": "essay-exam-1",
                            "text": "Write a critical reflection on how non-formal education benefits adult learners.",
                            "premise": "Rubric: Structure (5 pts), Arguments (10 pts)",
                        }
                    ],
                },
            ],
        }
        create_res = await client.post("/api/v1/assessments/", json=exam_payload)
        assert create_res.status_code == 201
        res_data = create_res.json()["data"]["resources"]
        assessment_id = res_data["assessment_id"]
        assert res_data["max_score"] == 20.0  # 5.0 + 15.0
        assert res_data["assessment_type"] == "EXAM"

        # 2. Test /teacher/my-tasks route alias
        tasks_res = await client.get("/api/v1/assessments/teacher/my-tasks")
        assert tasks_res.status_code == 200
        teacher_tasks = tasks_res.json()["data"]["resources"]
        assert any(t["id"] == assessment_id for t in teacher_tasks)
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)

    # 3. Student takes and submits Exam
    app.dependency_overrides[get_current_active_user] = student_junior_user
    try:
        start_res = await client.post(f"/api/v1/assessments/{assessment_id}/start")
        assert start_res.status_code == 200

        submit_payload = {
            "answers": [
                {"question_id": "tf-exam-1", "student_answer": "True"},
                {
                    "question_id": "essay-exam-1",
                    "student_answer": "Non-formal education in the ALS program allows working adults to balance family, livelihood, and self-improvement...",
                },
            ],
            "time_spent_seconds": 3600,
        }
        sub_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit", json=submit_payload)
        assert sub_res.status_code == 200
        sub_data = sub_res.json()["data"]["resources"]
        submission_id = sub_data["submission_id"]
        assert sub_data["status"] == "SUBMITTED"
        assert sub_data["auto_score"] == 5.0
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)

    # 4. Teacher inspects single submission via new route
    app.dependency_overrides[get_current_active_user] = teacher_user
    try:
        single_res = await client.get(f"/api/v1/assessments/{assessment_id}/submissions/{submission_id}")
        assert single_res.status_code == 200
        single_sub = single_res.json()["data"]["resources"]
        assert single_sub["submission_id"] == submission_id
        assert single_sub["status"] == "SUBMITTED"
        assert single_sub["auto_score"] == 5.0

        # Verify embedded prompt and rubric in answers_payload
        answers_list = single_sub["answers_payload"]["answers"]
        essay_item = next(item for item in answers_list if item["question_id"] == "essay-exam-1")
        assert essay_item["question_text"] == "Write a critical reflection on how non-formal education benefits adult learners."
        assert essay_item["guidelines"] == "Rubric: Structure (5 pts), Arguments (10 pts)"

        # 5. Teacher grades the submission
        grade_payload = {
            "manual_score": 14.0,
            "feedback": "Outstanding reflection with thorough arguments.",
        }
        grade_res = await client.post(
            f"/api/v1/assessments/{assessment_id}/submissions/{submission_id}/grade",
            json=grade_payload,
        )
        assert grade_res.status_code == 200
        graded_data = grade_res.json()["data"]["resources"]
        assert graded_data["status"] == "GRADED"
        assert graded_data["auto_score"] == 5.0
        assert graded_data["manual_score"] == 14.0
        assert graded_data["final_score"] == 19.0  # 5.0 + 14.0!
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)


