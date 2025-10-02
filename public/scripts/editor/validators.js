// Validation rules (stubs)
export function validateProject(project) {
  const issues = [];
  const startCount = project.scenes.filter(s => s.type === 'start').length;
  if (startCount !== 1) issues.push(`Project must have exactly 1 start scene (found ${startCount}).`);
  const endCount = project.scenes.filter(s => s.type === 'end').length;
  if (endCount > 3) issues.push(`Project can have at most 3 end scenes (found ${endCount}).`);
  if (project.scenes.length < 1 || project.scenes.length > 20) {
    issues.push(`Project must have 1–20 scenes (found ${project.scenes.length}).`);
  }
  // TODO: reachability, broken links, choice limits, etc.
  return issues;
}
