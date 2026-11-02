---
title: Archive
icon: fas fa-folder-open
order: 8
permalink: /archive/
description: 校外研習的簡報與雲端資料。
---

校外研習的簡報與雲端資料。

<div class="archive-list">
{% for w in site.data.archive %}
  <div class="archive-item">
    <h3>{{ w.title | escape }}</h3>
    <p class="archive-meta">
      {% if w.date %}{{ w.date | date: "%Y-%m-%d" }}{% endif %}
      {% if w.date and w.venue %} · {% endif %}
      {% if w.venue %}{{ w.venue | escape }}{% endif %}
    </p>
    {% if w.desc %}<p>{{ w.desc | escape }}</p>{% endif %}
    <a class="btn btn-outline-primary btn-sm" href="{{ w.url | escape }}" target="_blank" rel="noopener">開啟雲端資料</a>
  </div>
{% endfor %}
</div>

{% if site.data.archive.size == 0 %}
目前還沒有研習資料。
{% endif %}

<style>
.archive-item { padding: 1rem 0; border-bottom: 1px solid var(--main-border-color); }
.archive-item h3 { margin-top: 0; }
.archive-meta { font-size: .85rem; opacity: .7; margin-bottom: .5rem; }
</style>
