/* Écran « Crédits et licences » : contenu de val-des-sapins/CREDITS.md, rendu au chargement (titres, paragraphes,
   tableaux, liens, gras). Une seule source pour le dépôt et pour le jeu. */
import md from '../../../CREDITS.md?raw';

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function inline(t: string): string {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/&lt;(https?:[^&\s]+)&gt;/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

export function renderCredits(src: string = md): string {
  const out: string[] = [], lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^#\s/.test(l)) continue;                                  // le titre est celui de la fenêtre
    if (/^##+\s/.test(l)) { out.push('<h3>' + inline(l.replace(/^#+\s*/, '')) + '</h3>'); continue; }
    if (/^\|/.test(l)) {
      const rows: string[][] = [];
      for (; i < lines.length && /^\|/.test(lines[i]); i++) if (!/^\|[\s|:-]+\|$/.test(lines[i])) rows.push(lines[i].slice(1, -1).split('|').map((c) => c.trim()));
      i--;
      const [h, ...body] = rows;
      out.push('<div class="tw"><table><thead><tr>' + h.map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' + body.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }
    if (l.trim()) { let p = l; while (i + 1 < lines.length && lines[i + 1].trim() && !/^[#|]/.test(lines[i + 1])) p += ' ' + lines[++i]; out.push('<p>' + inline(p) + '</p>'); }
  }
  return out.join('\n');
}

export function initCredits(): void {
  const ov = document.getElementById('crOv'), body = document.getElementById('crBody'), btn = document.getElementById('creditsBtn'), close = document.getElementById('crClose');
  if (!ov || !body || !btn || !close) return;
  let filled = false;
  const show = (v: boolean) => { if (v && !filled) { body.innerHTML = renderCredits(); filled = true; } ov.hidden = !v; if (v) close.focus(); else btn.focus(); };
  btn.addEventListener('click', () => show(true));
  close.addEventListener('click', () => show(false));
  ov.addEventListener('click', (e) => { if (e.target === ov) show(false); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !ov.hidden) { e.stopPropagation(); show(false); } }, true);
}
