# Attendance System Specification: Flowcharts and Entity-Relationship Diagram (ERD)

This specification document details the complete architectural design, system workflows, and relational database schema for the **Attendance Feature** of the Alternative Learning System (ALS) platform, derived directly from the frontend implementation.

---

## 1. System Overview

The attendance system serves two core roles and user perspectives:
1. **Teacher Attendance Management (`/teacher/attendance`)**:
   - **Session Overview**: Paginated, filterable list of recorded class attendance sessions displaying date, level, subject strand, attendance rate, and session status (`COMPLETED` or `DRAFT`).
   - **New Session Modal**: Dialog to configure a new attendance session by selecting calendar date, class level (`Elementary` or `Junior High School`), and learning strand (`LS1`, `LS2`, `LS3`).
   - **Take Attendance View**: An interactive workspace filtering learners by class level, sorting them alphabetically, supporting per-student status selection (`Present`, `Absent`, `Excused`), remarks notes, "Mark All Present" bulk action, live metric counters, and status validation before saving.
2. **Learner-Level Attendance History (`/teacher/students/[id]` -> Attendance Tab)**:
   - Comprehensive historical log of all sessions attended by an individual learner.
   - Aggregate performance KPIs: Attendance Rate %, Total Present days, Total Absent days, and Excused days.
   - Multi-state status filter (`All`, `Present`, `Absent`, `Excused`) and search functionality.

---

## 2. Process Flowcharts

### 2.1 High-Level User Journey
The following flowchart illustrates the complete user workflow from logging in to viewing records, initiating new sessions, taking attendance, and saving records.

```mermaid
flowchart TD
    Start(["Teacher Logs In"]) --> Nav["Navigate to Sidebar -> Attendance (/teacher/attendance)"]
    Nav --> ViewList["Render AttendanceRecordsList View"]
    
    subgraph List_Actions ["Attendance Records Overview"]
        ViewList --> FilterSearch["Apply Filters: Level, Subject, Search Date"]
        FilterSearch --> UpdateTable["Update Filtered Sessions & Pagination (5/page)"]
        ViewList --> ClickNew["Click '+ New Record' Button"]
        ViewList --> ClickView["Click 'Edit / Arrow' Action on Session Row"]
    end
    
    subgraph New_Record_Modal ["New Session Modal"]
        ClickNew --> OpenModal["Display NewRecordModal"]
        OpenModal --> SelectDate["Select Date (Default: Today / Specified)"]
        OpenModal --> SelectLevel["Select Class Level (Elementary / Junior High)"]
        OpenModal --> SelectStrand["Select Subject Strand (LS1, LS2, LS3)"]
        SelectDate & SelectLevel & SelectStrand --> SubmitModal["Click 'Start Recording'"]
        SubmitModal --> CloseModal["Close Modal & Set Active Session"]
    end

    subgraph Take_Attendance ["Take Attendance View"]
        CloseModal --> LoadTakeView["Switch currentView to 'take_attendance'"]
        ClickView --> LoadTakeView
        
        LoadTakeView --> FetchStudents["Filter Students by Session Level & Sort Alphabetically"]
        FetchStudents --> RenderGrid["Render Header KPI Counters, Student Rows & Remarks"]
        
        RenderGrid --> Interaction{"Teacher Action"}
        Interaction -->|Toggle Status| ToggleStatus["Set Student Status (Present / Absent / Excused)"]
        Interaction -->|Enter Remarks| AddNote["Input Optional Remarks (e.g. 'Sick Leave')"]
        Interaction -->|Bulk Action| MarkAll["Click 'Mark All Present'"]
        
        ToggleStatus --> RecalcStats["Recalculate Total, Present, Absent Counters"]
        AddNote --> RecalcStats
        MarkAll --> RecalcStats
        
        RecalcStats --> ClickSave["Click 'Save Attendance Record'"]
        ClickSave --> Validate{"Are All Learners Marked?"}
        
        Validate -->|No| AlertTeacher["Show Alert: 'Please mark status for all learners (X remaining)'"]
        AlertTeacher --> RenderGrid
        
        Validate -->|Yes| SaveProcess["Show Loading Spinner (isSaving = true)"]
        SaveProcess --> PersistData["Persist Session & Records"]
        PersistData --> ShowSuccess["Display 'Saved successfully' Badge (3s)"]
        
        ShowSuccess --> ReturnChoice{"Teacher Next Step"}
        ReturnChoice -->|Click 'Back to Records'| BackToList["Reset View to 'list'"]
        ReturnChoice -->|Stay on Page| RenderGrid
        BackToList --> ViewList
    end
```

---

### 2.2 Take Attendance State Lifecycle & Validation
The following flowchart maps the exact reactive state transitions, bulk mutations, validation routines, and persistence triggers inside the attendance workspace.

```mermaid
flowchart TD
    Init(["Mount TakeAttendanceView(date, level, subject)"]) --> ComputeStudents["Memoize displayStudents:\nstudents.filter(s => s.level == level)\n.sort(by lastName, firstName, middleName)"]
    ComputeStudents --> InitRecords["Initialize records state: Record<studentId, AttendanceRecord>"]
    
    InitRecords --> DisplayUI["Display UI:\n- Breadcrumbs\n- Level & Subject Badges\n- Formatted Date\n- Live Counters (Total, Present, Absent)"]
    
    DisplayUI --> UserAction{"User Input Event"}
    
    %% Status Toggle
    UserAction -->|Click 'Present', 'Absent', or 'Excused'| OnStatusChange["handleStatusChange(studentId, newStatus)"]
    OnStatusChange --> UpdateRec1["records[studentId].status = newStatus\nsetSaveSuccess(false)"]
    UpdateRec1 --> UpdateCounters["Update counters:\nPresent = count(status == 'Present')\nAbsent = count(status == 'Absent')"]
    UpdateCounters --> DisplayUI
    
    %% Remarks Change
    UserAction -->|Type in Remarks input| OnRemarksChange["handleRemarksChange(studentId, text)"]
    OnRemarksChange --> UpdateRec2["records[studentId].remarks = text"]
    UpdateRec2 --> DisplayUI
    
    %% Mark All Present
    UserAction -->|Click 'Mark All Present'| OnMarkAll["markAllPresent()"]
    OnMarkAll --> LoopStudents["Iterate through displayStudents:\nIf status != 'Absent' and status != 'Excused':\nSet status = 'Present'"]
    LoopStudents --> UpdateRec3["setRecords(newRecords)\nsetSaveSuccess(false)"]
    UpdateRec3 --> UpdateCounters
    
    %% Save Flow
    UserAction -->|Click 'Save Attendance Record'| OnSave["handleSave()"]
    OnSave --> CheckEmpty{"displayStudents.length == 0?"}
    CheckEmpty -->|Yes| AbortSave["Return (No-op)"]
    CheckEmpty -->|No| CheckMissing["Find missingStudents:\ndisplayStudents.filter(s => !records[s.id]?.status)"]
    
    CheckMissing --> MissingCount{"missingStudents.length > 0?"}
    MissingCount -->|Yes| ShowAlert["window.alert('Please mark the attendance status for all learners...')"]
    ShowAlert --> DisplayUI
    
    MissingCount -->|No| StartSaving["setIsSaving(true)\nsetSaveSuccess(false)"]
    StartSaving --> SaveTimeout["Execute Save Routine / API Call (1200ms)"]
    SaveTimeout --> SaveDone["setIsSaving(false)\nsetSaveSuccess(true)"]
    SaveDone --> AutoDismiss["setTimeout: setSaveSuccess(false) after 3000ms"]
    SaveDone --> DisplayUI
    
    %% Back navigation
    UserAction -->|Click '< Back to Records'| OnBack["Invoke onBack() -> setCurrentView('list')"]
    OnBack --> Exit(["Return to AttendanceRecordsList"])
```

---

### 2.3 Individual Learner Attendance History Flow (`AttendanceTab`)
The following flowchart illustrates how attendance history is aggregated, calculated, and filtered on the student profile page.

```mermaid
flowchart TD
    OpenStudent["Teacher opens Student Details Page (/teacher/students/[id])"] --> ClickTab["Click 'Attendance' Tab in RightContentArea"]
    ClickTab --> MountTab["Mount AttendanceTab(student)"]
    
    MountTab --> CheckRecords{"student.attendance exists and length > 0?"}
    CheckRecords -->|No| EmptyState["Display Empty State:\n'No attendance records found for this learner.'"]
    
    CheckRecords -->|Yes| CalcKPIs["Calculate Summary KPIs:\n- totalDays = count(records)\n- presentDays = count(status == 'Present')\n- absentDays = count(status == 'Absent')\n- excusedDays = count(status == 'Excused')\n- attendanceRate = round((presentDays / totalDays) * 100)"]
    
    CalcKPIs --> RenderMetrics["Render 4 Metric Cards:\n1. Attendance Rate % (with progress bar)\n2. Present Days ('Days attended')\n3. Absent Days ('Missed sessions')\n4. Excused Days ('Valid reasons')"]
    
    RenderMetrics --> RenderToolbar["Render Filter Toolbar:\n- Pills: 'All', 'Present', 'Absent', 'Excused'\n- Search input: 'Search date or subject...'"]
    
    RenderToolbar --> UserFilter{"Teacher Filter / Search Action"}
    UserFilter -->|Select Pill| SetStatusFilter["filter = 'All' | 'Present' | 'Absent' | 'Excused'"]
    UserFilter -->|Type in Search| SetSearchQuery["searchQuery = string"]
    
    SetStatusFilter & SetSearchQuery --> FilterData["Apply Filter Predicate:\n(filter == 'All' || record.status == filter) &&\n(record.subject.includes(query) || record.date.includes(query))"]
    
    FilterData --> CheckResults{"filteredRecords.length > 0?"}
    CheckResults -->|No| NoMatch["Display 'No records match your filters.'"]
    CheckResults -->|Yes| RenderRows["Render History Rows:\n- Session Date & Subject\n- Status Badge (Present = green, Absent = red, Excused = amber)\n- Remarks quote or '-'"]
```

---

## 3. Entity-Relationship Diagram (ERD)

### 3.1 Visual Diagram (Mermaid)

```mermaid
erDiagram
    USERS ||--o{ ATTENDANCE_SESSIONS : "conducts / records"
    USERS ||--o| STUDENTS : "has learner profile"
    STUDENTS ||--o{ ATTENDANCE_RECORDS : "evaluated in"
    ATTENDANCE_SESSIONS ||--|{ ATTENDANCE_RECORDS : "contains individual entries"
    PROGRAM_LEVELS ||--o{ ATTENDANCE_SESSIONS : "defines grade level"
    PROGRAM_LEVELS ||--o{ STUDENTS : "enrolls in"
    LEARNING_STRANDS ||--o{ ATTENDANCE_SESSIONS : "taught during"

    USERS {
        uuid user_id PK "Primary Key"
        string firebase_uid UK "Firebase Auth UID"
        string email UK "Unique login email"
        string password "Hashed password"
        string employee_id "Teacher Employee ID (Optional)"
        string student_id "Student Reference ID (Optional)"
        string first_name "First Name"
        string middle_name "Middle Name (Optional)"
        string last_name "Last Name"
        enum role "student, employee, admin"
        enum user_category "elementary, junior, basic_literacy"
        enum status "enrolled, unenroll, completed"
        boolean is_verified "Email/Account verified"
        timestamp created_at "Record creation timestamp"
        timestamp updated_at "Last update timestamp"
    }

    STUDENTS {
        string student_id PK, FK "References users.user_id / ALS ID"
        string lrn UK "12-digit Learner Reference Number"
        string level_code FK "References program_levels.level_code"
        string suffix "Name suffix (Jr., III, etc.)"
        string gender "Male, Female"
        date birth_date "Date of Birth"
        string nationality "Nationality"
        string civil_status "Single, Married, etc."
        string street "Street Address"
        string barangay "Barangay"
        string city "City / Municipality"
        string province "Province"
        string phone "Contact Phone"
        string email "Contact Email"
        string guardian_name "Primary Guardian"
        string guardian_relation "Relationship to Learner"
        string guardian_phone "Guardian Phone Number"
        int readiness_score "ALS Assessment Readiness Score"
    }

    PROGRAM_LEVELS {
        string level_code PK "Elementary, Junior High School, BLP"
        string level_name "Full display name"
        string description "Program description"
    }

    LEARNING_STRANDS {
        string strand_code PK "LS1, LS2, LS3, LS4, LS5, LS6"
        string strand_title "Full Strand Title"
        string description "Strand focus area"
    }

    ATTENDANCE_SESSIONS {
        uuid session_id PK "Primary Key (UUID)"
        uuid teacher_id FK "References users.user_id"
        string level_code FK "References program_levels.level_code"
        string strand_code FK "References learning_strands.strand_code"
        date session_date "Calendar date of attendance (rawDate)"
        string display_date "Preformatted date string (e.g. 'Today, Sept 24, 2026')"
        enum status "COMPLETED, DRAFT"
        int total_count "Total learners enrolled in level"
        int present_count "Learners marked Present"
        int absent_count "Learners marked Absent"
        int excused_count "Learners marked Excused"
        timestamp created_at "Session creation timestamp"
        timestamp updated_at "Session last modified timestamp"
    }

    ATTENDANCE_RECORDS {
        uuid record_id PK "Primary Key (UUID)"
        uuid session_id FK "References attendance_sessions.session_id"
        string student_id FK "References students.student_id"
        enum status "Present, Absent, Excused"
        text remarks "Optional notes, e.g. sick leave / medical cert"
        timestamp recorded_at "Timestamp when mark was submitted"
        timestamp updated_at "Timestamp when mark was last modified"
    }
```

---

### 3.2 Relational Entity Schema Specifications

#### Entity: `attendance_sessions`
- **Purpose**: Stores the master header for each class attendance session recorded by an ALS teacher.
- **Primary Key**: `session_id` (UUID)
- **Foreign Keys**:
  - `teacher_id` -> `users.user_id` (ON DELETE RESTRICT)
  - `level_code` -> `program_levels.level_code`
  - `strand_code` -> `learning_strands.strand_code`
- **Fields**:
  - `session_id`: UUID, Primary Key.
  - `teacher_id`: UUID, Foreign Key referencing the user who logged the session.
  - `level_code`: VARCHAR(50), e.g., `'Junior High School'`, `'Elementary'`, `'BLP'`.
  - `strand_code`: VARCHAR(50), e.g., `'LS1: Communication Skills'`, `'LS2: Scientific Literacy'`, `'LS3: Mathematical & Problem Solving'`.
  - `session_date`: DATE, The calendar date the session occurred (`YYYY-MM-DD`).
  - `display_date`: VARCHAR(100), Formatted date representation (e.g. `'Today, Sept 24, 2026'`).
  - `status`: VARCHAR(20), Enum: `'COMPLETED'` or `'DRAFT'`.
  - `total_count`: INTEGER, Cached number of learners belonging to the class level during this session.
  - `present_count`: INTEGER, Cached tally of learners marked `'Present'`.
  - `absent_count`: INTEGER, Cached tally of learners marked `'Absent'`.
  - `excused_count`: INTEGER, Cached tally of learners marked `'Excused'`.
  - `created_at`: TIMESTAMPTZ, Default `NOW()`.
  - `updated_at`: TIMESTAMPTZ, Nullable.
- **Constraints**:
  - `UNIQUE (teacher_id, session_date, level_code, strand_code)`: Prevents identical sessions recorded twice by the same instructor.

#### Entity: `attendance_records`
- **Purpose**: Contains granular per-student attendance results and observations for a session.
- **Primary Key**: `record_id` (UUID)
- **Foreign Keys**:
  - `session_id` -> `attendance_sessions.session_id` (ON DELETE CASCADE)
  - `student_id` -> `students.student_id` (ON DELETE CASCADE)
- **Fields**:
  - `record_id`: UUID, Primary Key.
  - `session_id`: UUID, References parent session.
  - `student_id`: VARCHAR(50), References learner identifier (e.g., `'ALS-0001'`).
  - `status`: VARCHAR(20), Enum: `'Present'`, `'Absent'`, or `'Excused'`.
  - `remarks`: TEXT, Nullable; notes such as reasons for absence or medical certificates.
  - `recorded_at`: TIMESTAMPTZ, Default `NOW()`.
  - `updated_at`: TIMESTAMPTZ, Nullable.
- **Constraints**:
  - `UNIQUE (session_id, student_id)`: A student can only have one recorded attendance status per session.

---

### 3.3 Frontend Mock Data to Backend Database Mapping

| Frontend Interface / Model | Property | Backend Table / Column | Type / Format |
| :--- | :--- | :--- | :--- |
| `AttendanceSession` (`mockTeacher.ts`) | `id` | `attendance_sessions.session_id` | UUID string |
| `AttendanceSession` | `rawDate` | `attendance_sessions.session_date` | `DATE` (`YYYY-MM-DD`) |
| `AttendanceSession` | `displayDate` | `attendance_sessions.display_date` | VARCHAR |
| `AttendanceSession` | `level` | `attendance_sessions.level_code` | VARCHAR |
| `AttendanceSession` | `subject` | `attendance_sessions.strand_code` | VARCHAR |
| `AttendanceSession` | `presentCount` | `attendance_sessions.present_count` | INTEGER |
| `AttendanceSession` | `totalCount` | `attendance_sessions.total_count` | INTEGER |
| `AttendanceSession` | `status` | `attendance_sessions.status` | VARCHAR (`COMPLETED`/`DRAFT`) |
| `AttendanceRecord` (`TakeAttendanceView.tsx`) | `status` | `attendance_records.status` | VARCHAR (`Present`/`Absent`/`Excused`) |
| `AttendanceRecord` | `remarks` | `attendance_records.remarks` | TEXT |
| `Student` (`mockStudents.ts`) | `id` / `lrn` | `students.student_id` / `students.lrn` | VARCHAR |
| `StudentAttendance` (`mockStudents.ts`) | `attendance[]` | Query join of `attendance_records` + `attendance_sessions` | Virtual representation |

---

## 4. Role-Based Access Control (RBAC) & Route Security

The attendance API enforces strict Role-Based Access Control to ensure data privacy and prevent unauthorized grading or manipulation.

### 4.1 Role Matrix & Endpoint Permissions

| Endpoint | HTTP Method | Allowed Roles | Restrictions & Behavior |
| :--- | :--- | :--- | :--- |
| `/api/v1/attendance/sessions` | `POST` | `EMPLOYEE` (Teacher), `ADMIN` | Takes/updates class attendance. **Students (`STUDENT`) are rejected with `403 Forbidden`.** |
| `/api/v1/attendance/sessions` | `GET` | `EMPLOYEE` (Teacher), `ADMIN` | Browses all class attendance sessions with filters. **Students (`STUDENT`) are rejected with `403 Forbidden`.** |
| `/api/v1/attendance/sessions/{session_id}` | `GET` | `EMPLOYEE` (Teacher), `ADMIN` | Views full session marks and remarks. **Students (`STUDENT`) are rejected with `403 Forbidden`.** |
| `/api/v1/attendance/students/{student_id}` | `GET` | `EMPLOYEE`, `ADMIN`, `STUDENT` (Self Only) | Teachers/Admins can view any student's logs. **Students can ONLY view their own records (`current_user.student_id == student_id`); other student records return `403 Forbidden`.** |
| All Endpoints | Any | None (Unauthenticated) | Missing or invalid token returns `401 Unauthorized`. |

### 4.2 Dependency Injection Pattern
FastAPI route protection is achieved using the project's centralized authentication dependencies from `app.features.auth.dependencies`:
- `require_teacher = require_roles(UserRole.EMPLOYEE, UserRole.ADMIN)`: Validates that the requesting token belongs to an active employee/admin and extracts their identity (`teacher_id`).
- `get_current_active_user`: Validates token claims and ensures the user account is active (`UserStatus.ENROLLED`).

