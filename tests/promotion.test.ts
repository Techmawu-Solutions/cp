import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { SchoolClass } from "@/lib/types";
import {
  DEFAULT_LEVELS,
  accessEnded,
  accessUntil,
  addDays,
  alumniAccessOpen,
  cohortLabelFor,
  defaultOutcome,
  levelsOf,
  nextLevel,
  outcomesFor,
  progressionOf,
  streamOf,
  subjectsToEnrol,
  suggestClassMap,
  tally,
  unplaced,
} from "@/lib/promotion";

const cls = (id: string, name: string, level: string, programmeId: string): Pick<SchoolClass, "id" | "name" | "level" | "programmeId"> => ({ id, name, level, programmeId });

describe("levels", () => {
  test("each category has a default ladder ending in its final year", () => {
    assert.deepEqual(DEFAULT_LEVELS.SHS, ["SHS 1", "SHS 2", "SHS 3"]);
    assert.equal(DEFAULT_LEVELS.Primary.at(-1), "Basic 6");
    assert.equal(DEFAULT_LEVELS.University.at(-1), "Level 400");
  });

  test("a school's own ladder wins over the default", () => {
    const basic = { type: "Primary" as const, levels: [...DEFAULT_LEVELS.Primary, "JHS 1", "JHS 2", "JHS 3"] };
    assert.equal(levelsOf(basic).at(-1), "JHS 3");
    assert.equal(nextLevel(levelsOf(basic), "Basic 6"), "JHS 1");
    assert.deepEqual(levelsOf({ type: "JHS", levels: [] }), DEFAULT_LEVELS.JHS);
  });

  test("next level, final level and unknown level", () => {
    const l = DEFAULT_LEVELS.SHS;
    assert.equal(nextLevel(l, "SHS 2"), "SHS 3");
    assert.equal(nextLevel(l, "SHS 3"), null);
    assert.equal(nextLevel(l, "Form 4"), undefined);
  });

  test("universities and colleges progress by student unless set otherwise", () => {
    assert.equal(progressionOf({ type: "University" }), "credit");
    assert.equal(progressionOf({ type: "College" }), "credit");
    assert.equal(progressionOf({ type: "SHS" }), "cohort");
    assert.equal(progressionOf({ type: "College", progressionModel: "cohort" }), "cohort");
  });
});

describe("matching classes across years", () => {
  test("stream is the class name after its level", () => {
    assert.equal(streamOf("SHS 2A", "SHS 2"), "A");
    assert.equal(streamOf("JHS 2 Gold", "JHS 2"), "Gold");
    assert.equal(streamOf("2A1", "SHS 2"), "A1");
    assert.equal(streamOf("Science", "SHS 2"), "Science");
  });

  test("2A1 → 3A1 and SHS 2B → SHS 3B, matched by programme code and stream", () => {
    const code: Record<string, string> = { p1: "GART", p2: "GSCI", q1: "GART", q2: "GSCI" };
    const from = [cls("a", "2A1", "SHS 2", "p1"), cls("b", "2A2", "SHS 2", "p1"), cls("c", "SHS 2B", "SHS 2", "p2"), cls("d", "3A1", "SHS 3", "p1")];
    const to = [cls("x1", "3A1", "SHS 3", "q1"), cls("x2", "3A2", "SHS 3", "q1"), cls("y", "SHS 3B", "SHS 3", "q2"), cls("r", "2A1", "SHS 2", "q1")];
    const { promote, repeat } = suggestClassMap(from, to, DEFAULT_LEVELS.SHS, (id) => code[id]);
    assert.equal(promote.a, "x1");
    assert.equal(promote.b, "x2");
    assert.equal(promote.c, "y");
    assert.equal(promote.d, undefined, "final-year classes graduate");
    assert.equal(repeat.a, "r");
    assert.equal(repeat.b, "r", "no 2A2 next year: the only SHS 2 Arts class is used");
  });

  test("falls back to the only class of the programme at the next level", () => {
    const from = [cls("a", "P4 Gold", "Basic 4", "p")];
    const to = [cls("b", "Basic 5", "Basic 5", "q")];
    const { promote } = suggestClassMap(from, to, DEFAULT_LEVELS.Primary, () => "GEN");
    assert.equal(promote.a, "b");
  });

  test("never matches across programmes", () => {
    const code: Record<string, string> = { p: "GART", q: "GSCI" };
    const { promote } = suggestClassMap([cls("a", "SHS 1A", "SHS 1", "p")], [cls("b", "SHS 2A", "SHS 2", "q")], DEFAULT_LEVELS.SHS, (id) => code[id]);
    assert.equal(promote.a, undefined);
  });
});

describe("outcomes", () => {
  test("final-year students graduate by default; only they can graduate", () => {
    assert.equal(defaultOutcome(DEFAULT_LEVELS.JHS, "JHS 3"), "graduate");
    assert.equal(defaultOutcome(DEFAULT_LEVELS.JHS, "JHS 2"), "promote");
    assert.ok(!outcomesFor(DEFAULT_LEVELS.JHS, "JHS 2").includes("graduate"));
    assert.ok(!outcomesFor(DEFAULT_LEVELS.JHS, "JHS 3").includes("promote"));
  });

  test("students who'd be left without a class are reported", () => {
    const rows = [
      { studentId: "1", fromClassId: "a", outcome: "promote" as const, toClassId: "x" },
      { studentId: "2", fromClassId: "a", outcome: "repeat" as const },
      { studentId: "3", fromClassId: "b", outcome: "graduate" as const },
      { studentId: "4", fromClassId: "b", outcome: "leave" as const },
    ];
    assert.deepEqual(unplaced(rows).map((r) => r.studentId), ["2"]);
    assert.deepEqual(tally(rows), { promote: 1, repeat: 1, graduate: 1, leave: 1 });
  });
});

describe("subjects in the new class", () => {
  const classSubjects = [
    { subjectId: "eng", code: "ENG", core: true },
    { subjectId: "phy", code: "PHY", core: false },
    { subjectId: "bio", code: "BIO", core: false },
  ];
  test("core subjects plus the electives taken before", () => {
    assert.deepEqual(subjectsToEnrol(classSubjects, new Set(["ENG", "PHY"])), ["eng", "phy"]);
  });
  test("a student with no registrations takes every subject of the class", () => {
    assert.deepEqual(subjectsToEnrol(classSubjects, new Set()), ["eng", "phy", "bio"]);
  });
});

describe("alumni access", () => {
  const now = Date.parse("2027-08-01T12:00:00");
  test("open until the end of the last day, then closed", () => {
    assert.ok(alumniAccessOpen({ status: "graduated", alumniAccessUntil: "2027-08-01" }, now));
    assert.ok(!alumniAccessOpen({ status: "graduated", alumniAccessUntil: "2027-07-31" }, now));
    assert.ok(accessEnded({ status: "graduated", alumniAccessUntil: "2027-07-31" }, now));
  });
  test("no access date means no access; current students are never 'ended'", () => {
    assert.ok(accessEnded({ status: "graduated" }, now));
    assert.ok(!accessEnded({ status: "active" }, now));
  });
  test("dates and labels", () => {
    assert.equal(addDays("2027-07-23", 90), "2027-10-21");
    assert.equal(accessUntil("2027-07-23", null), undefined);
    assert.equal(cohortLabelFor("2027-07-23"), "Class of 2027");
  });
});
