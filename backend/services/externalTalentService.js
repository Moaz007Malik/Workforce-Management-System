const KNOWN_SKILLS = [
  'React', 'React.js', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'AWS',
  'UI/UX', 'Project Management', 'DevOps', 'SQL', 'Electrical', 'Welding',
  'Mechanical', 'HSE', 'Piping', 'Rigging', 'Angular', 'Vue', 'Java', '.NET',
];

export function extractSkills(message) {
  const found = new Set();
  const lower = message.toLowerCase();

  for (const skill of KNOWN_SKILLS) {
    if (lower.includes(skill.toLowerCase())) found.add(skill.replace('.js', ''));
  }

  const quoted = message.match(/["']([^"']+)["']/g);
  quoted?.forEach((q) => {
    const s = q.replace(/["']/g, '').trim();
    if (s.length > 1) found.add(s);
  });

  return [...found];
}

export function isExternalTalentIntent(message) {
  const lower = (message || '').toLowerCase();
  const externalMarkers = [
    'rozee', 'linkedin', 'indeed', 'bayt', 'external', 'outside the company',
    'outside our', 'from outside', 'job board', 'job portal', 'recruit online',
    'fetch from', 'search online', 'market hire', 'agency',
  ];
  const hasExternal = externalMarkers.some((m) => lower.includes(m));
  const wantsPeople = /employee|candidate|hire|recruit|developer|engineer|skill/i.test(message);
  return hasExternal || (wantsPeople && /rozee|linkedin|indeed|external|outside|fetch|portal/i.test(message));
}

export function buildExternalSearchLinks(skills, location = 'Pakistan') {
  const query = encodeURIComponent([...skills, location].filter(Boolean).join(' '));
  const skillOnly = encodeURIComponent(skills.join(' '));

  return [
    {
      platform: 'Rozee.pk',
      url: `https://www.rozee.pk/search/job?q=${skillOnly}`,
      label: `Search Rozee.pk for ${skills.join(', ') || 'candidates'}`,
    },
    {
      platform: 'LinkedIn',
      url: `https://www.linkedin.com/search/results/people/?keywords=${skillOnly}`,
      label: `Search LinkedIn profiles for ${skills.join(', ') || 'skills'}`,
    },
    {
      platform: 'Indeed Pakistan',
      url: `https://pk.indeed.com/jobs?q=${skillOnly}&l=${encodeURIComponent(location)}`,
      label: `Search Indeed for ${skills.join(', ') || 'roles'}`,
    },
    {
      platform: 'Bayt.com',
      url: `https://www.bayt.com/en/jordan/jobs/?keywords=${skillOnly}`,
      label: `Search Bayt for ${skills.join(', ') || 'talent'}`,
    },
  ];
}

export function findInternalBySkills(employees, skills) {
  if (!skills.length) return [];
  return employees.filter((e) =>
    skills.every((skill) =>
      e.skills?.some((s) => s.toLowerCase().includes(skill.toLowerCase())),
    ),
  );
}

export function formatExternalTalentAugment({ skills, internalMatches, searchLinks, enableSearch }) {
  const lines = [
    'EXTERNAL_TALENT_REQUEST: true',
    `Skills requested: ${skills.length ? skills.join(', ') : '(infer from user message)'}`,
    '',
    'INTERNAL_EMPLOYEES_WITH_SKILLS:',
  ];

  if (!internalMatches.length) {
    lines.push('None in the current HR database.');
  } else {
    internalMatches.forEach((e) => {
      lines.push(
        `- ${e.fullName} | ${e.designation} | ${e.department} | skills: ${(e.skills || []).join(', ')} | status: ${e.status}`,
      );
    });
  }

  lines.push('', 'EXTERNAL_JOB_BOARD_SEARCH_LINKS (share these with the user as markdown links):');
  searchLinks.forEach((l) => {
    lines.push(`- ${l.platform}: ${l.url}`);
  });

  if (enableSearch) {
    lines.push(
      '',
      'Web search is ENABLED for this request. Summarize any relevant public job market signals you find,',
      'but clearly separate verified internal employees from external/web results.',
      'Never invent real candidate names from Rozee/LinkedIn — only cite what search returns or link users to search.',
    );
  } else {
    lines.push(
      '',
      'Web search is NOT available. Guide the user to the search links above and explain how to evaluate external candidates.',
      'Do NOT fabricate specific Rozee/LinkedIn profile names or emails.',
    );
  }

  return lines.join('\n');
}
