/**
 * Fix Prisma field names from stale local client (camelCase) to
 * Vercel's fresh-generated client (schema names, lowercase/snake_case).
 * 
 * Schema mappings:
 *   adminProfile   → adminprofile    (on User)
 *   studentProfile → studentprofile  (on User)
 *   teacherProfile → teacherprofile  (on User)
 *   companyProfile → companyprofile  (on User)
 *   internshipStudents → internshipstudent  (on User)
 *   teacherApplications → teacherapplication (on Topic)
 *   studentApplications → studentapplication (on Topic)
 *   proposedBy → user_topic_proposedByIdTouser (on Topic)
 *   assignedTeacher → user_topic_assignedTeacherIdTouser (on Topic)
 *   teacher → user  (on TeacherApplication)
 *   team → studentteam (on StudentApplication)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const API_DIR = './src/app/api';

// Files that should NOT have their response object keys changed
// (they use manual stitching and the keys are JS response keys, not Prisma fields)
const SKIP_RESPONSE_MAPPING_FILES = [
  'users/route.ts',
];

// Replacements: [pattern, replacement, description]
// All of these are safe to apply in Prisma query contexts
const REPLACEMENTS = [
  // On User model - profile relations (in WHERE/INCLUDE/SELECT clauses in Prisma)
  // These appear after "where: {", "include: {", "select: {" keywords
  // and BEFORE ": {" or ": true" 
  [/\badminProfile:\s*\{/g, 'adminprofile: {', 'adminProfile: { → adminprofile: {'],
  [/\badminProfile:\s*true\b/g, 'adminprofile: true', 'adminProfile: true → adminprofile: true'],
  [/\bcompanyProfile:\s*true\b/g, 'companyprofile: true', 'companyProfile: true → companyprofile: true'],
  [/\bcompanyProfile:\s*\{/g, 'companyprofile: {', 'companyProfile: { → companyprofile: {'],
  
  // On Topic model - application relations
  [/\bteacherApplications:\s*\{/g, 'teacherapplication: {', 'teacherApplications: { → teacherapplication: {'],
  [/\bstudentApplications:\s*\{/g, 'studentapplication: {', 'studentApplications: { → studentapplication: {'],
  [/\bstudentApplications:\s*true\b/g, 'studentapplication: true', 'studentApplications: true → studentapplication: true'],
  
  // On Topic model - User relations (aliases)
  [/\bproposedBy:\s*\{/g, 'user_topic_proposedByIdTouser: {', 'proposedBy: { → user_topic_proposedByIdTouser: {'],
  [/\bproposedBy:\s*true\b/g, 'user_topic_proposedByIdTouser: true', 'proposedBy: true → user_topic_proposedByIdTouser: true'],
  [/\bassignedTeacher:\s*\{/g, 'user_topic_assignedTeacherIdTouser: {', 'assignedTeacher: { → user_topic_assignedTeacherIdTouser: {'],
  [/\bassignedTeacher:\s*true\b/g, 'user_topic_assignedTeacherIdTouser: true', 'assignedTeacher: true → user_topic_assignedTeacherIdTouser: true'],
  
  // On User model - internship student relation
  [/\binternshipStudents:\s*\{\s*none/g, 'internshipstudent: { none', 'internshipStudents: { none → internshipstudent: { none'],
  [/\binternshipStudents:\s*\{/g, 'internshipstudent: {', 'internshipStudents: { → internshipstudent: {'],
  
  // On TeacherApplication model - teacher → user relation
  // Only in include clauses for TeacherApplication (teacher: { select: ... })
  // NOTE: "teacher: {" is ambiguous - could be a variable name. Only replace in include context.
];

// Profile relations need careful handling - only replace in Prisma query context
// (i.e., NOT in response object construction like `{ studentProfile: stitchedValue }`)
const PRISMA_CONTEXT_REPLACEMENTS = [
  [/\bstudentProfile:\s*\{/g, 'studentprofile: {', 'studentProfile: { in Prisma context'],
  [/\bstudentProfile:\s*true\b/g, 'studentprofile: true', 'studentProfile: true in Prisma context'],
  [/\bteacherProfile:\s*\{/g, 'teacherprofile: {', 'teacherProfile: { in Prisma context'],
  [/\bteacherProfile:\s*true\b/g, 'teacherprofile: true', 'teacherProfile: true in Prisma context'],
];

function getAllTsFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...getAllTsFiles(fullPath));
    } else if (entry.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

function isSkipFile(filePath, skipList) {
  return skipList.some(skip => filePath.replace(/\\/g, '/').endsWith(skip));
}

const files = getAllTsFiles(API_DIR);
let totalChanges = 0;

for (const filePath of files) {
  const original = readFileSync(filePath, 'utf-8');
  let content = original;
  const relPath = filePath.replace(/\\/g, '/').replace(/.*src\/app\/api\//, '');

  // Apply safe replacements to ALL files
  for (const [pattern, replacement, desc] of REPLACEMENTS) {
    const before = content;
    content = content.replace(pattern, replacement);
    if (content !== before) {
      console.log(`  [${relPath}] ${desc}`);
      totalChanges++;
    }
  }

  // Apply profile relation replacements only to non-skip files
  if (!isSkipFile(filePath, SKIP_RESPONSE_MAPPING_FILES)) {
    for (const [pattern, replacement, desc] of PRISMA_CONTEXT_REPLACEMENTS) {
      const before = content;
      content = content.replace(pattern, replacement);
      if (content !== before) {
        console.log(`  [${relPath}] ${desc}`);
        totalChanges++;
      }
    }
  }

  if (content !== original) {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Updated: ${relPath}`);
  }
}

console.log(`\n✅ Done. ${totalChanges} replacements across ${files.length} files.`);
