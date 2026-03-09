import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadSkills(): string {
  const skillsDir = join(__dirname, '..', 'skills');
  
  // In compiled output (dist/), skills won't be there.
  // Check both the compiled path and the source path
  const possiblePaths = [
    skillsDir,
    join(__dirname, '..', '..', 'src', 'skills'),
    join(__dirname, '..', '..', 'skills'),
  ];

  for (const dir of possiblePaths) {
    if (existsSync(dir)) {
      try {
        const files = readdirSync(dir).filter(f => f.endsWith('.md'));
        if (files.length === 0) return '';

        const skills = files.map(f => {
          const content = readFileSync(join(dir, f), 'utf-8');
          return content;
        });

        return '\n\n--- SKILLS DISPONÍVEIS ---\n' + skills.join('\n---\n');
      } catch {
        return '';
      }
    }
  }
  
  return '';
}
