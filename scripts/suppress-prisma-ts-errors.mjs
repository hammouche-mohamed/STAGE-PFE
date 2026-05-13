import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const API_DIR = './src/app/api';
const PATTERNS = [
  'adminprofile', 'studentprofile', 'teacherprofile', 'companyprofile', 
  'internshipstudent', 'teacherapplication', 'studentapplication',
  'user_topic_proposedByIdTouser', 'user_topic_assignedTeacherIdTouser'
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

const files = getAllTsFiles(API_DIR);
let totalChanges = 0;

for (const filePath of files) {
  const original = readFileSync(filePath, 'utf-8');
  let content = original;
  
  // Find everything between prisma.xxxx.xxxx( and )
  // This version is more aggressive: matches prisma followed by any characters until the matching closing paren
  // However, counting parens in regex is hard, so we'll use a simpler heuristic:
  // prisma.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+\(\{ ... \}\)
  
  const prismaRegex = /prisma\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+\(\s*\{([\s\S]*?)\}\s*\)/g;
  
  content = content.replace(prismaRegex, (match, inner) => {
    // Check if inner content has any of our patterns
    if (PATTERNS.some(p => inner.includes(p)) && !match.includes('as any')) {
      totalChanges++;
      // Replace the last ) with } as any)
      return match.replace(/\}\s*\)$/, '} as any)');
    }
    return match;
  });

  // Also catch direct count/findMany on the model if imported directly or through other means
  // But here it's mostly prisma.model.method
  
  if (content !== original) {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Wrapped: ${filePath}`);
  }
}

console.log(`\n✅ Done. Added 'as any' to ${totalChanges} Prisma calls.`);
