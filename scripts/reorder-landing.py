#!/usr/bin/env python3
"""Réordonne les sections landing après le Hero."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "index.html"
text = HTML.read_text(encoding="utf-8")

def extract(section_id: str, class_name: str) -> tuple[str, str]:
    marker = f'<section class="{class_name}" id="{section_id}">'
    start = text.find(marker)
    if start == -1:
        raise SystemExit(f"Section {section_id} not found")
    end = text.find("</section>", start) + len("</section>")
    block = text[start:end]
    new_text = text[:start] + f"<!-- moved:{section_id} -->\n" + text[end:]
    return block, new_text

blocks = {}
content = text
for sid, cls in [
    ("social-proof", "social-proof"),
    ("transform", "transform"),
    ("pricing", "pricing"),
    ("faq", "faq"),
]:
    block, content = extract(sid, cls)
    blocks[sid] = block

hero_end = content.find("</section>", content.find('id="hero"')) + len("</section>")
insert = """

  <!-- Parcours premium (suite directe du Hero) -->
  <section class="landing-features reveal" id="features">
    <div class="section-header section-header--center">
      <span class="section-tag">Fonctionnalités</span>
      <h2>Tout ce qu'il faut pour transformer votre corps.</h2>
      <p class="section-intro">Programme IA, nutrition, coach et suivi — dans une seule expérience premium.</p>
    </div>
    <div class="landing-features__grid">
      <article class="landing-feature-card depth-hover glow-card">
        <span class="landing-feature-card__icon">📋</span>
        <h3>Programme personnalisé</h3>
        <p>Adapté à votre morphologie, niveau et historique réel.</p>
      </article>
      <article class="landing-feature-card depth-hover glow-card">
        <span class="landing-feature-card__icon">🥗</span>
        <h3>Nutrition intelligente</h3>
        <p>Macros, repas et liste de courses générés par l'IA.</p>
      </article>
      <article class="landing-feature-card depth-hover glow-card">
        <span class="landing-feature-card__icon">💬</span>
        <h3>Coach IA personnel</h3>
        <p>Conseils basés sur vos séances, poids et objectifs.</p>
      </article>
      <article class="landing-feature-card depth-hover glow-card">
        <span class="landing-feature-card__icon">📊</span>
        <h3>Suivi de progression</h3>
        <p>XP, streak, graphiques et alertes intelligentes.</p>
      </article>
      <article class="landing-feature-card depth-hover glow-card">
        <span class="landing-feature-card__icon">⚙️</span>
        <h3>Ajustement automatique</h3>
        <p>Charge et volume recalibrés chaque semaine.</p>
      </article>
      <article class="landing-feature-card depth-hover glow-card">
        <span class="landing-feature-card__icon">📱</span>
        <h3>iOS &amp; Android</h3>
        <p>Parcours complet dans le navigateur, prêt pour mobile.</p>
      </article>
    </div>
  </section>

""" + blocks["transform"] + "\n\n" + blocks["social-proof"] + "\n\n" + blocks["pricing"] + "\n\n" + blocks["faq"] + "\n"

content = content[:hero_end] + insert + content[hero_end:]
HTML.write_text(content, encoding="utf-8")
print("Landing sections reordered OK")
