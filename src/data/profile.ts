// Single source of truth for personal details. Edit here, not in components.

export const profile = {
  name: 'Parthiban Gunasekaran',
  firstName: 'Parthiban',
  initials: 'PG',
  email: 'gunasekaranparthiban31@gmail.com',
  location: 'Coimbatore, India',
  availability: 'Available for opportunities',
  tagline: 'Engineering the future, one idea at a time.',
  roles: [
    'Software Engineer in the Making',
    'Full-Stack Developer',
    'Problem Solver',
    'Technology Enthusiast',
  ],
  summary:
    'I build intelligent applications, scalable systems, and digital experiences that solve real-world problems.',
  resumeUrl: 'Parthiban_Gunasekaran_Resume.pdf',
  links: {
    github: 'https://github.com/TheParthi',
    linkedin: 'https://www.linkedin.com/in/parthiban-gunasekaran1159a5282',
    leetcode: 'https://leetcode.com/u/Parthiban_G',
  },
  education: {
    degree: 'B.E. Computer Science (Internet of Things)',
    school: 'Sri Krishna College of Technology, Coimbatore',
    detail: 'CGPA 7.8 / 10 · Expected Oct 2027',
  },
}

export const about = {
  heading: 'Beyond the Code.',
  lead:
    "I'm Parthiban Gunasekaran, a Computer Science and Engineering student passionate about software engineering, artificial intelligence, and building technology that makes a difference.",
  paragraphs: [
    'I enjoy transforming complex problems into practical applications, from intelligent computer vision systems to full-stack platforms.',
    'My journey is driven by curiosity, continuous learning, and the desire to engineer products that people can actually use.',
  ],
  principles: [
    { n: '01', title: 'Build', text: 'Turn ideas into working products.' },
    { n: '02', title: 'Explore', text: 'Experiment with emerging technologies.' },
    { n: '03', title: 'Improve', text: 'Learn, iterate, and engineer better solutions.' },
  ],
  facts: [
    { k: 'Now', v: 'Software Engineer Intern · Dendo' },
    { k: 'Shipping', v: 'NexaRide — live on Play Store & App Store' },
    { k: 'Practice', v: '600+ LeetCode problems in Java' },
    { k: 'Learning', v: 'Go · System design' },
  ],
}

export const exploring = [
  { topic: 'Advanced Data Structures & Algorithms', note: 'Graphs, DP and segment trees — daily practice in Java.' },
  { topic: 'System Design', note: 'Designing for scale: queues, caches, sharding, back-pressure.' },
  { topic: 'Low-Level Design', note: 'Object-oriented modelling, SOLID, design patterns in practice.' },
  { topic: 'Cloud Architecture', note: 'AWS and Azure building blocks, infrastructure as code.' },
  { topic: 'Artificial Intelligence', note: 'Vision models, agents and retrieval-augmented generation.' },
  { topic: 'Scalable Backend Systems', note: 'Real-time fan-out, idempotency, zero-downtime delivery.' },
]

export const navItems = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
] as const
