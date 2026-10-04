let pending;

export function indexCatalog(data) {
  const nodes = [];
  const byId = new Map();

  data.roadmap.forEach((phase) => {
    const walk = (list) => {
      (list || []).forEach((node) => {
        const children = node.children || [];
        const entry = {
          id: node.id,
          name: node.name,
          priority: node.priority || '',
          prereqs: node.prereqs || [],
          leaf: children.length === 0,
          phaseId: phase.id,
          phaseName: phase.name,
          phaseShort: phase.short || phase.name,
          group: phase.group,
        };
        nodes.push(entry);
        byId.set(node.id, entry);
        walk(children);
      });
    };
    walk(phase.topics);
  });

  const core = new Set(data.views?.['12']?.phases || []);
  const extended = new Set(data.views?.['18']?.phases || []);
  const phases = data.roadmap.map((phase) => ({
    id: phase.id,
    name: phase.name,
    short: phase.short || phase.name,
    group: phase.group,
    horizon: core.has(phase.id) ? 'core' : extended.has(phase.id) ? 'extended' : 'later',
  }));

  return {
    phases,
    nodes,
    leaves: nodes.filter((node) => node.leaf),
    byId,
    gates: (data.gates || []).map((gate) => ({
      id: gate.id,
      name: gate.name,
      rule: gate.rule || '',
      checks: gate.checks || [],
    })),
    days: data.days || [],
    horizons: {
      core: data.views?.['12']?.title || '12-month core',
      extended: data.views?.['18']?.title || '18-month path',
    },
  };
}

export function loadSkillCatalog() {
  if (!pending) {
    pending = fetch('/skill-system.html')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load the skill catalog');
        return response.text();
      })
      .then((html) => {
        const marker = 'const DATA = ';
        const start = html.indexOf(marker);
        if (start < 0) throw new Error('Skill catalog was not found');
        const end = html.indexOf(';\n', start);
        const data = JSON.parse(html.slice(start + marker.length, end));
        return indexCatalog(data);
      })
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}
