const SVG_NS = 'http://www.w3.org/2000/svg';

export function renderGraph(hostEl, project, selectedId, onSelect) {
  hostEl.innerHTML = '';
  hostEl.classList.add('graph-host');

  const nodes = project.scenes || [];
  if (!nodes.length) {
    const empty = document.createElement('p');
    empty.className = 'graph-empty';
    empty.textContent = 'No scenes yet. Use “Add Scene” to begin.';
    hostEl.appendChild(empty);
    return;
  }
  const width = 260;
  const nodeHeight = 80;
  const nodeGap = 20;
  const height = nodes.length ? nodes.length * (nodeHeight + nodeGap) + nodeGap : 160;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('role', 'list');

  nodes.forEach((scene, index) => {
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('tabindex', '0');
    group.setAttribute('role', 'listitem');
    group.dataset.sceneId = scene.id;
    const y = nodeGap + index * (nodeHeight + nodeGap);

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', '20');
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(width - 40));
    rect.setAttribute('height', String(nodeHeight));
    rect.setAttribute('rx', '12');
    rect.setAttribute('ry', '12');
    rect.classList.add('graph-node');
    if (scene.id === selectedId) rect.classList.add('is-selected');

    const title = document.createElementNS(SVG_NS, 'text');
    title.setAttribute('x', '40');
    title.setAttribute('y', String(y + 30));
    title.classList.add('graph-node-title');
    title.textContent = scene.id;

    const type = document.createElementNS(SVG_NS, 'text');
    type.setAttribute('x', '40');
    type.setAttribute('y', String(y + 54));
    type.classList.add('graph-node-subtitle');
    type.textContent = scene.type;

    group.appendChild(rect);
    if (scene.image?.objectUrl) {
      const img = document.createElementNS(SVG_NS, 'image');
      img.setAttribute('href', scene.image.objectUrl);
      img.setAttribute('x', String(width - 90));
      img.setAttribute('y', String(y + 10));
      img.setAttribute('width', '60');
      img.setAttribute('height', '60');
      img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      img.classList.add('graph-node-thumb');
      group.appendChild(img);
    }

    group.appendChild(title);
    group.appendChild(type);

    const activate = () => onSelect?.(scene.id);
    group.addEventListener('click', activate);
    group.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        activate();
      }
    });

    svg.appendChild(group);
  });

  hostEl.appendChild(svg);
}
