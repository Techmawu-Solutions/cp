# MASTER PRODUCT PROMPT
## Design and Architect a Next-Generation Global MOOC Platform

> **Status (Sep 2026):** this brief has been answered. The platform is **ClassProject Open** (working name), and its work lives in [`mooc/`](mooc/README.md):
> - the **product and architecture specification**, covering all 25 deliverables listed at the end of this brief: [`mooc/ClassProject Open — Product Specification.md`](mooc/ClassProject%20Open%20—%20Product%20Specification.md);
> - its own **database schema**: [`mooc/database/schema.sql`](mooc/database/schema.sql).
>
> Its link to ClassProject is that ClassProject recommends subject-matched Open courses to students (Open spec §25; ClassProject spec §49.2). The brief below is kept as the original input. Section references such as "brief §14" in the spec point here.

You are a world-class team consisting of:

- Senior Product Architect
- Principal Software Architect
- Learning Scientist
- Instructional Designer
- AI/ML Architect
- UX/UI Designer
- EdTech Product Manager
- Assessment Specialist
- Video/Streaming Architect
- Accessibility Specialist
- Cybersecurity Architect
- Data Engineer
- Global SaaS Architect

Your task is to design a **world-class global MOOC platform** that addresses the major limitations of existing platforms such as Coursera, edX, FutureLearn, Udemy and MIT OpenCourseWare.

Do not simply clone an existing MOOC platform.

Create a fundamentally better learning experience.

The platform should combine:

- Coursera's career orientation and institutional partnerships
- edX's academic rigor and credentialing
- FutureLearn's social learning
- Udemy's instructor marketplace model
- MIT OpenCourseWare's openness and depth
- Modern AI personalization
- Modern LMS capabilities
- Live learning
- Project-based learning
- Competency-based assessment
- Digital portfolios
- Global accessibility
- Offline-first learning
- Evidence-based learning science

The result should feel like a **global learning operating system**, not a video-course marketplace.

---

# 1. PRODUCT VISION

Design a platform where the primary object is not the course.

The primary object is the:

**LEARNER OUTCOME**

A learner should be able to say:

> "I want to become a data analyst."

or:

> "I want to learn artificial intelligence."

or:

> "I want to become a school leader."

or:

> "I need to master Python."

The platform should then determine:

1. What the learner already knows
2. What competencies they need
3. What gaps exist
4. What learning experiences will close those gaps
5. What assessments should verify mastery
6. What projects should demonstrate capability
7. What credential/evidence the learner should receive

Therefore:

**Outcome → Competencies → Skills → Learning Path → Learning Activities → Practice → Assessment → Evidence → Credential**

---

# 2. CORE DIFFERENTIATION

Do not build another platform where:

> Search → Enroll → Watch videos → Take quiz → Get certificate.

Instead build:

> Diagnose → Personalize → Learn → Practice → Apply → Collaborate → Demonstrate → Master → Build Evidence → Advance.

Every major product decision should reinforce this model.

---

# 3. LEARNER PROFILES

Create rich learner profiles containing:

- Identity
- Education
- Professional background
- Current role
- Career goals
- Learning goals
- Existing skills
- Competency levels
- Learning preferences
- Languages
- Time availability
- Device capabilities
- Connectivity conditions
- Accessibility requirements
- Completed courses
- Assessment history
- Project history
- Portfolio
- Credentials
- Learning streak
- Mastery history

Do not reduce a learner to course completion percentages.

Build a **dynamic learner competency graph**.

---

# 4. AI LEARNING ORCHESTRATOR

Create an AI learning system that acts as a personal learning architect.

It should:

- Conduct diagnostic assessments
- Identify knowledge gaps
- Recommend learning paths
- Adapt difficulty
- Explain difficult concepts
- Generate additional examples
- Generate practice questions
- Provide hints instead of immediately giving answers
- Detect misconceptions
- Recommend remediation
- Recommend enrichment
- Generate personalized revision sessions
- Use spaced repetition
- Track mastery
- Adjust learning pace
- Recommend projects
- Connect concepts across courses
- Summarize previous learning
- Answer questions using course-approved sources
- Cite learning materials
- Detect when the learner needs human assistance
- Escalate complex issues to instructors/mentors

The AI must NOT simply become a chatbot placed beside a video.

It should function as a **learning orchestration engine**.

---

# 5. ADAPTIVE LEARNING

Create an adaptive learning engine.

Do not force every learner through the same linear course.

Support:

### Beginner path

Concept → Explanation → Example → Practice → Feedback → Mastery

### Intermediate path

Diagnostic → Targeted modules → Practice → Project

### Advanced path

Diagnostic → Skip known material → Advanced challenge → Project → Assessment

Allow learners to test out of material they already know.

Use:

- Knowledge tracing
- Competency mapping
- Spaced repetition
- Retrieval practice
- Interleaving
- Deliberate practice
- Formative assessment
- Mastery learning

The system should distinguish:

**"I watched it"**

from:

**"I understand it"**

from:

**"I can apply it."**

---

# 6. COURSE ARCHITECTURE

Courses should not be video containers.

Support:

- Video
- Interactive video
- Text
- Audio
- Slides
- Interactive diagrams
- Simulations
- Coding environments
- Virtual labs
- Case studies
- Scenarios
- Projects
- Discussions
- Peer review
- AI tutoring
- Instructor sessions
- Live classes
- Assignments
- Quizzes
- Exams
- Reflections
- Research activities

Every learning activity must map to one or more:

**Learning Objective → Competency → Assessment**

---

# 7. MICRO-LEARNING WITHOUT FRAGMENTATION

Support short learning units but avoid creating meaningless content fragments.

Design:

Course
→ Module
→ Lesson
→ Concept
→ Activity
→ Practice
→ Assessment

Allow the learner to understand where every small activity fits into the larger learning objective.

---

# 8. PROJECT-BASED LEARNING

Every career-oriented learning path should contain meaningful projects.

Projects should have:

- Problem statement
- Requirements
- Resources
- Milestones
- Rubric
- Submission
- Peer review
- AI feedback
- Instructor feedback
- Revision
- Final assessment

Allow learners to build a **real portfolio** rather than accumulating certificates.

---

# 9. PORTFOLIO SYSTEM

Create a professional learner portfolio.

Include:

- Projects
- Skills
- Competencies
- Certificates
- Microcredentials
- Assessment results
- Badges
- Evidence of work
- GitHub integrations
- Publications
- Research
- Presentations
- Capstone projects

Learners should be able to create a public portfolio URL.

Employers should be able to verify evidence.

---

# 10. CREDENTIAL SYSTEM

Do not make certificates the only credential.

Support:

- Certificates
- Microcredentials
- Digital badges
- Competency credentials
- Skill verification
- Project verification
- Assessment-based credentials
- Institution-issued credentials
- Industry-issued credentials

Every credential should contain verifiable evidence.

Use:

- Unique credential ID
- Verification URL
- Issuer
- Date
- Skills demonstrated
- Assessment completed
- Projects completed
- Credential criteria

Do not allow a certificate to imply competence merely because someone watched videos.

---

# 11. ASSESSMENT ENGINE

Create a powerful assessment engine supporting:

- MCQ
- Multiple response
- True/false
- Matching
- Ordering
- Fill-in-the-blank
- Short answer
- Essay
- Coding
- File submission
- Project submission
- Oral assessment
- Video assessment
- Practical assessment
- Simulation-based assessment
- Peer assessment
- Instructor assessment
- AI-assisted assessment

Assess:

- Recall
- Understanding
- Application
- Analysis
- Evaluation
- Creation
- Practical competence

Support adaptive assessments.

Use assessment results to update the learner competency graph.

---

# 12. PEER ASSESSMENT

Improve upon conventional peer grading.

Create:

- Anonymous peer assessment
- Rubric-guided evaluation
- Calibration exercises
- Multiple peer reviewers
- Reliability scoring
- Reviewer quality tracking
- AI-assisted rubric interpretation
- Instructor moderation
- Appeal mechanism

Do not allow a single random peer to determine a learner's final result.

---

# 13. SOCIAL LEARNING

Do not simply create discussion forums.

Create structured communities.

Support:

- Course communities
- Study groups
- Cohorts
- Peer learning circles
- Mentorship
- Instructor office hours
- Project teams
- Regional communities
- Professional communities
- Interest communities

Allow learners to:

- Ask questions
- Answer questions
- Collaborate
- Share projects
- Form study groups
- Schedule study sessions
- Host peer sessions
- Follow experts
- Follow instructors
- Build professional networks

Use AI to surface unanswered questions and connect learners who can help each other.

---

# 14. LIVE LEARNING

Support integrated live classes.

Architecture must support:

- Live video
- Audio
- Screen sharing
- Chat
- Polls
- Breakout rooms
- Whiteboard
- Collaborative documents
- Attendance
- Recording
- Automatic transcription
- Captions
- Translation
- AI-generated session summary
- Searchable transcript
- Questions extraction
- Follow-up assignments

Live classes must become part of the learner's course record.

---

# 15. VIDEO LEARNING

Build an advanced video experience.

Support:

- Adaptive bitrate streaming
- Multiple resolutions
- Captions
- Multi-language subtitles
- Transcript
- Search within video
- Chapters
- Bookmarks
- Notes
- Playback speed
- Picture-in-picture
- Interactive questions
- Timestamp comments
- Download/offline access
- Resume playback
- AI-generated summaries

Allow instructors to insert assessment questions directly into videos.

---

# 16. OFFLINE-FIRST LEARNING

The platform must work for learners with poor connectivity.

Support:

- Downloadable lessons
- Offline video
- Offline assessments
- Offline reading
- Offline notes
- Offline progress tracking
- Synchronization when connectivity returns

Design specifically for emerging markets and low-bandwidth environments.

The platform should work well on inexpensive Android devices.

---

# 17. GLOBALIZATION

Build for global users from day one.

Support:

- Multiple languages
- RTL languages
- Local currencies
- Regional pricing
- Local payment methods
- Time zones
- Date formats
- Number formats
- Accessibility standards
- Regional content
- Local instructors
- Local credentials

Do not assume that every learner has:

- High-speed broadband
- A laptop
- A credit card
- Unlimited data
- A quiet study environment

---

# 18. DISCOVERY

Do not make course search the primary discovery mechanism.

Create multiple discovery modes:

### Goal-based

"What do you want to achieve?"

### Skill-based

"What do you want to learn?"

### Career-based

"What role do you want?"

### Time-based

"I have 20 minutes today."

### Diagnostic-based

"Show me what I should learn next."

### Curiosity-based

"Teach me something interesting."

Use AI recommendations, but always explain:

**Why this learning experience was recommended.**

---

# 19. LEARNING PATHS

Create structured pathways:

Course
→ Course
→ Project
→ Assessment
→ Credential

Also:

Skill
→ Skill
→ Competency
→ Project
→ Credential

And:

Career
→ Competency map
→ Learning path
→ Portfolio
→ Assessment
→ Career evidence

---

# 20. AI CONTENT GENERATION FOR INSTRUCTORS

Create an instructor AI studio.

Allow instructors to provide:

- Curriculum
- Syllabus
- Learning objectives
- Source materials
- Textbooks
- PDFs
- Videos
- Slides

The AI can generate:

- Course structure
- Lesson plans
- Learning objectives
- Quizzes
- Assignments
- Case studies
- Discussion questions
- Flashcards
- Practice exercises
- Rubrics
- Revision materials
- Accessibility metadata

However:

**AI-generated content must pass human review before publication.**

---

# 21. CONTENT QUALITY SYSTEM

Create a formal content quality framework.

Every course should be evaluated on:

- Learning objective quality
- Instructional design
- Accuracy
- Currency
- Accessibility
- Assessment quality
- Practical relevance
- Media quality
- Learner engagement
- Completion
- Mastery
- Learner outcomes

Create course quality dashboards for instructors and administrators.

Do not rely exclusively on star ratings.

---

# 22. INSTRUCTOR MARKETPLACE

Allow:

- Universities
- Schools
- Companies
- Independent instructors
- Industry experts
- Professional bodies
- NGOs
- Governments

to publish learning experiences.

Create instructor verification.

Create content review workflows.

Create instructor analytics.

Create revenue sharing.

Create content licensing.

Create institutional publishing.

---

# 23. AI QUALITY CONTROL

AI should continuously monitor:

- Outdated content
- Broken links
- Incorrect answers
- Assessment ambiguity
- Duplicate content
- Copyright concerns
- Accessibility problems
- Poor explanations
- Learner confusion
- Low-performing activities

Flag content for human review rather than silently modifying authoritative educational content.

---

# 24. LEARNING ANALYTICS

Create analytics for:

### Learners

- Mastery
- Progress
- Time
- Knowledge gaps
- Strengths
- Weaknesses
- Engagement
- Assessment performance

### Instructors

- Lesson effectiveness
- Drop-off points
- Assessment difficulty
- Learner misconceptions
- Discussion activity
- Content performance

### Institutions

- Enrollment
- Completion
- Mastery
- Credential attainment
- Learner outcomes
- Course quality

Do not optimize only for:

**time spent**

or

**daily active users.**

Optimize for:

**learning effectiveness and demonstrated competence.**

---

# 25. LEARNER RETENTION

Avoid manipulative gamification.

Use meaningful motivation:

- Progress visualization
- Mastery milestones
- Personal goals
- Learning streaks
- Study planning
- Peer accountability
- Achievement badges
- Real-world projects

Avoid designing the system to maximize screen time.

The goal is:

**maximum learning per unit of learner time.**

---

# 26. PERSONAL LEARNING CALENDAR

Create an intelligent learning planner.

Learners specify:

- Goal
- Deadline
- Available hours
- Preferred days
- Current knowledge

The system creates a realistic schedule.

It should automatically adapt when the learner falls behind.

Example:

> "You have 45 days until your certification exam. You have 5 hours per week available. Here is your adaptive study plan."

---

# 27. KNOWLEDGE RETENTION

Implement:

- Spaced repetition
- Retrieval practice
- Flashcards
- Interleaving
- Periodic review
- Cumulative assessments

The system should automatically resurface concepts the learner is forgetting.

Learning should continue after course completion.

---

# 28. COURSE-TO-CAREER CONNECTION

Connect learning to real-world outcomes.

For career pathways, show:

- Required competencies
- Learning gaps
- Portfolio requirements
- Projects
- Industry certifications
- Relevant job skills

Do not promise employment.

Instead provide evidence of readiness.

---

# 29. EMPLOYER / ORGANIZATION PORTAL

Create an organizational platform where employers can:

- Define competency frameworks
- Create private academies
- Assign learning
- Track employee skills
- Build learning paths
- Assess employees
- Issue credentials
- Create internal certifications

Allow organizations to build private or public academies.

---

# 30. UNIVERSITY / INSTITUTION PORTAL

Support:

- Course publishing
- Faculty management
- Student cohorts
- Assessments
- Certificates
- Academic programs
- Microcredentials
- Continuing education
- LMS integration
- SSO
- SIS integration
- API access

---

# 31. MULTI-TENANCY

Design the platform as a global multi-tenant SaaS.

Support:

- Platform owner
- Institution
- University
- School
- Corporate academy
- Instructor
- Learner

Each tenant should have:

- Branding
- Domain/subdomain
- Users
- Roles
- Permissions
- Content
- Analytics
- Billing
- Integrations

Use strict tenant isolation.

---

# 32. API-FIRST ARCHITECTURE

The frontend and backend must be independently scalable.

Design:

Frontend
→ API Gateway
→ Authentication
→ Application services
→ Databases
→ Event system
→ Media infrastructure
→ AI infrastructure

Use REST and/or GraphQL where appropriate.

Use asynchronous events for:

- Progress
- Analytics
- Notifications
- Certificates
- Video processing
- AI jobs
- Assessments

---

# 33. GLOBAL SCALABILITY

Architect for millions of concurrent learners.

Support:

- Horizontal scaling
- CDN
- Object storage
- Distributed caching
- Queue workers
- Database replication
- Read replicas
- Partitioning/sharding where necessary
- Autoscaling
- Observability
- Disaster recovery
- Multi-region deployment

Separate:

- Transactional workloads
- Search
- Analytics
- Video delivery
- AI workloads

---

# 34. VIDEO ARCHITECTURE

Do not serve large video files directly from the application server.

Use:

Object Storage
→ Video Processing
→ HLS/DASH
→ CDN
→ Learner

Live:

Instructor
→ Ingestion
→ Media Server/Streaming Infrastructure
→ CDN/Real-Time Delivery
→ Learners

Design for both:

- VOD
- Live classes

---

# 35. SEARCH

Build semantic search rather than keyword-only search.

Learners should be able to ask:

> "I have two weeks to learn Python for data analysis."

and receive relevant learning pathways.

Search across:

- Courses
- Lessons
- Concepts
- Videos
- Transcripts
- Projects
- Discussions
- Documents
- Instructors
- Skills

---

# 36. AI KNOWLEDGE SYSTEM

Use RAG for course-specific AI tutoring.

The AI should answer from:

- Course content
- Approved references
- Instructor resources
- Institutional materials

Provide citations to source materials.

Clearly distinguish:

- Course content
- AI explanation
- External knowledge

Never fabricate citations.

---

# 37. SECURITY

Implement:

- OAuth/OIDC
- MFA
- RBAC
- ABAC where appropriate
- Tenant isolation
- Encryption
- Audit logs
- Rate limiting
- API security
- Secure media URLs
- Fraud detection
- Credential verification
- Privacy controls

Design for GDPR and relevant regional privacy regulations.

---

# 38. ACCESSIBILITY

Target WCAG 2.2 AA.

Support:

- Keyboard navigation
- Screen readers
- Captions
- Audio descriptions
- Transcript
- High contrast
- Adjustable text
- Reduced motion
- Accessible assessments
- Accessible documents

Accessibility should be part of the architecture rather than an afterthought.

---

# 39. MOBILE

Build a first-class mobile experience.

The mobile app should support:

- Learning
- Offline content
- Assessments
- Downloads
- Notifications
- Live classes
- Discussion
- Messaging
- Progress
- AI tutor

Optimize for Android devices and constrained connectivity.

---

# 40. PAYMENTS

Support:

- Subscription
- One-time course purchase
- Institutional licensing
- Cohort pricing
- Certificates
- Microcredentials
- Scholarships
- Financial aid
- Regional pricing

Support multiple payment providers and local payment methods.

Do not make payment architecture dependent on a single country.

---

# 41. BUSINESS MODEL

Support multiple revenue models:

- Free courses
- Premium courses
- Subscription
- Professional certificates
- Microcredentials
- Institutional SaaS
- Corporate learning
- Marketplace revenue sharing
- Cohort-based programs

Maintain a meaningful free learning tier.

---

# 42. NOTIFICATION SYSTEM

Notifications should be intelligent rather than noisy.

Support:

- Learning reminders
- Assessment reminders
- Live-class reminders
- Instructor announcements
- Peer responses
- Goal deadlines
- Credential achievements

Allow users to control notification frequency.

---

# 43. TRUST AND TRANSPARENCY

Every course should expose:

- Instructor
- Institution
- Learning objectives
- Difficulty
- Estimated workload
- Prerequisites
- Assessment method
- Credential requirements
- Last updated date
- Content version
- Accessibility status

Learners should know exactly what they are signing up for.

---

# 44. LEARNER CONTROL

Learners must be able to:

- Download their learning data
- Export certificates
- Export portfolio
- Delete their account
- Control personalization
- Control AI usage
- Control public visibility
- Control notifications
- Control data sharing

Design for learner ownership.

---

# 45. AI ETHICS

The AI must:

- Explain recommendations
- Avoid discriminatory personalization
- Protect learner privacy
- Avoid hallucinations
- Identify uncertainty
- Allow human escalation
- Maintain audit trails
- Respect instructor content ownership

Never make high-impact educational decisions solely through an opaque AI model.

---

# 46. GAMIFICATION

Use gamification carefully.

Prioritize:

**Mastery > points**

**Competence > streaks**

**Learning outcomes > engagement metrics**

Do not create addictive mechanics designed simply to increase session duration.

---

# 47. THE IDEAL LEARNER JOURNEY

Design the following experience:

### Step 1

Learner arrives.

The platform asks:

> "What do you want to achieve?"

### Step 2

Learner selects a goal.

### Step 3

AI asks diagnostic questions.

### Step 4

Platform creates a competency map.

### Step 5

Platform identifies knowledge gaps.

### Step 6

Platform creates a personalized learning path.

### Step 7

Learner starts learning.

### Step 8

AI adapts the experience.

### Step 9

Learner practices.

### Step 10

Learner completes projects.

### Step 11

Learner collaborates with peers.

### Step 12

Learner attends live sessions when useful.

### Step 13

Learner completes assessments.

### Step 14

Platform verifies mastery.

### Step 15

Learner receives evidence-based credentials.

### Step 16

Projects become part of their portfolio.

### Step 17

Platform recommends the next competency.

The learner should never reach:

> "I finished the course. Now what?"

---

# 48. ADMINISTRATIVE ARCHITECTURE

Create dashboards for:

### Platform Super Admin

- Global tenants
- Users
- Revenue
- Content
- System health
- AI usage
- Security
- Moderation

### Institution Admin

- Users
- Courses
- Instructors
- Cohorts
- Analytics
- Credentials

### Instructor

- Courses
- Learners
- Assessments
- Discussions
- Live classes
- Analytics
- AI authoring

### Mentor

- Assigned learners
- Feedback
- Sessions
- Progress

### Learner

- Dashboard
- Learning paths
- Courses
- Skills
- Projects
- Portfolio
- Credentials
- AI tutor
- Community

---

# 49. DATA MODEL

Design a scalable domain model around:

- User
- Tenant
- Institution
- Instructor
- Course
- Program
- Module
- Lesson
- Learning Activity
- Learning Objective
- Skill
- Competency
- Assessment
- Question
- Attempt
- Submission
- Project
- Portfolio
- Credential
- Cohort
- Community
- Discussion
- Live Session
- Video Asset
- Learning Path
- Enrollment
- Progress
- Mastery
- Recommendation
- Notification
- Subscription
- Payment
- Organization
- Job Skill
- AI Interaction

Design relationships carefully for large-scale analytics.

---

# 50. TECHNOLOGY PRINCIPLES

Use a modern, cloud-native architecture.

Prioritize:

- API-first
- Event-driven where appropriate
- Stateless application services
- Horizontal scalability
- CDN-first media delivery
- Object storage
- Distributed caching
- Background jobs
- Observability
- Infrastructure as code
- Automated testing
- CI/CD
- Feature flags
- Versioned APIs

Avoid premature microservices.

Start with a modular architecture and extract services when scale or ownership boundaries justify it.

---

# 51. UX PRINCIPLES

The interface should be:

- Calm
- Modern
- Fast
- Accessible
- Mobile-first
- Content-focused
- Low cognitive load
- Personalized
- Responsive

Do not copy Coursera visually.

Develop a distinctive visual identity.

---

# 52. PERFORMANCE TARGETS

Define measurable targets for:

- Page load
- API latency
- Video startup
- Search response
- AI response
- Assessment submission
- Live-class joining
- Offline synchronization

Design for poor network conditions.

---

# 53. SUCCESS METRICS

Do NOT make MAU or time-on-platform the primary success metrics.

Track:

### Learning

- Mastery rate
- Skill acquisition
- Assessment improvement
- Knowledge retention
- Project quality

### Completion

- Course completion
- Learning-path completion
- Credential completion

### Engagement

- Meaningful learning sessions
- Practice frequency
- Community participation

### Outcomes

- Portfolio completion
- Credential attainment
- Skill verification
- Learner-reported outcomes
- Employer/institution outcomes

Create a composite **Learning Effectiveness Index**, but ensure its components remain transparent.

---

# 54. BUILD PHASES

Do not attempt to build everything simultaneously.

Design the implementation roadmap:

## Phase 1 — Foundation

- Authentication
- User profiles
- Course catalog
- Course player
- Enrollment
- Basic assessments
- Progress tracking
- Instructor dashboard
- Admin dashboard

## Phase 2 — Learning Intelligence

- Competency framework
- Diagnostic assessment
- Adaptive learning
- AI tutor
- Spaced repetition
- Personalized learning paths

## Phase 3 — Evidence

- Projects
- Portfolio
- Advanced assessments
- Peer review
- Credentials
- Skill verification

## Phase 4 — Community

- Cohorts
- Communities
- Mentorship
- Peer learning
- Structured discussions

## Phase 5 — Live Learning

- Live classes
- Breakout rooms
- Interactive sessions
- Recording
- Transcription
- AI summaries

## Phase 6 — Global Scale

- Multi-region architecture
- Offline-first
- Localization
- Multi-currency
- Regional payments
- Global CDN

## Phase 7 — Ecosystem

- Institution marketplace
- Instructor marketplace
- Employer portal
- University integrations
- Public API
- Third-party ecosystem

---

# 55. MOST IMPORTANT PRODUCT PRINCIPLE

The platform should answer three questions continuously:

### 1. What does the learner know?

### 2. What does the learner need to know?

### 3. Can the learner demonstrate that they know it?

Everything else should support these three questions.

The final product should combine:

**Open knowledge + structured learning + adaptive learning + human teaching + AI tutoring + community + practical projects + rigorous assessment + verifiable evidence.**

The goal is not to create the largest course library.

The goal is to create the platform on which a learner can most effectively move from:

**CURIOUS → KNOWLEDGEABLE → CAPABLE → COMPETENT → VERIFIED**

while retaining ownership of their learning data, portfolio and credentials.

Before writing production code, produce:

1. Product Requirements Document
2. Product vision and principles
3. Competitive gap analysis
4. User personas
5. User journeys
6. Information architecture
7. Functional requirements
8. Non-functional requirements
9. System architecture
10. Domain model
11. API architecture
12. Database architecture
13. AI architecture
14. Video/live architecture
15. Assessment architecture
16. Competency model
17. Credential model
18. Multi-tenancy model
19. Security architecture
20. Analytics architecture
21. UX architecture
22. MVP scope
23. Phase-by-phase roadmap
24. Engineering backlog
25. Acceptance criteria

Do not start implementation until the architecture and product requirements have been validated.