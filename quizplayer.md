## Interactive Video Quiz / Interactive Learning Video Module

Build a production-ready **Interactive Video Learning Module** for the LMS.

The feature should allow teachers/course creators to upload or select an existing lesson video and place interactive questions, quizzes, polls, and learning checkpoints at specific timestamps in the video.

The implementation should integrate natively into the existing LMS architecture and should not modify or permanently embed the questions into the video file.

### Technology Stack

Use the existing LMS architecture:

- Backend: Laravel 13
- PHP 8.4+
- MySQL 8.4
- Frontend: React 19 + TypeScript
- Vite
- Tailwind CSS
- REST API
- Existing authentication and authorization system
- Existing LMS course, lesson, student, teacher, and assessment architecture

Follow existing project conventions and reusable components.

---

# 1. Core Concept

The video and interactive elements must be stored separately.

The video remains a normal video asset.

Interactive elements are stored as database records containing their timestamps and configuration.

Example:

```text
Video: Introduction to Photosynthesis

00:00 ───────── 02:35 ───────── 05:48 ───────── 09:20
                  │                │                │
                  Q1               Q2               Q3
```

When the student reaches an interaction timestamp:

1. Pause the video automatically.
2. Display the interaction overlay.
3. Prevent the student from continuing until the required interaction is completed if the interaction is configured as required.
4. Record the student's response.
5. Display appropriate feedback.
6. Allow the student to continue.
7. Resume the video from the appropriate position.

Do NOT modify, burn, or re-encode the original video to insert questions.

---

# 2. Teacher Interactive Video Editor

Create a teacher-facing Interactive Video Editor.

The interface should contain:

```text
-------------------------------------------------------
 Interactive Video Editor

 Video Title: Introduction to Photosynthesis

 ┌───────────────────────────────────────────────┐
 │                                               │
 │                 VIDEO PLAYER                  │
 │                                               │
 │                                               │
 └───────────────────────────────────────────────┘

 00:00 ───────●───────────────●──────────────●── 12:35
              Q1              Q2             Q3

 [+ Add Interaction]

 Interactions
 ------------------------------------------------
 02:35   Question       Where does photosynthesis occur?
 05:48   Question       Which gas is released?
 09:20   True/False     Plants require sunlight...
 ------------------------------------------------
```

The teacher must be able to:

- Play/pause the video.
- Seek through the video.
- Display the current timestamp.
- Add an interaction at the current timestamp.
- Manually enter a timestamp.
- Drag interaction markers along the timeline.
- Edit an interaction.
- Duplicate an interaction.
- Delete an interaction.
- Preview the entire interactive video.
- Reorder interactions where appropriate.
- Save changes.
- Cancel unsaved changes.
- Preview the student experience.

---

# 3. Supported Interaction Types

Design the architecture so additional interaction types can be added later.

Initially support:

### A. Multiple Choice

Example:

```text
Which organelle is responsible for energy production?

○ Nucleus
○ Ribosome
● Mitochondrion
○ Golgi apparatus

[Submit Answer]
```

Allow:

- Single correct answer.
- Multiple options.
- Correct answer.
- Explanation/feedback.
- Points.
- Required/optional setting.

---

### B. True / False

Example:

```text
Photosynthesis occurs primarily in the chloroplast.

○ True
○ False

[Submit]
```

---

### C. Multiple Select

Allow students to select more than one correct answer.

Example:

```text
Which of the following are products of photosynthesis?

☐ Oxygen
☐ Glucose
☐ Carbon dioxide
☐ Water
```

---

### D. Poll

Polls do not necessarily have a correct answer.

Example:

```text
How confident are you about this topic?

○ Very confident
○ Somewhat confident
○ Not confident
```

Store the student's response for analytics.

---

### E. Short Answer

Allow the teacher to create a short-answer question.

Example:

```text
What is the main function of chlorophyll?

[________________________]

[Submit]
```

For the first implementation, support manual teacher review.

Design the data model so AI-assisted evaluation can be added later.

---

# 4. Interaction Configuration

Each interaction should support configuration such as:

```text
timestamp
type
title
question
description
options
correct_answer
explanation
points
required
allow_retry
maximum_attempts
show_feedback
pause_video
resume_after_submission
```

Also support:

```text
display_position
```

so the interaction can eventually be displayed in different positions over the video.

---

# 5. Student Video Experience

Create a polished student-facing interactive video player.

Normal playback:

```text
┌────────────────────────────────────────────┐
│                                            │
│                  VIDEO                     │
│                                            │
│                                            │
│                                            │
├────────────────────────────────────────────┤
│ ▶  ━━━━━━━━━●━━━━━━━━━━━━━━━━━━ 12:35      │
└────────────────────────────────────────────┘
```

When an interaction is reached:

```text
┌────────────────────────────────────────────┐
│                                            │
│                  VIDEO                     │
│                                            │
│       ┌────────────────────────────┐       │
│       │        Quick Check         │       │
│       │                            │       │
│       │ Which organelle produces   │       │
│       │ most cellular energy?      │       │
│       │                            │       │
│       │ ○ Nucleus                  │       │
│       │ ○ Ribosome                 │       │
│       │ ○ Mitochondrion            │       │
│       │ ○ Golgi apparatus          │       │
│       │                            │       │
│       │       [ Submit ]           │       │
│       └────────────────────────────┘       │
│                                            │
└────────────────────────────────────────────┘
```

The video should automatically pause.

---

# 6. Feedback

After submission, show immediate feedback when enabled.

Correct:

```text
✓ Correct!

Mitochondria are responsible for producing most of
the cell's ATP.

[Continue Video]
```

Incorrect:

```text
✕ Not quite.

Review the explanation and try again.

[Try Again]
```

If retry is disabled:

```text
The correct answer is Mitochondrion.

[Continue Video]
```

The teacher must be able to configure whether feedback is displayed.

---

# 7. Required Interactions

The teacher should be able to mark an interaction as:

### Required

The student must answer it before continuing.

### Optional

The student can skip it and continue watching.

Example configuration:

```text
Required
[✓]

Allow retry
[✓]

Maximum attempts
3

Show explanation
[✓]
```

---

# 8. Anti-Skipping Behaviour

Implement configurable video progression rules.

For required interactions:

- Student should not be able to simply skip past the interaction.
- Seeking forward beyond an unanswered required interaction should be prevented or should trigger the interaction.
- After completing the interaction, the student may continue.
- Seeking backward should remain possible unless explicitly disabled.

Do not implement aggressive or frustrating anti-cheating behaviour.

The goal is learning engagement, not punishment.

---

# 9. Progress Tracking

Track:

- Video started
- Video completion percentage
- Total watch time
- Last playback position
- Number of interactions encountered
- Number of interactions completed
- Number skipped
- Number answered correctly
- Number answered incorrectly
- Number of attempts
- Quiz score
- Completion status
- Timestamp of last activity

Example:

```text
Student Progress

Video: Photosynthesis

Watched: 87%
Watch Time: 10m 42s

Interactions: 5/6 completed

Correct: 4
Incorrect: 1

Score: 80%

Status: In Progress
```

Students should be able to leave and return later and continue from their previous position.

---

# 10. Database Design

Create appropriate migrations/models.

Suggested structure:

### videos

```text
id
course_id
lesson_id
title
description
video_url
duration
thumbnail_url
status
created_by
created_at
updated_at
```

### video_interactions

```text
id
video_id
timestamp
type
title
question
description
explanation
points
required
allow_retry
maximum_attempts
show_feedback
is_active
metadata
created_at
updated_at
```

### video_interaction_options

```text
id
interaction_id
option_text
is_correct
sort_order
created_at
updated_at
```

### video_interaction_attempts

```text
id
interaction_id
student_id
attempt_number
answer
is_correct
points_earned
started_at
submitted_at
```

### video_progress

```text
id
video_id
student_id
last_position
watched_seconds
completion_percentage
completed
completed_at
updated_at
```

Use appropriate foreign keys, indexes, unique constraints, cascading rules, and database normalization.

Use JSON fields only where they genuinely provide flexibility.

---

# 11. API

Create clean REST API endpoints.

Examples:

```text
GET    /api/videos/{video}/interactions
POST   /api/videos/{video}/interactions
PUT    /api/video-interactions/{interaction}
DELETE /api/video-interactions/{interaction}

POST   /api/video-interactions/{interaction}/attempts

GET    /api/videos/{video}/progress
POST   /api/videos/{video}/progress

GET    /api/videos/{video}/analytics
```

Follow Laravel API conventions, validation, authorization policies, API resources, and consistent error responses.

Students must only be able to submit attempts for videos they are authorized to access.

Teachers must only be able to manage videos/interactions they are authorized to manage.

---

# 12. Analytics

Create teacher-facing analytics.

Example:

```text
Interactive Video Analytics

Students: 142
Started: 137
Completed: 118

Average Watch Percentage
82%

Average Quiz Score
76%

Interaction Performance

Q1   91% correct
Q2   48% correct
Q3   82% correct
Q4   74% correct
```

Allow the teacher to identify difficult questions.

Clicking a question should show:

```text
Question 2

"Where does photosynthesis occur?"

Correct: 48%
Incorrect: 52%

Most selected answer:
"Cell membrane" — 34%

Students struggling:
27
```

This should help teachers identify learning gaps.

---

# 13. Learning Science Integration

Design the feature so it can later integrate with the LMS learning engine.

After a student repeatedly gets a concept wrong, the system should be able to flag the concept for review.

For example:

```text
Interactive Video
       ↓
Question
       ↓
Student Response
       ↓
Concept Mastery
       ↓
Learning Profile
       ↓
Spaced Repetition / Review Recommendation
```

Do not hard-code the spaced-repetition implementation into the first version unless an existing learning engine is already available.

Instead, expose the necessary events/data so it can be integrated later.

---

# 14. AI Question Generation

Design the system so AI-generated questions can eventually be supported.

The future workflow should be:

```text
Teacher uploads video
        ↓
AI analyzes transcript/content
        ↓
AI suggests questions
        ↓
Teacher reviews/edits
        ↓
Teacher selects timestamps
        ↓
Publish
```

Do not automatically publish AI-generated questions.

Teacher approval must always be required.

For the current implementation, create the architecture/interfaces necessary to support this later.

---

# 15. Accessibility

The interactive video system must support:

- Keyboard navigation
- Screen-reader-friendly controls
- Proper ARIA labels
- Focus management
- Sufficient contrast
- Captions/subtitles
- Accessible question options
- Accessible feedback messages
- Mobile/touch interaction

Do not rely solely on color to indicate correct/incorrect answers.

---

# 16. Mobile Responsiveness

The student experience must work properly on:

- Desktop
- Laptop
- Tablet
- Android phones
- iPhones

The question overlay should resize appropriately on small screens.

Do not allow the quiz interface to cover important video controls.

---

# 17. Video Player Requirements

The player should support:

- Play/pause
- Seek
- Volume
- Fullscreen
- Playback speed
- Captions
- Progress bar
- Resume playback
- Interactive markers
- Automatic pause at interaction timestamps

Design the video-player layer so the underlying video technology can later be changed from HTML5 video to a more advanced streaming provider without rewriting the interaction system.

---

# 18. Important Architectural Requirement

Do NOT couple interactive questions directly to the video file.

Use:

```text
Video Asset
     +
Interaction Metadata
     +
Student Responses
     +
Progress Data
```

rather than:

```text
Video File With Embedded Questions
```

This allows the same video to be reused in multiple courses or lessons with different interactive questions.

Where appropriate, support interaction sets/versioning so different course instances can use different questions against the same video asset.

---

# 19. Teacher Workflow

The complete teacher workflow should be:

```text
Create Lesson
      ↓
Upload / Select Video
      ↓
Open Interactive Video Editor
      ↓
Play Video
      ↓
Pause at 02:35
      ↓
Add Question
      ↓
Configure Question
      ↓
Save
      ↓
Add More Interactions
      ↓
Preview
      ↓
Publish
```

---

# 20. Student Workflow

```text
Open Lesson
      ↓
Play Video
      ↓
Video reaches 02:35
      ↓
Video pauses
      ↓
Question appears
      ↓
Student answers
      ↓
Answer recorded
      ↓
Feedback displayed
      ↓
Continue Video
      ↓
Next interaction
      ↓
Video completion
      ↓
Final score/progress recorded
```

---

# 21. UI/UX Requirements

The interface should feel like a modern professional LMS.

Do not make it look like a basic CRUD administration panel.

Use:

- Clean card-based layouts
- Clear visual hierarchy
- Timeline markers
- Smooth transitions
- Appropriate loading states
- Empty states
- Skeleton loaders where appropriate
- Toast notifications
- Confirmation dialogs for destructive actions
- Responsive layouts
- Consistent LMS design system

Use existing design tokens/components wherever they exist.

---

# 22. Validation

Implement robust validation.

Examples:

- Timestamp cannot exceed video duration.
- Question cannot be empty.
- MCQ must have at least two options.
- MCQ must have at least one correct answer.
- Maximum attempts must be positive.
- Points cannot be negative.
- Interaction type must be valid.
- Student cannot submit unauthorized attempts.
- Duplicate submissions should be handled safely.

Prevent race conditions and duplicate attempt creation.

---

# 23. Performance

The interactive layer must not significantly affect video playback performance.

Do not repeatedly query the server every second.

The frontend should load the video's interaction metadata efficiently, then monitor playback locally.

Progress updates should be throttled/debounced rather than sending an API request every second.

For example:

```text
Video Player
     ↓
Load interactions once
     ↓
Monitor currentTime locally
     ↓
Trigger interaction
     ↓
Submit answer
     ↓
Persist progress periodically
```

Use appropriate caching and indexes.

---

# 24. Security

Implement:

- Authentication
- Authorization policies
- Request validation
- Rate limiting where appropriate
- Protection against unauthorized answer submission
- Protection against accessing another student's attempts
- Server-side score validation
- Never trust client-submitted `is_correct` or `points_earned`

The server must calculate correctness and score based on the stored answer configuration.

---

# 25. Testing

Create automated tests for:

### Backend

- Interaction creation
- Interaction update
- Interaction deletion
- Authorization
- Question validation
- Answer submission
- Score calculation
- Attempt limits
- Progress tracking
- Analytics calculations

### Frontend

- Video interaction triggering
- Video pause
- Question rendering
- Answer submission
- Feedback rendering
- Required interactions
- Optional interactions
- Resume playback
- Mobile responsiveness

Include edge cases such as:

- Interaction at 0 seconds
- Interaction near video end
- Multiple interactions close together
- Student refreshing the page
- Student leaving and returning
- Network failure during submission
- Duplicate submission
- Seeking across an unanswered interaction

---

# 26. Deliverables

Implement the feature completely, including:

1. Database migrations
2. Laravel models
3. Relationships
4. Policies
5. Form requests/validation
6. API controllers
7. API resources
8. Routes
9. React/TypeScript components
10. Interactive video player
11. Teacher video editor
12. Timeline interaction editor
13. Student quiz overlay
14. Progress tracking
15. Attempt tracking
16. Analytics
17. Responsive UI
18. Automated tests
19. Seed/demo data
20. Documentation

Do not create a superficial mockup.

Build the feature as a production-ready LMS module that can be integrated into the existing application.

Before implementation, inspect the existing codebase and reuse existing:

- Authentication
- Users
- Courses
- Lessons
- Assessments
- Media/file management
- UI components
- API conventions
- Authorization
- Database conventions

Do not unnecessarily duplicate existing functionality.

The final implementation should be modular and extensible so future interaction types such as drag-and-drop, hotspots, matching, fill-in-the-blank, coding questions, and AI-generated adaptive questions can be added without redesigning the entire system.